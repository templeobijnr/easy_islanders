"use strict";
/**
 * Thread Repository
 *
 * Manages thread and message documents in Firestore.
 * Provides idempotent operations for thread creation and message appending.
 */
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateThread = getOrCreateThread;
exports.getThread = getThread;
exports.updateThreadState = updateThreadState;
exports.ensureOutboundSend = ensureOutboundSend;
exports.appendMessage = appendMessage;
exports.getThreadMessages = getThreadMessages;
const firebase_1 = require("../../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const threadId_service_1 = require("./threadId.service");
// ============================================
// COLLECTIONS
// ============================================
const THREADS_COLLECTION = 'threads';
function threadsRef() {
    return firebase_1.db.collection(THREADS_COLLECTION);
}
function threadRef(threadId) {
    return threadsRef().doc(threadId);
}
function messagesRef(threadId) {
    return threadRef(threadId).collection('messages');
}
// ============================================
// THREAD OPERATIONS
// ============================================
/**
 * Get or create a thread.
 *
 * This operation is idempotent - calling with the same inputs returns the same thread.
 * Uses Firestore transaction to prevent race conditions.
 */
async function getOrCreateThread(input) {
    const { threadType, actorId, businessId, channel } = input;
    // Compute deterministic thread ID
    const threadId = (0, threadId_service_1.computeThreadId)({ threadType, actorId, businessId });
    const ref = threadRef(threadId);
    return firebase_1.db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (doc.exists) {
            const existing = doc.data();
            // Update channels array if new channel
            if (!existing.channels.includes(channel)) {
                tx.update(ref, {
                    channels: firestore_1.FieldValue.arrayUnion(channel),
                    updatedAt: firestore_1.Timestamp.now(),
                });
                return Object.assign(Object.assign({}, existing), { channels: [...existing.channels, channel], updatedAt: firestore_1.Timestamp.now() });
            }
            return existing;
        }
        // Create new thread
        const now = firestore_1.Timestamp.now();
        const newThread = {
            id: threadId,
            threadType,
            actorId,
            businessId,
            channels: [channel],
            status: 'active',
            state: 'idle',
            lastMessageAt: now,
            createdAt: now,
            updatedAt: now,
        };
        tx.set(ref, newThread);
        return newThread;
    });
}
/**
 * Get a thread by ID.
 */
async function getThread(threadId) {
    const doc = await threadRef(threadId).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
/**
 * Update thread state (pendingAction, state, lastMessageAt).
 */
async function updateThreadState(threadId, update) {
    const patch = {
        updatedAt: firestore_1.Timestamp.now(),
    };
    if (update.state !== undefined) {
        patch.state = update.state;
    }
    if (update.pendingAction !== undefined) {
        if (update.pendingAction === null) {
            patch.pendingAction = firestore_1.FieldValue.delete();
        }
        else {
            patch.pendingAction = update.pendingAction;
        }
    }
    if (update.lastMessageAt !== undefined) {
        patch.lastMessageAt = update.lastMessageAt;
    }
    if (update.status !== undefined) {
        patch.status = update.status;
    }
    await threadRef(threadId).update(patch);
}
// ============================================
// OUTBOUND IDEMPOTENCY
// ============================================
/**
 * Ensure an outbound message is only sent once per dedupeId.
 *
 * @param threadId The thread ID
 * @param dedupeId Unique ID for this send attempt (e.g. messageSid:index)
 * @param text The text being sent
 * @returns { created: boolean } - true if we should send, false if already sent
 */
async function ensureOutboundSend(threadId, dedupeId, text) {
    const ref = threadRef(threadId).collection('outboundSends').doc(dedupeId);
    return firebase_1.db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (doc.exists) {
            return { created: false };
        }
        tx.set(ref, {
            text,
            createdAt: firestore_1.Timestamp.now(),
        });
        return { created: true };
    });
}
// ============================================
// MESSAGE OPERATIONS
// ============================================
/**
 * Append a message to a thread.
 *
 * This operation is idempotent when channelMessageId is provided -
 * duplicate messages with the same channelMessageId are ignored.
 */
async function appendMessage(input) {
    const { threadId, channelMessageId } = input, rest = __rest(input, ["threadId", "channelMessageId"]);
    const now = firestore_1.Timestamp.now();
    // If channelMessageId provided, use it for idempotency
    if (channelMessageId) {
        const idemKey = `${threadId}:${channelMessageId}`;
        const idemRef = firebase_1.db.collection('messageIdempotency').doc(idemKey);
        return firebase_1.db.runTransaction(async (tx) => {
            const idemDoc = await tx.get(idemRef);
            if (idemDoc.exists) {
                // Already processed - return existing message
                const existingMessageId = idemDoc.data().messageId;
                const existingDoc = await tx.get(messagesRef(threadId).doc(existingMessageId));
                if (existingDoc.exists) {
                    return existingDoc.data();
                }
            }
            // Create new message
            const messageId = (0, threadId_service_1.generateMessageId)();
            const message = Object.assign({ id: messageId, threadId,
                channelMessageId, createdAt: now }, rest);
            tx.set(messagesRef(threadId).doc(messageId), message);
            tx.set(idemRef, { messageId, createdAt: now });
            // Update thread lastMessageAt
            tx.update(threadRef(threadId), {
                lastMessageAt: now,
                updatedAt: now,
            });
            return message;
        });
    }
    // No idempotency key - just create
    const messageId = (0, threadId_service_1.generateMessageId)();
    const message = Object.assign({ id: messageId, threadId, createdAt: now }, rest);
    await messagesRef(threadId).doc(messageId).set(message);
    await threadRef(threadId).update({
        lastMessageAt: now,
        updatedAt: now,
    });
    return message;
}
/**
 * Get messages for a thread (ordered by createdAt).
 */
async function getThreadMessages(threadId, limit = 50) {
    const snap = await messagesRef(threadId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    return snap.docs.map(d => d.data()).reverse();
}
//# sourceMappingURL=thread.repository.js.map