"use strict";
/**
 * Atomic Dispatch Guard (CASC-01B)
 *
 * Ensures job status update + dispatch send is transactionally safe.
 *
 * INVARIANTS:
 * - Dispatch SID (evidence) persisted BEFORE status = 'confirmed'.
 * - Failed dispatch = status remains 'dispatched' (not confirmed).
 * - Idempotent: re-dispatch with same SID is a no-op.
 * - All dispatch attempts logged with traceId, jobId, twilioSid.
 *
 * @see Living Document Section 17.2.4 for invariants.
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
exports.recordDispatchEvidence = recordDispatchEvidence;
exports.confirmWithEvidence = confirmWithEvidence;
exports.atomicDispatchAndConfirm = atomicDispatchAndConfirm;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const casConfirmation_1 = require("./casConfirmation");
/**
 * Records dispatch evidence for a job.
 * Call this AFTER successful Twilio send, BEFORE confirming.
 */
async function recordDispatchEvidence(jobId, evidence) {
    const { traceId, twilioSid } = evidence;
    logger.info('AtomicDispatch: Recording evidence', {
        component: 'atomicDispatch',
        event: 'evidence_recording',
        traceId,
        jobId,
        twilioSid,
    });
    const jobRef = firebase_1.db.collection('jobs').doc(jobId);
    await firebase_1.db.runTransaction(async (transaction) => {
        var _a;
        const doc = await transaction.get(jobRef);
        if (!doc.exists) {
            throw new Error(`Job ${jobId} not found`);
        }
        const data = doc.data();
        // Idempotent check: already has this SID
        if (((_a = data.dispatchEvidence) === null || _a === void 0 ? void 0 : _a.twilioSid) === twilioSid) {
            logger.info('AtomicDispatch: Evidence already recorded (idempotent)', {
                component: 'atomicDispatch',
                event: 'evidence_idempotent',
                traceId,
                jobId,
                twilioSid,
            });
            return;
        }
        transaction.update(jobRef, {
            dispatchEvidence: evidence,
            dispatchSid: twilioSid,
            dispatchedAt: evidence.dispatchedAt,
            updatedAt: new Date(),
        });
        logger.info('AtomicDispatch: Evidence recorded', {
            component: 'atomicDispatch',
            event: 'evidence_recorded',
            traceId,
            jobId,
            twilioSid,
        });
    });
}
/**
 * Confirms a job ONLY if dispatch evidence is present.
 * This is the safe path: evidence → confirm.
 */
async function confirmWithEvidence(jobId, ctx) {
    var _a;
    const { traceId } = ctx;
    logger.info('AtomicDispatch: Confirming with evidence check', {
        component: 'atomicDispatch',
        event: 'confirm_with_evidence',
        traceId,
        jobId,
    });
    const jobRef = firebase_1.db.collection('jobs').doc(jobId);
    const doc = await jobRef.get();
    if (!doc.exists) {
        return {
            success: false,
            jobId,
            error: 'Job not found',
        };
    }
    const data = doc.data();
    // Check for dispatch evidence
    if (!((_a = data.dispatchEvidence) === null || _a === void 0 ? void 0 : _a.twilioSid)) {
        logger.error('AtomicDispatch: No dispatch evidence - BLOCKED', {
            component: 'atomicDispatch',
            event: 'no_evidence',
            traceId,
            jobId,
        });
        return {
            success: false,
            jobId,
            error: 'Cannot confirm without dispatch evidence',
        };
    }
    // Use CAS to atomically update status
    try {
        await (0, casConfirmation_1.casUpdateStatus)(jobId, 'dispatched', 'confirmed', { traceId });
        logger.info('AtomicDispatch: Job confirmed', {
            component: 'atomicDispatch',
            event: 'confirmed',
            traceId,
            jobId,
            twilioSid: data.dispatchEvidence.twilioSid,
        });
        return {
            success: true,
            jobId,
            twilioSid: data.dispatchEvidence.twilioSid,
        };
    }
    catch (error) {
        if (error instanceof casConfirmation_1.CASError) {
            logger.warn('AtomicDispatch: CAS failed during confirm', {
                component: 'atomicDispatch',
                event: 'cas_failed',
                traceId,
                jobId,
                error: error.message,
            });
            return {
                success: false,
                jobId,
                error: error.message,
            };
        }
        throw error;
    }
}
/**
 * Atomic dispatch + confirm operation.
 * Combines sending, evidence recording, and confirmation.
 *
 * @param jobId - Job ID.
 * @param sendFn - Function that sends the dispatch and returns Twilio SID.
 * @param ctx - Context.
 */
async function atomicDispatchAndConfirm(jobId, sendFn, ctx) {
    const { traceId } = ctx;
    try {
        // 1. Send dispatch
        logger.info('AtomicDispatch: Sending', {
            component: 'atomicDispatch',
            event: 'sending',
            traceId,
            jobId,
        });
        const { twilioSid, merchantPhone, messageBody } = await sendFn();
        // 2. Record evidence (BEFORE confirm)
        await recordDispatchEvidence(jobId, {
            twilioSid,
            dispatchedAt: new Date(),
            merchantPhone,
            messageBody,
            traceId,
        });
        // 3. Confirm with evidence
        return confirmWithEvidence(jobId, { traceId });
    }
    catch (error) {
        logger.error('AtomicDispatch: Failed', {
            component: 'atomicDispatch',
            event: 'dispatch_failed',
            traceId,
            jobId,
            error: String(error),
        });
        return {
            success: false,
            jobId,
            error: String(error),
        };
    }
}
//# sourceMappingURL=atomicDispatch.js.map