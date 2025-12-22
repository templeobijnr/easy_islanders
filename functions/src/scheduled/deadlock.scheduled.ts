/**
 * Deadlock Detection Scheduled Function (ARCH-02)
 *
 * Runs every 15 minutes to detect and release stuck jobs.
 *
 * @see Living Document Section 17.2.1 for invariants.
 */

import * as functions from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import { releaseStuckJobs } from '../services/deadlock.service';

/**
 * Scheduled function to check for stuck jobs.
 * Runs every 15 minutes.
 */
export const checkDeadlocks = functions
    .runWith({ timeoutSeconds: 120, memory: '256MB' })
    .pubsub.schedule('every 15 minutes')
    .onRun(async () => {
        const traceId = `deadlock-check-${Date.now()}`;

        logger.info('Deadlock scheduled check started', { traceId });

        try {
            const result = await releaseStuckJobs(traceId);

            if (result.jobsReleased > 0) {
                logger.warn('Deadlock: Jobs were auto-released', {
                    traceId,
                    jobsReleased: result.jobsReleased,
                    releasedJobIds: result.releasedJobIds,
                });
            }

            return null;
        } catch (error) {
            logger.error('Deadlock scheduled check failed', {
                traceId,
                error: String(error),
            });
            throw error;
        }
    });
