"use strict";
/**
 * WhatsApp Inbound Repository
 *
 * Manages inbound receipt records for reliable message processing.
 * Enables fast webhook ACK + async processing with exactly-once semantics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIfAbsent = createIfAbsent;
exports.getReceipt = getReceipt;
exports.markProcessing = markProcessing;
exports.markProcessed = markProcessed;
exports.markFailed = markFailed;
exports.getReceiptsByStatus = getReceiptsByStatus;
const firebase_1 = require("../../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
// ============================================
// COLLECTION
// ============================================
const COLLECTION = 'whatsappInbound';
function inboundRef(messageSid) {
    return firebase_1.db.collection(COLLECTION).doc(messageSid);
}
// ============================================
// RECEIPT OPERATIONS
// ============================================
/**
 * Create receipt if it doesn't exist (idempotent).
 *
 * @returns True if created, false if already existed
 */
async function createIfAbsent(input) {
    const { messageSid } = input;
    const ref = inboundRef(messageSid);
    return firebase_1.db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (doc.exists) {
            return { created: false, receipt: doc.data() };
        }
        const now = firestore_1.Timestamp.now();
        const receipt = {
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
async function getReceipt(messageSid) {
    const doc = await inboundRef(messageSid).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
/**
 * Mark as processing (guarded transition).
 *
 * @returns True if transition succeeded, false if already processed/processing
 */
async function markProcessing(messageSid) {
    const ref = inboundRef(messageSid);
    return firebase_1.db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists)
            return false;
        const data = doc.data();
        // Already processed - no-op
        if (data.status === 'processed') {
            return false;
        }
        // Already processing and recent (within 60s) - skip
        // This prevents concurrent workers from double-processing
        if (data.status === 'processing') {
            // Allow retry if last attempt was > 60s ago
            const sixtySecondsAgo = firestore_1.Timestamp.fromMillis(Date.now() - 60000);
            if (data.receivedAt.toMillis() > sixtySecondsAgo.toMillis()) {
                return false;
            }
        }
        tx.update(ref, {
            status: 'processing',
            attempts: firestore_1.FieldValue.increment(1),
        });
        return true;
    });
}
/**
 * Mark as processed (success).
 */
async function markProcessed(messageSid, result) {
    await inboundRef(messageSid).update({
        status: 'processed',
        threadId: result.threadId,
        route: result.route,
        processedAt: firestore_1.Timestamp.now(),
    });
}
/**
 * Mark as failed.
 */
async function markFailed(messageSid, error) {
    await inboundRef(messageSid).update({
        status: 'failed',
        lastError: error.slice(0, 500),
    });
}
/**
 * Get receipts by status (for monitoring/retry).
 */
async function getReceiptsByStatus(status, limit = 20) {
    const snap = await firebase_1.db.collection(COLLECTION)
        .where('status', '==', status)
        .orderBy('receivedAt', 'asc')
        .limit(limit)
        .get();
    return snap.docs.map(d => d.data());
}
//# sourceMappingURL=whatsappInbound.repository.js.map