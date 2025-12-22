/**
 * Thread Repository
 * 
 * Manages thread and message documents in Firestore.
 * Provides idempotent operations for thread creation and message appending.
 */

import { db } from '../../../config/firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
    Thread,
    ThreadMessage,
    CreateThreadInput,
    AppendMessageInput,
    UpdateThreadStateInput,
} from '../../../types/thread.types';
import { computeThreadId, generateMessageId } from './threadId.service';

// ============================================
// COLLECTIONS
// ============================================

const THREADS_COLLECTION = 'threads';

function threadsRef() {
    return db.collection(THREADS_COLLECTION);
}

function threadRef(threadId: string) {
    return threadsRef().doc(threadId);
}

function messagesRef(threadId: string) {
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
export async function getOrCreateThread(input: CreateThreadInput): Promise<Thread> {
    const { threadType, actorId, businessId, channel } = input;

    // Compute deterministic thread ID
    const threadId = computeThreadId({ threadType, actorId, businessId });
    const ref = threadRef(threadId);

    return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);

        if (doc.exists) {
            const existing = doc.data() as Thread;

            // Update channels array if new channel
            if (!existing.channels.includes(channel)) {
                tx.update(ref, {
                    channels: FieldValue.arrayUnion(channel),
                    updatedAt: Timestamp.now(),
                });
                return {
                    ...existing,
                    channels: [...existing.channels, channel],
                    updatedAt: Timestamp.now(),
                };
            }

            return existing;
        }

        // Create new thread
        const now = Timestamp.now();
        const newThread: Thread = {
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
export async function getThread(threadId: string): Promise<Thread | null> {
    const doc = await threadRef(threadId).get();
    if (!doc.exists) return null;
    return doc.data() as Thread;
}

/**
 * Update thread state (pendingAction, state, lastMessageAt).
 */
export async function updateThreadState(
    threadId: string,
    update: UpdateThreadStateInput
): Promise<void> {
    const patch: Record<string, any> = {
        updatedAt: Timestamp.now(),
    };

    if (update.state !== undefined) {
        patch.state = update.state;
    }
    if (update.pendingAction !== undefined) {
        if (update.pendingAction === null) {
            patch.pendingAction = FieldValue.delete();
        } else {
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
export async function ensureOutboundSend(
    threadId: string,
    dedupeId: string,
    text: string
): Promise<{ created: boolean }> {
    const ref = threadRef(threadId).collection('outboundSends').doc(dedupeId);

    return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (doc.exists) {
            return { created: false };
        }

        tx.set(ref, {
            text,
            createdAt: Timestamp.now(),
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
export async function appendMessage(input: AppendMessageInput): Promise<ThreadMessage> {
    const { threadId, channelMessageId, ...rest } = input;
    const now = Timestamp.now();

    // If channelMessageId provided, use it for idempotency
    if (channelMessageId) {
        const idemKey = `${threadId}:${channelMessageId}`;
        const idemRef = db.collection('messageIdempotency').doc(idemKey);

        return db.runTransaction(async (tx) => {
            const idemDoc = await tx.get(idemRef);

            if (idemDoc.exists) {
                // Already processed - return existing message
                const existingMessageId = idemDoc.data()!.messageId;
                const existingDoc = await tx.get(messagesRef(threadId).doc(existingMessageId));
                if (existingDoc.exists) {
                    return existingDoc.data() as ThreadMessage;
                }
            }

            // Create new message
            const messageId = generateMessageId();
            const message: ThreadMessage = {
                id: messageId,
                threadId,
                channelMessageId,
                createdAt: now,
                ...rest,
            };

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
    const messageId = generateMessageId();
    const message: ThreadMessage = {
        id: messageId,
        threadId,
        createdAt: now,
        ...rest,
    };

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
export async function getThreadMessages(
    threadId: string,
    limit: number = 50
): Promise<ThreadMessage[]> {
    const snap = await messagesRef(threadId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    return snap.docs.map(d => d.data() as ThreadMessage).reverse();
}
