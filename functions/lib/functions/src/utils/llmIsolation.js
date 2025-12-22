"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueOutbox = enqueueOutbox;
exports.claimOutboxEntry = claimOutboxEntry;
exports.completeOutbox = completeOutbox;
exports.failOutbox = failOutbox;
exports.getPendingOutbox = getPendingOutbox;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
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
async function enqueueOutbox(entry, transaction) {
    const outboxRef = firebase_1.db.collection(OUTBOX_COLLECTION).doc();
    const outboxEntry = Object.assign(Object.assign({}, entry), { id: outboxRef.id, status: 'pending', attempts: 0, maxAttempts: entry.maxAttempts || DEFAULT_MAX_ATTEMPTS, createdAt: new Date() });
    if (transaction) {
        transaction.set(outboxRef, outboxEntry);
    }
    else {
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
async function claimOutboxEntry(outboxId, attemptId, traceId) {
    const outboxRef = firebase_1.db.collection(OUTBOX_COLLECTION).doc(outboxId);
    return firebase_1.db.runTransaction(async (transaction) => {
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
        const entry = doc.data();
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
        return Object.assign(Object.assign({}, entry), { attempts: entry.attempts + 1 });
    });
}
/**
 * Completes an outbox entry with evidence.
 */
async function completeOutbox(outboxId, evidence, traceId) {
    await firebase_1.db.collection(OUTBOX_COLLECTION).doc(outboxId).update({
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
async function failOutbox(outboxId, error, traceId) {
    const outboxRef = firebase_1.db.collection(OUTBOX_COLLECTION).doc(outboxId);
    const doc = await outboxRef.get();
    if (!doc.exists)
        return;
    const entry = doc.data();
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
async function getPendingOutbox(limit = 10) {
    const snapshot = await firebase_1.db
        .collection(OUTBOX_COLLECTION)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => doc.data());
}
//# sourceMappingURL=llmIsolation.js.map