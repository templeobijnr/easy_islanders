/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGING MODULE — SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Firestore CRUD operations only.
 * NO auth decisions. NO Twilio sends. NO HTTP.
 *
 * OWNS: whatsappInbound, whatsappOutbound, whatsapp_logs, messageCorrelation, outboundIdempotency
 * MAY READ: (none for now)
 * MUST NOT WRITE: users, bookings, listings, requests
 */

import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { db as firestoreDb } from "../../config/firebase";
import type {
    InboundReceipt,
    OutboundMessage,
    MessageCorrelation,
    InboundStatus,
    DeliveryStatus,
    CreateInboundReceiptInput,
} from "./messaging.schema";

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE REFERENCES (LAZY INIT)
// ─────────────────────────────────────────────────────────────────────────────

function db(): FirebaseFirestore.Firestore {
    return firestoreDb;
}

// Collection names (explicit constants)
const INBOUND_COLLECTION = "whatsappInbound";
const OUTBOUND_COLLECTION = "whatsappOutbound";
const LOGS_COLLECTION = "whatsapp_logs";
const CORRELATION_COLLECTION = "messageCorrelation";
const IDEMPOTENCY_COLLECTION = "outboundIdempotency";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function nowIsoString(): string {
    return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// INBOUND RECEIPT OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create inbound receipt if it doesn't exist (idempotent).
 * Returns { created: boolean, receipt: InboundReceipt }
 */
async function createInboundReceiptIdempotent(
    input: CreateInboundReceiptInput
): Promise<{ created: boolean; receipt: InboundReceipt }> {
    const { messageSid } = input;
    const ref = db().collection(INBOUND_COLLECTION).doc(messageSid);

    return db().runTransaction(async (tx) => {
        const doc = await tx.get(ref);

        if (doc.exists) {
            const data = doc.data()!;
            return {
                created: false,
                receipt: data as InboundReceipt,
            };
        }

        const now = nowIsoString();
        const receipt: InboundReceipt = {
            messageSid,
            fromE164: input.fromE164,
            toE164: input.toE164,
            body: input.body,
            mediaUrls: input.mediaUrls,
            location: input.location,
            receivedAt: now,
            status: "queued",
            attempts: 0,
        };

        tx.set(ref, receipt);
        return { created: true, receipt };
    });
}

/**
 * Get inbound receipt by MessageSid.
 */
async function getInboundReceipt(messageSid: string): Promise<InboundReceipt | null> {
    const doc = await db().collection(INBOUND_COLLECTION).doc(messageSid).get();
    if (!doc.exists) return null;
    return doc.data() as InboundReceipt;
}

/**
 * Mark inbound as processing (guarded transition).
 * Returns true if transition succeeded.
 */
async function markInboundProcessing(messageSid: string): Promise<boolean> {
    const ref = db().collection(INBOUND_COLLECTION).doc(messageSid);

    return db().runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) return false;

        const data = doc.data() as InboundReceipt;

        // Already processed - no-op
        if (data.status === "processed") {
            return false;
        }

        // Already processing and recent (within 60s) - skip
        if (data.status === "processing") {
            const receivedTime = new Date(data.receivedAt).getTime();
            const sixtySecondsAgo = Date.now() - 60000;
            if (receivedTime > sixtySecondsAgo) {
                return false;
            }
        }

        tx.update(ref, {
            status: "processing",
            attempts: FieldValue.increment(1),
        });

        return true;
    });
}

/**
 * Mark inbound as processed (success).
 */
async function markInboundProcessed(
    messageSid: string,
    result: { threadId: string; route: string }
): Promise<void> {
    await db().collection(INBOUND_COLLECTION).doc(messageSid).update({
        status: "processed",
        threadId: result.threadId,
        route: result.route,
        processedAt: nowIsoString(),
    });
}

/**
 * Mark inbound as failed.
 */
async function markInboundFailed(messageSid: string, reason: string): Promise<void> {
    await db().collection(INBOUND_COLLECTION).doc(messageSid).update({
        status: "failed",
        lastError: reason.slice(0, 500),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND MESSAGE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reserve outbound idempotency key.
 * Returns null if key is fresh, or existing message ID if already reserved.
 */
async function reserveOutboundIdempotency(
    idempotencyKey: string
): Promise<{ reserved: boolean; existingMessageId?: string }> {
    const ref = db().collection(IDEMPOTENCY_COLLECTION).doc(idempotencyKey);

    return db().runTransaction(async (tx) => {
        const doc = await tx.get(ref);

        if (doc.exists) {
            const data = doc.data()!;
            return {
                reserved: false,
                existingMessageId: data.outboundMessageId,
            };
        }

        // Reserve the key (will be updated with message ID after create)
        tx.set(ref, {
            reservedAt: nowIsoString(),
            state: "reserved",
        });

        return { reserved: true };
    });
}

/**
 * Get outbound message by idempotency key.
 */
async function getOutboundByIdempotency(
    idempotencyKey: string
): Promise<OutboundMessage | null> {
    const idempDoc = await db().collection(IDEMPOTENCY_COLLECTION).doc(idempotencyKey).get();
    if (!idempDoc.exists) return null;

    const data = idempDoc.data()!;
    if (!data.outboundMessageId) return null;

    const msgDoc = await db()
        .collection(OUTBOUND_COLLECTION)
        .doc(data.outboundMessageId)
        .get();
    if (!msgDoc.exists) return null;

    return { id: msgDoc.id, ...msgDoc.data() } as OutboundMessage;
}

/**
 * Create outbound message in pending state.
 */
async function createOutboundPending(input: {
    idempotencyKey: string;
    fromE164: string;
    toE164: string;
    body: string;
    templateKey?: string;
    correlationId?: string;
    correlationType?: string;
}): Promise<OutboundMessage> {
    const ref = db().collection(OUTBOUND_COLLECTION).doc();
    const now = nowIsoString();

    const message: OutboundMessage = {
        id: ref.id,
        idempotencyKey: input.idempotencyKey,
        channel: "whatsapp",
        fromE164: input.fromE164,
        toE164: input.toE164,
        body: input.body,
        templateKey: input.templateKey,
        status: "pending",
        correlationId: input.correlationId,
        correlationType: input.correlationType as any,
        createdAt: now,
    };

    await ref.set(message);

    // Update idempotency record with message ID
    await db().collection(IDEMPOTENCY_COLLECTION).doc(input.idempotencyKey).update({
        outboundMessageId: ref.id,
        state: "created",
    });

    return message;
}

/**
 * Mark outbound as sent.
 */
async function markOutboundSent(outboundId: string, twilioSid: string): Promise<void> {
    await db().collection(OUTBOUND_COLLECTION).doc(outboundId).update({
        status: "sent",
        twilioSid,
        sentAt: nowIsoString(),
    });
}

/**
 * Mark outbound as delivered.
 */
async function markOutboundDelivered(
    outboundId: string,
    payload: { twilioSid?: string }
): Promise<void> {
    const update: Record<string, unknown> = {
        status: "delivered",
        deliveredAt: nowIsoString(),
    };
    if (payload.twilioSid) {
        update.twilioSid = payload.twilioSid;
    }
    await db().collection(OUTBOUND_COLLECTION).doc(outboundId).update(update);
}

/**
 * Mark outbound as failed.
 */
async function markOutboundFailed(
    outboundId: string,
    payload: { errorCode?: string; errorMessage?: string }
): Promise<void> {
    await db().collection(OUTBOUND_COLLECTION).doc(outboundId).update({
        status: "failed",
        errorCode: payload.errorCode || null,
        errorMessage: payload.errorMessage || null,
        failedAt: nowIsoString(),
    });
}

/**
 * Update outbound status from Twilio callback.
 */
async function updateOutboundStatus(
    twilioSid: string,
    status: DeliveryStatus,
    errorPayload?: { errorCode?: string; errorMessage?: string }
): Promise<void> {
    // Find outbound by twilioSid
    const snap = await db()
        .collection(OUTBOUND_COLLECTION)
        .where("twilioSid", "==", twilioSid)
        .limit(1)
        .get();

    if (snap.empty) {
        // No matching outbound - log only (legacy compat)
        return;
    }

    const docRef = snap.docs[0].ref;
    const update: Record<string, unknown> = { status };

    if (status === "delivered") {
        update.deliveredAt = nowIsoString();
    } else if (status === "failed" || status === "undelivered") {
        update.failedAt = nowIsoString();
        if (errorPayload?.errorCode) {
            update.errorCode = errorPayload.errorCode;
        }
        if (errorPayload?.errorMessage) {
            update.errorMessage = errorPayload.errorMessage;
        }
    }

    await docRef.update(update);
}

// ─────────────────────────────────────────────────────────────────────────────
// CORRELATION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upsert message correlation (idempotent).
 */
async function upsertCorrelation(correlation: MessageCorrelation): Promise<void> {
    const ref = db().collection(CORRELATION_COLLECTION).doc(correlation.id);
    await ref.set(correlation, { merge: true });
}

/**
 * Get correlation by ID.
 */
async function getCorrelation(correlationId: string): Promise<MessageCorrelation | null> {
    const doc = await db().collection(CORRELATION_COLLECTION).doc(correlationId).get();
    if (!doc.exists) return null;
    return doc.data() as MessageCorrelation;
}

/**
 * Find recent correlations for a phone number.
 */
async function findRecentCorrelationsForPhone(
    phoneE164: string,
    limit: number = 5
): Promise<MessageCorrelation[]> {
    const snap = await db()
        .collection(CORRELATION_COLLECTION)
        .where("fromE164", "==", phoneE164)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    return snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data() as MessageCorrelation);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGS OPERATIONS (legacy compat)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log status callback (for debugging/tracing).
 */
async function logStatusCallback(data: {
    messageSid: string;
    status: string;
    to?: string;
    errorCode?: string;
    errorMessage?: string;
}): Promise<void> {
    await db().collection(LOGS_COLLECTION).add({
        messageSid: data.messageSid,
        status: data.status,
        to: data.to || null,
        errorCode: data.errorCode || null,
        errorMessage: data.errorMessage || null,
        timestamp: Timestamp.now(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const MessagingService = {
    // Inbound
    createInboundReceiptIdempotent,
    getInboundReceipt,
    markInboundProcessing,
    markInboundProcessed,
    markInboundFailed,

    // Outbound
    reserveOutboundIdempotency,
    getOutboundByIdempotency,
    createOutboundPending,
    markOutboundSent,
    markOutboundDelivered,
    markOutboundFailed,
    updateOutboundStatus,

    // Correlation
    upsertCorrelation,
    getCorrelation,
    findRecentCorrelationsForPhone,

    // Logs
    logStatusCallback,
};
