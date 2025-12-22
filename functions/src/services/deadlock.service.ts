/**
 * Deadlock Auto-Release Service (ARCH-02)
 *
 * Detects and releases jobs stuck in non-terminal states.
 *
 * INVARIANTS:
 * - Jobs in non-terminal state for > STUCK_THRESHOLD_MS are auto-released.
 * - Released jobs transition to 'timeout-review' status.
 * - Every auto-release is logged with job ID and previous state.
 * - This runs as a scheduled Cloud Function.
 *
 * FAILURE MODE:
 * - If release fails, job remains stuck (logged for manual intervention).
 * - Never auto-completes or auto-cancels — only moves to review queue.
 *
 * @see Living Document Section 17.2.1 for invariants.
 */

import { db } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

/**
 * Threshold for considering a job "stuck" (in milliseconds).
 */
const STUCK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Status that indicates a job needs human review due to timeout.
 */
const TIMEOUT_REVIEW_STATUS = 'timeout-review';

/**
 * Non-terminal statuses that can become stuck.
 */
const NON_TERMINAL_STATUSES = [
    'collecting',
    'confirming',
    'dispatching',
    'dispatched',
    'processing',
];

/**
 * Terminal statuses that are final and should not be touched.
 */
const TERMINAL_STATUSES = [
    'completed',
    'cancelled',
    'timeout-review',
    'failed',
];

/**
 * Result of a deadlock check.
 */
export interface DeadlockCheckResult {
    jobsChecked: number;
    jobsReleased: number;
    releasedJobIds: string[];
    errors: string[];
}

/**
 * Finds and releases stuck jobs.
 * Call this from a scheduled Cloud Function.
 *
 * @param traceId - Optional trace ID for logging correlation.
 * @returns Result summary.
 */
export async function releaseStuckJobs(
    traceId?: string
): Promise<DeadlockCheckResult> {
    const result: DeadlockCheckResult = {
        jobsChecked: 0,
        jobsReleased: 0,
        releasedJobIds: [],
        errors: [],
    };

    const cutoffTime = new Date(Date.now() - STUCK_THRESHOLD_MS);

    logger.info('Deadlock check started', {
        traceId,
        cutoffTime: cutoffTime.toISOString(),
        thresholdMs: STUCK_THRESHOLD_MS,
    });

    try {
        // Query jobs in non-terminal states that haven't been updated recently
        const jobsRef = db.collection('jobs');

        for (const status of NON_TERMINAL_STATUSES) {
            const query = jobsRef
                .where('status', '==', status)
                .where('updatedAt', '<', cutoffTime)
                .limit(100); // Process in batches

            const snapshot = await query.get();
            result.jobsChecked += snapshot.size;

            for (const doc of snapshot.docs) {
                const jobId = doc.id;
                const jobData = doc.data();
                const previousStatus = jobData.status;

                try {
                    await doc.ref.update({
                        status: TIMEOUT_REVIEW_STATUS,
                        previousStatus,
                        timeoutAt: new Date(),
                        timeoutReason: `Auto-released: stuck in '${previousStatus}' for > 1 hour`,
                        updatedAt: new Date(),
                    });

                    result.jobsReleased++;
                    result.releasedJobIds.push(jobId);

                    logger.warn('Deadlock: Job auto-released', {
                        traceId,
                        jobId,
                        previousStatus,
                        newStatus: TIMEOUT_REVIEW_STATUS,
                        stuckSince: jobData.updatedAt?.toDate?.()?.toISOString(),
                    });
                } catch (error) {
                    const errorMsg = `Failed to release job ${jobId}: ${String(error)}`;
                    result.errors.push(errorMsg);

                    logger.error('Deadlock: Failed to release job', {
                        traceId,
                        jobId,
                        previousStatus,
                        error: String(error),
                    });
                }
            }
        }

        logger.info('Deadlock check completed', {
            traceId,
            jobsChecked: result.jobsChecked,
            jobsReleased: result.jobsReleased,
            errors: result.errors.length,
        });

        return result;
    } catch (error) {
        logger.error('Deadlock check failed', {
            traceId,
            error: String(error),
        });

        result.errors.push(`Deadlock check failed: ${String(error)}`);
        return result;
    }
}

/**
 * Checks if a specific job is stuck.
 * Use this for on-demand checks.
 *
 * @param jobId - The job ID to check.
 * @returns True if job is stuck and should be released.
 */
export async function isJobStuck(jobId: string): Promise<boolean> {
    try {
        const doc = await db.collection('jobs').doc(jobId).get();

        if (!doc.exists) {
            return false;
        }

        const data = doc.data();
        if (!data) {
            return false;
        }

        // Check if in terminal state
        if (TERMINAL_STATUSES.includes(data.status)) {
            return false;
        }

        // Check if updated recently
        const updatedAt = data.updatedAt?.toDate?.();
        if (!updatedAt) {
            return true; // No updatedAt = definitely stuck
        }

        const stuckThreshold = Date.now() - STUCK_THRESHOLD_MS;
        return updatedAt.getTime() < stuckThreshold;
    } catch (error) {
        logger.error('isJobStuck check failed', {
            jobId,
            error: String(error),
        });
        return false;
    }
}

/**
 * Gets the current stuck job count for monitoring.
 */
export async function getStuckJobCount(): Promise<number> {
    const cutoffTime = new Date(Date.now() - STUCK_THRESHOLD_MS);
    let count = 0;

    for (const status of NON_TERMINAL_STATUSES) {
        const snapshot = await db
            .collection('jobs')
            .where('status', '==', status)
            .where('updatedAt', '<', cutoffTime)
            .count()
            .get();

        count += snapshot.data().count;
    }

    return count;
}
