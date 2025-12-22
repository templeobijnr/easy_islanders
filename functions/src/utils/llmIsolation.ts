/**
 * LLM Isolation / Outbox Pattern (DB-04)
 *
 * Prevents Firestore transactions from waiting on LLM/external APIs.
 *
 * INVARIANTS:
 * - No Firestore transaction waits on Gemini/Twilio/Places.
 * - Write DB first, enqueue async work in outbox, process later.
 * - Outbox processing is idempotent (uses attemptId for dedupe).
 * - All outbox ops logged with traceId, outboxId, jobId.
 *
 * PATTERN: State + Outbox
 * 1. Write initial state to DB (fast, no external calls)
 * 2. Write outbox entry with pending work
 * 3. Firestore trigger or scheduled job processes outbox
 * 4. Update state with evidence after success
 *
 * @see Living Document Section 18.3 for invariants.
 */

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Outbox entry structure.
 */
export interface OutboxEntry {
    id: string;
    jobId: string;
    actionId?: string;
    type: 'llm_request' | 'twilio_send' | 'places_lookup' | 'webhook_call';
    payload: Record<string, unknown>;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    attempts: number;
    maxAttempts: number;
    lastAttemptId?: string;
    lastError?: string;
    createdAt: Date;
    processedAt?: Date;
    traceId: string;
}

/**
 * Outbox processing result.
 */
export interface OutboxResult {
    success: boolean;
    outboxId: string;
    evidence?: Record<string, unknown>;
    error?: string;
}

/**
 * Outbox collection name.
 */
const OUTBOX_COLLECTION = 'outbox';

/**
 * Default max attempts.
 */
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Creates an outbox entry for async work.
 * Call this within your Firestore transaction.
 *
 * @param entry - Outbox entry data.
 * @param transaction - Optional Firestore transaction.
 */
export async function enqueueOutbox(
    entry: Omit<OutboxEntry, 'id' | 'status' | 'attempts' | 'createdAt'>,
    transaction?: FirebaseFirestore.Transaction
): Promise<string> {
    const outboxRef = db.collection(OUTBOX_COLLECTION).doc();
    const outboxEntry: OutboxEntry = {
        ...entry,
        id: outboxRef.id,
        status: 'pending',
        attempts: 0,
        maxAttempts: entry.maxAttempts || DEFAULT_MAX_ATTEMPTS,
        createdAt: new Date(),
    };

    if (transaction) {
        transaction.set(outboxRef, outboxEntry);
    } else {
        await outboxRef.set(outboxEntry);
    }

    logger.info('LLMIsolation: Outbox entry created', {
        component: 'llmIsolation',
        event: 'outbox_created',
        traceId: entry.traceId,
        outboxId: outboxRef.id,
        jobId: entry.jobId,
        type: entry.type,
    });

    return outboxRef.id;
}

/**
 * Claims an outbox entry for processing.
 * Uses compare-and-swap to prevent duplicate processing.
 *
 * @param outboxId - ID of the outbox entry.
 * @param attemptId - Unique attempt ID for idempotency.
 * @param traceId - Trace ID.
 * @returns The entry if claimed, null if already processing.
 */
export async function claimOutboxEntry(
    outboxId: string,
    attemptId: string,
    traceId: string
): Promise<OutboxEntry | null> {
    const outboxRef = db.collection(OUTBOX_COLLECTION).doc(outboxId);

    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(outboxRef);

        if (!doc.exists) {
            logger.warn('LLMIsolation: Outbox entry not found', {
                component: 'llmIsolation',
                event: 'outbox_not_found',
                traceId,
                outboxId,
            });
            return null;
        }

        const entry = doc.data() as OutboxEntry;

        // Already completed or failed
        if (entry.status === 'completed' || entry.status === 'failed') {
            logger.info('LLMIsolation: Outbox already terminal', {
                component: 'llmIsolation',
                event: 'outbox_terminal',
                traceId,
                outboxId,
                status: entry.status,
            });
            return null;
        }

        // Idempotency check: same attemptId
        if (entry.lastAttemptId === attemptId) {
            logger.info('LLMIsolation: Duplicate attempt', {
                component: 'llmIsolation',
                event: 'outbox_duplicate_attempt',
                traceId,
                outboxId,
                attemptId,
            });
            return null;
        }

        // Max attempts exceeded
        if (entry.attempts >= entry.maxAttempts) {
            transaction.update(outboxRef, {
                status: 'failed',
                lastError: 'Max attempts exceeded',
                processedAt: new Date(),
            });

            logger.error('LLMIsolation: Max attempts exceeded', {
                component: 'llmIsolation',
                event: 'outbox_max_attempts',
                traceId,
                outboxId,
                attempts: entry.attempts,
            });
            return null;
        }

        // Claim the entry
        transaction.update(outboxRef, {
            status: 'processing',
            attempts: entry.attempts + 1,
            lastAttemptId: attemptId,
        });

        logger.info('LLMIsolation: Outbox claimed', {
            component: 'llmIsolation',
            event: 'outbox_claimed',
            traceId,
            outboxId,
            attemptId,
            attemptNumber: entry.attempts + 1,
        });

        return { ...entry, attempts: entry.attempts + 1 };
    });
}

/**
 * Completes an outbox entry with evidence.
 */
export async function completeOutbox(
    outboxId: string,
    evidence: Record<string, unknown>,
    traceId: string
): Promise<void> {
    await db.collection(OUTBOX_COLLECTION).doc(outboxId).update({
        status: 'completed',
        evidence,
        processedAt: new Date(),
    });

    logger.info('LLMIsolation: Outbox completed', {
        component: 'llmIsolation',
        event: 'outbox_completed',
        traceId,
        outboxId,
    });
}

/**
 * Fails an outbox entry.
 */
export async function failOutbox(
    outboxId: string,
    error: string,
    traceId: string
): Promise<void> {
    const outboxRef = db.collection(OUTBOX_COLLECTION).doc(outboxId);
    const doc = await outboxRef.get();

    if (!doc.exists) return;

    const entry = doc.data() as OutboxEntry;

    // Check if should retry or fail permanently
    const isFinal = entry.attempts >= entry.maxAttempts;

    await outboxRef.update({
        status: isFinal ? 'failed' : 'pending',
        lastError: error,
        processedAt: isFinal ? new Date() : null,
    });

    logger.warn('LLMIsolation: Outbox failed', {
        component: 'llmIsolation',
        event: 'outbox_failed',
        traceId,
        outboxId,
        error,
        isFinal,
        attempts: entry.attempts,
    });
}

/**
 * Gets pending outbox entries for processing.
 */
export async function getPendingOutbox(
    limit: number = 10
): Promise<OutboxEntry[]> {
    const snapshot = await db
        .collection(OUTBOX_COLLECTION)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .get();

    return snapshot.docs.map((doc) => doc.data() as OutboxEntry);
}
