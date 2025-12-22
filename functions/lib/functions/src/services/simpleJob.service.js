"use strict";
/**
 * Simple Job Service (MVP)
 *
 * Minimal job lifecycle management using Firestore transactions.
 * No complex orchestration - just state transitions with audit logging.
 *
 * INVARIANTS:
 * - All state changes happen inside Firestore transactions
 * - Each transition appends an audit record
 * - MessageSid dedup prevents duplicate processing
 * - Terminal states (confirmed, declined, expired, cancelled) are immutable
 *
 * @see Living Document §5 for authoritative data model
 * @see Living Document §6 for execution primitive
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
exports.createJobDraft = createJobDraft;
exports.confirmJob = confirmJob;
exports.dispatchJob = dispatchJob;
exports.applyProviderReply = applyProviderReply;
exports.runTimeoutSweep = runTimeoutSweep;
exports.getJob = getJob;
exports.getUserJobs = getUserJobs;
exports.cancelJob = cancelJob;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const twilio_service_1 = require("./twilio.service");
// Terminal states that cannot be changed
const TERMINAL_STATES = ['confirmed', 'declined', 'expired', 'cancelled'];
// Required fields per ActionType
const REQUIRED_FIELDS = {
    taxi: ['pickupLocation', 'dropoffLocation'],
    supplies: ['itemType', 'quantity', 'deliveryLocation'],
    reservation: ['listingId', 'dateTime', 'partySize'],
    activity: ['listingId', 'dateTime'],
    experience: ['listingId', 'dateTime', 'participants'],
};
// Timeout durations per ActionType (in milliseconds)
const TIMEOUT_MS = {
    taxi: 10 * 60 * 1000, // 10 minutes
    supplies: 4 * 60 * 60 * 1000, // 4 hours
    reservation: 60 * 60 * 1000, // 1 hour
    activity: 60 * 60 * 1000, // 1 hour
    experience: 60 * 60 * 1000, // 1 hour
};
// ============================================
// HELPERS
// ============================================
function jobRef(jobId) {
    return firebase_1.db.collection('jobs').doc(jobId);
}
function auditRef(jobId) {
    return firebase_1.db.collection('jobs').doc(jobId).collection('audit');
}
function generateId() {
    return firebase_1.db.collection('_').doc().id;
}
function isTerminal(status) {
    return TERMINAL_STATES.includes(status);
}
function hasRequiredFields(actionType, fields) {
    const required = REQUIRED_FIELDS[actionType] || [];
    return required.every(field => fields[field] !== undefined && fields[field] !== null && fields[field] !== '');
}
/**
 * Create a job draft. Idempotent by (userId, clientRequestId).
 */
async function createJobDraft(input) {
    const { userId, marketId, actionType, fields, clientRequestId, traceId, merchantTarget } = input;
    // Dedup by clientRequestId if provided
    if (clientRequestId) {
        const existingQuery = await firebase_1.db.collection('jobs')
            .where('userId', '==', userId)
            .where('clientRequestId', '==', clientRequestId)
            .limit(1)
            .get();
        if (!existingQuery.empty) {
            const existingJob = existingQuery.docs[0];
            logger.info('[SimpleJob] Duplicate clientRequestId, returning existing job', {
                traceId,
                jobId: existingJob.id,
                clientRequestId,
            });
            return { success: true, jobId: existingJob.id, isNew: false };
        }
    }
    // Create new job
    const jobId = generateId();
    const now = firestore_1.Timestamp.now();
    const job = {
        id: jobId,
        userId,
        marketId,
        actionType,
        status: 'draft',
        fields,
        merchantTarget,
        createdAt: now,
        updatedAt: now,
        clientRequestId,
        traceId,
    };
    await jobRef(jobId).set(job);
    logger.info('[SimpleJob] Created job draft', {
        traceId,
        jobId,
        actionType,
        userId,
    });
    return { success: true, jobId, isNew: true };
}
/**
 * User confirms the job. Validates required fields and transitions to 'collecting'.
 */
async function confirmJob(input) {
    const { jobId, userId, traceId } = input;
    try {
        await firebase_1.db.runTransaction(async (tx) => {
            const jobDoc = await tx.get(jobRef(jobId));
            if (!jobDoc.exists) {
                throw new Error('Job not found');
            }
            const job = jobDoc.data();
            // Verify owner
            if (job.userId !== userId) {
                throw new Error('Forbidden: not job owner');
            }
            // Check current status
            if (job.status !== 'draft') {
                throw new Error(`Cannot confirm job in status: ${job.status}`);
            }
            // Validate required fields
            if (!hasRequiredFields(job.actionType, job.fields)) {
                const required = REQUIRED_FIELDS[job.actionType];
                throw new Error(`Missing required fields for ${job.actionType}: ${required.join(', ')}`);
            }
            // Transition to collecting
            const now = firestore_1.Timestamp.now();
            tx.update(jobRef(jobId), {
                status: 'collecting',
                updatedAt: now,
            });
            // Append audit record
            const auditId = generateId();
            tx.set(auditRef(jobId).doc(auditId), {
                id: auditId,
                jobId,
                fromStatus: 'draft',
                toStatus: 'collecting',
                actorType: 'user',
                actorId: userId,
                traceId,
                timestamp: now,
            });
        });
        logger.info('[SimpleJob] Job confirmed by user', { traceId, jobId });
        return { success: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[SimpleJob] confirmJob failed', { traceId, jobId, error: message });
        return { success: false, error: message, errorCode: 'CONFIRM_FAILED' };
    }
}
/**
 * Dispatch job to provider via WhatsApp.
 * Transaction sets status + dispatchedAt before sending message.
 */
async function dispatchJob(input) {
    var _a;
    const { jobId, userId, traceId } = input;
    let job = null;
    try {
        // Phase 1: Transaction - set status to dispatched
        await firebase_1.db.runTransaction(async (tx) => {
            var _a, _b;
            const jobDoc = await tx.get(jobRef(jobId));
            if (!jobDoc.exists) {
                throw new Error('Job not found');
            }
            job = jobDoc.data();
            // Verify owner
            if (job.userId !== userId) {
                throw new Error('Forbidden: not job owner');
            }
            // Check current status
            if (job.status !== 'collecting') {
                throw new Error(`Cannot dispatch job in status: ${job.status}`);
            }
            // Verify merchant target exists
            if (!((_a = job.merchantTarget) === null || _a === void 0 ? void 0 : _a.phoneE164) && !((_b = job.merchantTarget) === null || _b === void 0 ? void 0 : _b.listingId)) {
                throw new Error('No merchant target set');
            }
            // Transition to dispatched
            const now = firestore_1.Timestamp.now();
            tx.update(jobRef(jobId), {
                status: 'dispatched',
                dispatchedAt: now,
                updatedAt: now,
            });
            // Append audit record
            const auditId = generateId();
            tx.set(auditRef(jobId).doc(auditId), {
                id: auditId,
                jobId,
                fromStatus: 'collecting',
                toStatus: 'dispatched',
                actorType: 'system',
                actorId: 'dispatch',
                traceId,
                timestamp: now,
            });
        });
        logger.info('[SimpleJob] Job dispatched (status set)', { traceId, jobId });
        // Phase 2: Send WhatsApp message (outside transaction)
        if ((_a = job === null || job === void 0 ? void 0 : job.merchantTarget) === null || _a === void 0 ? void 0 : _a.phoneE164) {
            try {
                const message = formatDispatchMessage(job);
                const result = await (0, twilio_service_1.sendWhatsApp)(job.merchantTarget.phoneE164, message);
                // Best-effort update with messageSid
                if (result === null || result === void 0 ? void 0 : result.sid) {
                    await jobRef(jobId).update({
                        outboundMessageSid: result.sid,
                        updatedAt: firestore_1.Timestamp.now(),
                    });
                }
                logger.info('[SimpleJob] WhatsApp sent', { traceId, jobId, messageSid: result === null || result === void 0 ? void 0 : result.sid });
                return { success: true, messageSid: result === null || result === void 0 ? void 0 : result.sid };
            }
            catch (sendError) {
                // Log but don't fail - job is already dispatched
                logger.error('[SimpleJob] WhatsApp send failed', {
                    traceId,
                    jobId,
                    error: sendError instanceof Error ? sendError.message : String(sendError),
                });
                return { success: true }; // Job is dispatched, message send is best-effort
            }
        }
        return { success: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[SimpleJob] dispatchJob failed', { traceId, jobId, error: message });
        return { success: false, error: message, errorCode: 'DISPATCH_FAILED' };
    }
}
function formatDispatchMessage(job) {
    const { actionType, fields } = job;
    switch (actionType) {
        case 'taxi':
            return `New taxi request:\n` +
                `From: ${fields.pickupLocation}\n` +
                `To: ${fields.dropoffLocation}\n` +
                `Reply YES to accept or NO to decline.`;
        case 'supplies':
            return `New supply order:\n` +
                `Item: ${fields.itemType}\n` +
                `Quantity: ${fields.quantity}\n` +
                `Deliver to: ${fields.deliveryLocation}\n` +
                `Reply YES to accept or NO to decline.`;
        case 'reservation':
            return `New reservation request:\n` +
                `Date/Time: ${fields.dateTime}\n` +
                `Party size: ${fields.partySize}\n` +
                `Reply YES to accept or NO to decline.`;
        default:
            return `New ${actionType} request. Reply YES to accept or NO to decline.`;
    }
}
/**
 * Apply provider reply to a job.
 * Dedup by MessageSid. Terminal states are immutable.
 */
async function applyProviderReply(input) {
    const { messageSid, fromE164, body, traceId } = input;
    // Check dedup first
    const dedupRef = firebase_1.db.collection('processed_messages').doc(messageSid);
    const dedupDoc = await dedupRef.get();
    if (dedupDoc.exists) {
        logger.info('[SimpleJob] Duplicate MessageSid, ignoring', { traceId, messageSid });
        return { success: true, action: 'duplicate' };
    }
    // Find job by provider phone
    const jobsQuery = await firebase_1.db.collection('jobs')
        .where('merchantTarget.phoneE164', '==', fromE164)
        .where('status', '==', 'dispatched')
        .orderBy('dispatchedAt', 'desc')
        .limit(1)
        .get();
    if (jobsQuery.empty) {
        logger.info('[SimpleJob] No dispatched job found for provider', { traceId, fromE164 });
        // Still mark as processed to prevent retries
        await dedupRef.set({
            messageSid,
            processedAt: firestore_1.Timestamp.now(),
            result: 'no_job',
            traceId,
        });
        return { success: true, action: 'not_found' };
    }
    const jobDoc = jobsQuery.docs[0];
    const jobId = jobDoc.id;
    // Parse reply
    const normalizedBody = body.trim().toLowerCase();
    const isAccept = normalizedBody === 'yes' || normalizedBody === 'y' || normalizedBody === 'ok';
    const isDecline = normalizedBody === 'no' || normalizedBody === 'n';
    if (!isAccept && !isDecline) {
        logger.info('[SimpleJob] Ambiguous reply, ignoring', { traceId, jobId, body });
        await dedupRef.set({
            messageSid,
            processedAt: firestore_1.Timestamp.now(),
            result: 'ambiguous',
            jobId,
            traceId,
        });
        return { success: true, action: 'ignored', jobId };
    }
    try {
        await firebase_1.db.runTransaction(async (tx) => {
            const currentJobDoc = await tx.get(jobRef(jobId));
            const currentJob = currentJobDoc.data();
            // Check if still in dispatched (could have changed since query)
            if (currentJob.status !== 'dispatched') {
                // Already terminal - record as late reply but don't change state
                tx.set(dedupRef, {
                    messageSid,
                    processedAt: firestore_1.Timestamp.now(),
                    result: 'late_reply',
                    jobId,
                    traceId,
                });
                return;
            }
            const newStatus = isAccept ? 'confirmed' : 'declined';
            const now = firestore_1.Timestamp.now();
            // Update job status
            tx.update(jobRef(jobId), {
                status: newStatus,
                updatedAt: now,
            });
            // Append audit record
            const auditId = generateId();
            tx.set(auditRef(jobId).doc(auditId), {
                id: auditId,
                jobId,
                fromStatus: 'dispatched',
                toStatus: newStatus,
                actorType: 'provider',
                actorId: fromE164,
                traceId,
                timestamp: now,
                reason: `Reply: ${body}`,
            });
            // Mark as processed
            tx.set(dedupRef, {
                messageSid,
                processedAt: now,
                result: newStatus,
                jobId,
                traceId,
            });
        });
        logger.info('[SimpleJob] Provider reply processed', {
            traceId,
            jobId,
            action: isAccept ? 'accepted' : 'declined',
        });
        return {
            success: true,
            action: isAccept ? 'accepted' : 'declined',
            jobId,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error('[SimpleJob] applyProviderReply failed', { traceId, jobId, error: message });
        return { success: false, action: 'ignored', jobId, error: message };
    }
}
/**
 * Sweep for timed-out jobs and mark them expired.
 * Called by scheduled function.
 */
async function runTimeoutSweep(input) {
    var _a;
    const { traceId, limit = 100 } = input;
    const now = input.now || new Date();
    const result = { processed: 0, expired: [], errors: [] };
    logger.info('[SimpleJob] Starting timeout sweep', { traceId, now: now.toISOString() });
    // Query dispatched jobs
    const dispatchedJobs = await firebase_1.db.collection('jobs')
        .where('status', '==', 'dispatched')
        .orderBy('dispatchedAt', 'asc')
        .limit(limit)
        .get();
    for (const doc of dispatchedJobs.docs) {
        const job = doc.data();
        const jobId = doc.id;
        try {
            // Calculate timeout boundary
            const timeoutMs = TIMEOUT_MS[job.actionType] || 15 * 60 * 1000; // Default 15 min
            const dispatchedAt = ((_a = job.dispatchedAt) === null || _a === void 0 ? void 0 : _a.toMillis()) || 0;
            const timeoutBoundary = dispatchedAt + timeoutMs;
            if (now.getTime() <= timeoutBoundary) {
                // Not yet timed out
                continue;
            }
            // Expire the job
            await firebase_1.db.runTransaction(async (tx) => {
                const currentDoc = await tx.get(jobRef(jobId));
                const currentJob = currentDoc.data();
                // Double-check still dispatched (could have changed)
                if (currentJob.status !== 'dispatched') {
                    return;
                }
                const timestamp = firestore_1.Timestamp.now();
                tx.update(jobRef(jobId), {
                    status: 'expired',
                    updatedAt: timestamp,
                });
                const auditId = generateId();
                tx.set(auditRef(jobId).doc(auditId), {
                    id: auditId,
                    jobId,
                    fromStatus: 'dispatched',
                    toStatus: 'expired',
                    actorType: 'system',
                    actorId: 'timeout-worker',
                    traceId,
                    timestamp,
                    reason: `Timeout after ${timeoutMs}ms`,
                });
            });
            result.expired.push(jobId);
            result.processed++;
            logger.info('[SimpleJob] Job expired by timeout', { traceId, jobId });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            result.errors.push(`${jobId}: ${message}`);
            logger.error('[SimpleJob] Timeout sweep error', { traceId, jobId, error: message });
        }
    }
    logger.info('[SimpleJob] Timeout sweep complete', {
        traceId,
        processed: result.processed,
        expired: result.expired.length,
        errors: result.errors.length,
    });
    return result;
}
// ============================================
// 6. GET JOB (for API)
// ============================================
/**
 * Get job by ID (for owner only).
 */
async function getJob(jobId, userId) {
    const doc = await jobRef(jobId).get();
    if (!doc.exists)
        return null;
    const job = doc.data();
    if (job.userId !== userId)
        return null;
    return job;
}
/**
 * Get jobs for user.
 */
async function getUserJobs(userId, limit = 20) {
    const snap = await firebase_1.db.collection('jobs')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
    return snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
}
/**
 * Cancel job (user-initiated).
 */
async function cancelJob(jobId, userId, traceId) {
    try {
        await firebase_1.db.runTransaction(async (tx) => {
            const doc = await tx.get(jobRef(jobId));
            if (!doc.exists)
                throw new Error('Job not found');
            const job = doc.data();
            if (job.userId !== userId)
                throw new Error('Forbidden');
            if (isTerminal(job.status))
                throw new Error(`Cannot cancel job in status: ${job.status}`);
            const now = firestore_1.Timestamp.now();
            tx.update(jobRef(jobId), { status: 'cancelled', updatedAt: now });
            const auditId = generateId();
            tx.set(auditRef(jobId).doc(auditId), {
                id: auditId,
                jobId,
                fromStatus: job.status,
                toStatus: 'cancelled',
                actorType: 'user',
                actorId: userId,
                traceId,
                timestamp: now,
            });
        });
        return { success: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
    }
}
//# sourceMappingURL=simpleJob.service.js.map