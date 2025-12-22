"use strict";
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTaxiRequestTimeouts = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
const repo = __importStar(require("../repositories/taxi.repository"));
const twilio_service_1 = require("../services/twilio.service");
/**
 * Scheduled function to check for expired taxi requests
 * Runs every 2 minutes
 */
exports.checkTaxiRequestTimeouts = (0, scheduler_1.onSchedule)({
    schedule: 'every 2 minutes',
    region: 'europe-west1',
    timeoutSeconds: 120,
}, async (event) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    try {
        // Query pending requests older than 5 mins
        const snapshot = await firebase_1.db.collection('taxi_requests')
            .where('status', '==', 'pending')
            .where('createdAt', '<', fiveMinutesAgo)
            .get();
        logger.info(`Found ${snapshot.size} expired taxi requests`);
        // Process each expired request
        const promises = snapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Mark as expired
            await repo.markRequestExpired(doc.id);
            // Notify customer
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
                try {
                    await (0, twilio_service_1.sendWhatsApp)(data.customerPhone, `Sorry, no drivers are available at the moment. Please try again or consider pre-booking your ride.`);
                }
                catch (error) {
                    logger.error(`Failed to notify customer ${data.customerPhone}:`, error);
                }
            }
            else {
                logger.info(`Twilio not configured; skipping customer notification for request ${doc.id}`);
            }
            // Log for ops team monitoring
            logger.info(`Request ${doc.id} expired - no driver assigned`);
            // Optional: Alert ops team
            // await alertOpsTeam(`Missed booking: ${doc.id}`);
        });
        await Promise.all(promises);
        logger.info(`Processed ${promises.length} expired requests`);
    }
    catch (error) {
        logger.error('Error checking taxi request timeouts:', error);
        throw error;
    }
});
/**
 * Helper function to alert ops team (future implementation)
 */
/* Commented out until implemented
async function alertOpsTeam(message: string): Promise<void> {
  // TODO: Implement ops team alerting
  // Could be WhatsApp to admin, Slack webhook, email, etc.
  console.log(`OPS ALERT: ${message}`);
}
*/
// Export the status change trigger
__exportStar(require("./taxi-status.trigger"), exports);
//# sourceMappingURL=taxi.triggers.js.map