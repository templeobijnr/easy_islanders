import { getErrorMessage } from '../utils/errors';
/**
 * Scheduled Expiry Worker
 * 
 * Runs every minute to:
 * 1. Expire holds that have passed their holdExpiresAt
 * 2. (Optional) Cleanup orphan drafts older than 1 hour
 * 
 * IMPORTANT: Firestore TTL deletion is NOT immediate and should NOT be relied
 * upon for correctness. This worker is the authoritative expiry mechanism.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { transactionRepository } from '../repositories/transaction.repository';

/**
 * Expire holds that have passed their holdExpiresAt.
 * Runs every 1 minute to ensure timely expiry.
 */
export const expireHolds = onSchedule(
    {
        schedule: 'every 1 minutes',
        region: 'europe-west1',
        timeoutSeconds: 60,
        memory: '256MiB',
    },
    async () => {
        logger.info('[ExpireHolds] Starting expiry check...');

        try {
            // Get all expired holds
            const expiredHolds = await transactionRepository.getExpiredHolds(100);

            if (expiredHolds.length === 0) {
                logger.info('[ExpireHolds] No expired holds found.');
                return;
            }

            logger.info(`[ExpireHolds] Found ${expiredHolds.length} expired holds to process.`);

            // Process each expired hold
            let successCount = 0;
            let errorCount = 0;

            for (const { businessId, txId } of expiredHolds) {
                try {
                    await transactionRepository.expireHold(businessId, txId);
                    successCount++;
                    logger.info(`[ExpireHolds] Expired hold: ${txId} (business: ${businessId})`);
                } catch (err: unknown) {
                    errorCount++;
                    logger.error(`[ExpireHolds] Failed to expire ${txId}:`, getErrorMessage(err));
                }
            }

            logger.info(`[ExpireHolds] Complete. Success: ${successCount}, Errors: ${errorCount}`);

        } catch (err: unknown) {
            logger.error('[ExpireHolds] Worker failed:', err);
            throw err; // Rethrow to mark function as failed
        }
    }
);

/**
 * Cleanup orphan drafts that were never converted to holds.
 * Runs every 10 minutes to clean up abandoned drafts.
 *
 * Note: This is less critical than expiry but helps prevent accumulation
 * of draft transactions that users started but never completed.
 */
// export const cleanupOrphanDrafts = onSchedule(
//     {
//         schedule: 'every 10 minutes',
//         region: 'europe-west1',
//         timeoutSeconds: 120,
//         memory: '256MiB',
//     },
//     async () => {
//         logger.info('[CleanupDrafts] Starting orphan draft cleanup...');
//         
//         // Implementation: Query drafts older than 1 hour and mark as failed
//         // This is optional for Sprint 1 - uncomment when ready
//     }
// );
