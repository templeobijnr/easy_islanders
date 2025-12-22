"use strict";
/**
 * CAS Confirmation Guard (RUN-05)
 *
 * Compare-and-Swap enforcement for job confirmation.
 *
 * INVARIANTS:
 * - Confirm requires current status == 'collecting'.
 * - Atomic check + update to prevent race conditions.
 * - Double-confirm returns idempotent success.
 * - Stale/concurrent confirms rejected with typed error.
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
exports.CASError = void 0;
exports.casConfirm = casConfirm;
exports.casUpdateStatus = casUpdateStatus;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const stateEnforcement_1 = require("./stateEnforcement");
/**
 * CAS error for failed confirmation.
 */
class CASError extends Error {
    constructor(jobId, expectedStatus, actualStatus, traceId) {
        super(`CAS failed: expected '${expectedStatus}', found '${actualStatus}'`);
        this.jobId = jobId;
        this.expectedStatus = expectedStatus;
        this.actualStatus = actualStatus;
        this.traceId = traceId;
        this.code = 'CAS_FAILED';
        this.httpStatus = 409;
        this.retryable = false;
        this.name = 'CASError';
    }
}
exports.CASError = CASError;
/**
 * Performs atomic compare-and-swap confirmation on a job.
 *
 * @param jobId - The job to confirm.
 * @param targetStatus - The target status after confirmation.
 * @param ctx - Context for logging.
 * @returns CAS result.
 */
async function casConfirm(jobId, targetStatus, ctx) {
    const { traceId, userId } = ctx;
    logger.info('CAS: Confirmation attempt', {
        component: 'casConfirmation',
        event: 'confirm_attempt',
        traceId,
        jobId,
        targetStatus,
        userId,
    });
    const jobRef = firebase_1.db.collection('jobs').doc(jobId);
    return firebase_1.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(jobRef);
        if (!doc.exists) {
            logger.error('CAS: Job not found', {
                component: 'casConfirmation',
                event: 'job_not_found',
                traceId,
                jobId,
            });
            throw new Error(`Job ${jobId} not found`);
        }
        const data = doc.data();
        const currentStatus = (0, stateEnforcement_1.canonicalizeStatus)(data.status || 'unknown');
        // Idempotent case: already at target status
        if (currentStatus === targetStatus) {
            logger.info('CAS: Already at target status (idempotent)', {
                component: 'casConfirmation',
                event: 'idempotent_success',
                traceId,
                jobId,
                status: currentStatus,
            });
            return {
                success: true,
                jobId,
                previousStatus: currentStatus,
                newStatus: targetStatus,
                wasIdempotent: true,
            };
        }
        // CAS check: must be 'collecting' to confirm
        if (currentStatus !== 'collecting') {
            logger.error('CAS: Status mismatch - REJECTED', {
                component: 'casConfirmation',
                event: 'cas_failed',
                traceId,
                jobId,
                expectedStatus: 'collecting',
                actualStatus: currentStatus,
            });
            throw new CASError(jobId, 'collecting', currentStatus, traceId);
        }
        // Perform atomic update
        transaction.update(jobRef, {
            status: targetStatus,
            previousStatus: currentStatus,
            confirmingAt: new Date(),
            updatedAt: new Date(),
            confirmCASTraceId: traceId,
        });
        logger.info('CAS: Confirmation succeeded', {
            component: 'casConfirmation',
            event: 'confirm_success',
            traceId,
            jobId,
            previousStatus: currentStatus,
            newStatus: targetStatus,
        });
        return {
            success: true,
            jobId,
            previousStatus: currentStatus,
            newStatus: targetStatus,
            wasIdempotent: false,
        };
    });
}
/**
 * Atomically updates job status with CAS protection.
 * More generic version for any status transition.
 */
async function casUpdateStatus(jobId, expectedStatus, newStatus, ctx) {
    const { traceId } = ctx;
    const jobRef = firebase_1.db.collection('jobs').doc(jobId);
    return firebase_1.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(jobRef);
        if (!doc.exists) {
            throw new Error(`Job ${jobId} not found`);
        }
        const currentStatus = (0, stateEnforcement_1.canonicalizeStatus)(doc.data().status || 'unknown');
        // Idempotent case
        if (currentStatus === newStatus) {
            return {
                success: true,
                jobId,
                previousStatus: currentStatus,
                newStatus,
                wasIdempotent: true,
            };
        }
        // CAS check
        if (currentStatus !== expectedStatus) {
            throw new CASError(jobId, expectedStatus, currentStatus, traceId);
        }
        // Atomic update
        transaction.update(jobRef, {
            status: newStatus,
            previousStatus: currentStatus,
            updatedAt: new Date(),
            casTraceId: traceId,
        });
        return {
            success: true,
            jobId,
            previousStatus: currentStatus,
            newStatus,
            wasIdempotent: false,
        };
    });
}
//# sourceMappingURL=casConfirmation.js.map