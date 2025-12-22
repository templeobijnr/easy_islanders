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

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';
import { canonicalizeStatus, JobStatus } from './stateEnforcement';

/**
 * CAS error for failed confirmation.
 */
export class CASError extends Error {
    public readonly code = 'CAS_FAILED';
    public readonly httpStatus = 409;
    public readonly retryable = false;

    constructor(
        public readonly jobId: string,
        public readonly expectedStatus: JobStatus,
        public readonly actualStatus: JobStatus,
        public readonly traceId: string
    ) {
        super(`CAS failed: expected '${expectedStatus}', found '${actualStatus}'`);
        this.name = 'CASError';
    }
}

/**
 * Result of CAS confirmation.
 */
export interface CASResult {
    success: boolean;
    jobId: string;
    previousStatus: JobStatus;
    newStatus: JobStatus;
    wasIdempotent: boolean;
}

/**
 * Performs atomic compare-and-swap confirmation on a job.
 *
 * @param jobId - The job to confirm.
 * @param targetStatus - The target status after confirmation.
 * @param ctx - Context for logging.
 * @returns CAS result.
 */
export async function casConfirm(
    jobId: string,
    targetStatus: JobStatus,
    ctx: { traceId: string; userId?: string }
): Promise<CASResult> {
    const { traceId, userId } = ctx;

    logger.info('CAS: Confirmation attempt', {
        component: 'casConfirmation',
        event: 'confirm_attempt',
        traceId,
        jobId,
        targetStatus,
        userId,
    });

    const jobRef = db.collection('jobs').doc(jobId);

    return db.runTransaction(async (transaction) => {
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

        const data = doc.data()!;
        const currentStatus = canonicalizeStatus(data.status || 'unknown');

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
export async function casUpdateStatus(
    jobId: string,
    expectedStatus: JobStatus,
    newStatus: JobStatus,
    ctx: { traceId: string }
): Promise<CASResult> {
    const { traceId } = ctx;
    const jobRef = db.collection('jobs').doc(jobId);

    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(jobRef);

        if (!doc.exists) {
            throw new Error(`Job ${jobId} not found`);
        }

        const currentStatus = canonicalizeStatus(doc.data()!.status || 'unknown');

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
