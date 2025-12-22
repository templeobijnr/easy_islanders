"use strict";
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
exports.expireHolds = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const transaction_repository_1 = require("../repositories/transaction.repository");
/**
 * Expire holds that have passed their holdExpiresAt.
 * Runs every 1 minute to ensure timely expiry.
 */
exports.expireHolds = (0, scheduler_1.onSchedule)({
    schedule: 'every 1 minutes',
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
}, async () => {
    logger.info('[ExpireHolds] Starting expiry check...');
    try {
        // Get all expired holds
        const expiredHolds = await transaction_repository_1.transactionRepository.getExpiredHolds(100);
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
                await transaction_repository_1.transactionRepository.expireHold(businessId, txId);
                successCount++;
                logger.info(`[ExpireHolds] Expired hold: ${txId} (business: ${businessId})`);
            }
            catch (err) {
                errorCount++;
                logger.error(`[ExpireHolds] Failed to expire ${txId}:`, err.message);
            }
        }
        logger.info(`[ExpireHolds] Complete. Success: ${successCount}, Errors: ${errorCount}`);
    }
    catch (err) {
        logger.error('[ExpireHolds] Worker failed:', err);
        throw err; // Rethrow to mark function as failed
    }
});
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
//# sourceMappingURL=expiry.scheduled.js.map