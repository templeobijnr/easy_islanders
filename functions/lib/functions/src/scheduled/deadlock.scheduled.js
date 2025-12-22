"use strict";
/**
 * Deadlock Detection Scheduled Function (ARCH-02)
 *
 * Runs every 15 minutes to detect and release stuck jobs.
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
exports.checkDeadlocks = void 0;
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const deadlock_service_1 = require("../services/deadlock.service");
/**
 * Scheduled function to check for stuck jobs.
 * Runs every 15 minutes.
 */
exports.checkDeadlocks = functions
    .runWith({ timeoutSeconds: 120, memory: '256MB' })
    .pubsub.schedule('every 15 minutes')
    .onRun(async () => {
    const traceId = `deadlock-check-${Date.now()}`;
    logger.info('Deadlock scheduled check started', { traceId });
    try {
        const result = await (0, deadlock_service_1.releaseStuckJobs)(traceId);
        if (result.jobsReleased > 0) {
            logger.warn('Deadlock: Jobs were auto-released', {
                traceId,
                jobsReleased: result.jobsReleased,
                releasedJobIds: result.releasedJobIds,
            });
        }
        return null;
    }
    catch (error) {
        logger.error('Deadlock scheduled check failed', {
            traceId,
            error: String(error),
        });
        throw error;
    }
});
//# sourceMappingURL=deadlock.scheduled.js.map