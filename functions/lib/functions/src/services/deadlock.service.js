"use strict";
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
exports.releaseStuckJobs = releaseStuckJobs;
exports.isJobStuck = isJobStuck;
exports.getStuckJobCount = getStuckJobCount;
const firebase_1 = require("../config/firebase");
const logger = __importStar(require("firebase-functions/logger"));
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
 * Finds and releases stuck jobs.
 * Call this from a scheduled Cloud Function.
 *
 * @param traceId - Optional trace ID for logging correlation.
 * @returns Result summary.
 */
async function releaseStuckJobs(traceId) {
    var _a, _b, _c;
    const result = {
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
        const jobsRef = firebase_1.db.collection('jobs');
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
                        stuckSince: (_c = (_b = (_a = jobData.updatedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString(),
                    });
                }
                catch (error) {
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
    }
    catch (error) {
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
async function isJobStuck(jobId) {
    var _a, _b;
    try {
        const doc = await firebase_1.db.collection('jobs').doc(jobId).get();
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
        const updatedAt = (_b = (_a = data.updatedAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a);
        if (!updatedAt) {
            return true; // No updatedAt = definitely stuck
        }
        const stuckThreshold = Date.now() - STUCK_THRESHOLD_MS;
        return updatedAt.getTime() < stuckThreshold;
    }
    catch (error) {
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
async function getStuckJobCount() {
    const cutoffTime = new Date(Date.now() - STUCK_THRESHOLD_MS);
    let count = 0;
    for (const status of NON_TERMINAL_STATUSES) {
        const snapshot = await firebase_1.db
            .collection('jobs')
            .where('status', '==', status)
            .where('updatedAt', '<', cutoffTime)
            .count()
            .get();
        count += snapshot.data().count;
    }
    return count;
}
//# sourceMappingURL=deadlock.service.js.map