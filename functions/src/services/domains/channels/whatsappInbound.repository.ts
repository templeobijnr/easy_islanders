/**
 * WhatsApp Inbound Repository
 * 
 * Manages inbound receipt records for reliable message processing.
 * Enables fast webhook ACK + async processing with exactly-once semantics.
 */

import { db } from '../../../config/firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
    WhatsAppInboundReceipt,
    CreateReceiptInput,
    ProcessingResult,
    InboundStatus,
} from '../../../types/whatsappInbound.types';

// ============================================
// COLLECTION
// ============================================

const COLLECTION = 'whatsappInbound';

function inboundRef(messageSid: string) {
    return db.collection(COLLECTION).doc(messageSid);
}

// ============================================
// RECEIPT OPERATIONS
// ============================================

/**
 * Create receipt if it doesn't exist (idempotent).
 * 
 * @returns True if created, false if already existed
 */
export async function createIfAbsent(input: CreateReceiptInput): Promise<{ created: boolean; receipt: WhatsAppInboundReceipt }> {
    const { messageSid } = input;
    const ref = inboundRef(messageSid);

    return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);

        if (doc.exists) {
            return { created: false, receipt: doc.data() as WhatsAppInboundReceipt };
        }

        const now = Timestamp.now();
        const receipt: WhatsAppInboundReceipt = {
            messageSid,
            fromE164: input.fromE164,
            toE164: input.toE164,
            body: input.body,
            mediaUrls: input.mediaUrls,
            location: input.location,
            receivedAt: now,
            status: 'queued',
            attempts: 0,
        };

        tx.set(ref, receipt);
        return { created: true, receipt };
    });
}

/**
 * Get receipt by MessageSid.
 */
export async function getReceipt(messageSid: string): Promise<WhatsAppInboundReceipt | null> {
    const doc = await inboundRef(messageSid).get();
    if (!doc.exists) return null;
    return doc.data() as WhatsAppInboundReceipt;
}

/**
 * Mark as processing (guarded transition).
 * 
 * @returns True if transition succeeded, false if already processed/processing
 */
export async function markProcessing(messageSid: string): Promise<boolean> {
    const ref = inboundRef(messageSid);

    return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) return false;

        const data = doc.data() as WhatsAppInboundReceipt;

        // Already processed - no-op
        if (data.status === 'processed') {
            return false;
        }

        // Already processing and recent (within 60s) - skip
        // This prevents concurrent workers from double-processing
        if (data.status === 'processing') {
            // Allow retry if last attempt was > 60s ago
            const sixtySecondsAgo = Timestamp.fromMillis(Date.now() - 60000);
            if (data.receivedAt.toMillis() > sixtySecondsAgo.toMillis()) {
                return false;
            }
        }

        tx.update(ref, {
            status: 'processing',
            attempts: FieldValue.increment(1),
        });

        return true;
    });
}

/**
 * Mark as processed (success).
 */
export async function markProcessed(
    messageSid: string,
    result: ProcessingResult
): Promise<void> {
    await inboundRef(messageSid).update({
        status: 'processed',
        threadId: result.threadId,
        route: result.route,
        processedAt: Timestamp.now(),
    });
}

/**
 * Mark as failed.
 */
export async function markFailed(
    messageSid: string,
    error: string
): Promise<void> {
    await inboundRef(messageSid).update({
        status: 'failed',
        lastError: error.slice(0, 500),
    });
}

/**
 * Get receipts by status (for monitoring/retry).
 */
export async function getReceiptsByStatus(
    status: InboundStatus,
    limit: number = 20
): Promise<WhatsAppInboundReceipt[]> {
    const snap = await db.collection(COLLECTION)
        .where('status', '==', status)
        .orderBy('receivedAt', 'asc')
        .limit(limit)
        .get();

    return snap.docs.map(d => d.data() as WhatsAppInboundReceipt);
}
