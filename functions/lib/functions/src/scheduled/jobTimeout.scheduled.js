"use strict";
/**
 * Job Timeout Scheduled Function
 *
 * Runs periodically to expire jobs that have exceeded their timeout.
 * Uses the Simple Job Service's runTimeoutSweep function.
 *
 * @see simpleJob.service.ts for timeout logic
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
exports.checkJobTimeouts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const simpleJob_service_1 = require("../services/simpleJob.service");
/**
 * Scheduled function to expire timed-out jobs.
 * Runs every 2 minutes to catch timeouts promptly.
 */
exports.checkJobTimeouts = (0, scheduler_1.onSchedule)({
    schedule: 'every 2 minutes',
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
}, async () => {
    const traceId = `job-timeout-${Date.now()}`;
    logger.info('[JobTimeout] Starting scheduled timeout check', { traceId });
    try {
        const result = await (0, simpleJob_service_1.runTimeoutSweep)({
            traceId,
            limit: 100,
        });
        logger.info('[JobTimeout] Timeout check complete', {
            traceId,
            processed: result.processed,
            expired: result.expired.length,
            errors: result.errors.length,
        });
        if (result.errors.length > 0) {
            logger.warn('[JobTimeout] Some jobs failed to expire', {
                traceId,
                errors: result.errors,
            });
        }
    }
    catch (error) {
        logger.error('[JobTimeout] Timeout check failed', {
            traceId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
});
//# sourceMappingURL=jobTimeout.scheduled.js.map