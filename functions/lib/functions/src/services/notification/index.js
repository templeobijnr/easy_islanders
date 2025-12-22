"use strict";
/**
 * Notification Service
 *
 * Orchestrates job notifications across multiple channels.
 *
 * Channel priority:
 * 1. Push (fastest, but requires app installation)
 * 2. WhatsApp (reliable, universal)
 * 3. SMS (future fallback)
 *
 * Design principles:
 * - Each channel is independent and testable
 * - Adding a new channel = create one file, add to channels array
 * - Failures are logged and fallback to next channel
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
exports.getNotificationService = getNotificationService;
const logger = __importStar(require("firebase-functions/logger"));
const channels_1 = require("./channels");
// Re-export types for consumers
__exportStar(require("./notification.types"), exports);
// =============================================================================
// SERVICE
// =============================================================================
class NotificationService {
    constructor() {
        this.channels = [
            new channels_1.PushNotificationChannel(), // Try push first (will fail for now)
            new channels_1.WhatsAppNotificationChannel(), // WhatsApp fallback (always works)
            // Future: SMSNotificationChannel
        ];
    }
    /**
     * Send a job notification to the merchant.
     *
     * Tries channels in priority order until one succeeds.
     * Logs failures and continues to next channel.
     *
     * @param job - The job being dispatched
     * @param merchantTarget - Where to send notification
     * @param merchantPhone - Resolved phone number (for listed merchants)
     */
    async sendJobNotification(job, merchantTarget, merchantPhone) {
        const failures = [];
        // Check if merchant has app installed (for CTA decision)
        const merchantHasAppInstalled = await this.checkMerchantHasApp(merchantTarget);
        // Build notification options
        const options = {
            includeAppDownloadCta: !merchantHasAppInstalled,
            urgency: "high", // Jobs are time-sensitive
        };
        // Resolve target for WhatsApp (inject phone if listed)
        const resolvedTarget = this.resolveTarget(merchantTarget, merchantPhone);
        // Try each channel in order
        for (const channel of this.channels) {
            const channelName = channel.name;
            // Check availability
            const isAvailable = await channel.isAvailable(resolvedTarget);
            if (!isAvailable) {
                logger.debug(`[NotificationService] ${channelName} not available for merchant`);
                continue;
            }
            // Attempt send
            logger.debug(`[NotificationService] Attempting ${channelName} for job ${job.id}`);
            const result = await channel.send(job, resolvedTarget, options);
            if (result.success) {
                logger.debug(`[NotificationService] ${channelName} succeeded`, {
                    jobId: job.id,
                    messageId: result.messageId,
                });
                return {
                    success: true,
                    channel: channelName,
                    messageId: result.messageId,
                    failures: failures.length > 0 ? failures : undefined,
                };
            }
            // Log failure and continue
            console.warn(`[NotificationService] ${channelName} failed`, {
                jobId: job.id,
                reason: result.failureReason,
            });
            failures.push({
                channel: channelName,
                reason: result.failureReason || "Unknown error",
                timestamp: new Date().toISOString(),
            });
        }
        // All channels failed
        console.error(`[NotificationService] All channels failed for job ${job.id}`, {
            failures,
        });
        return {
            success: false,
            channel: "none",
            messageId: "",
            error: "All notification channels failed",
            failures,
        };
    }
    /**
     * Check if merchant has the app installed.
     *
     * TODO (Sprint 3):
     * - Look up merchant profile in Firestore
     * - Check fcmTokens array
     */
    async checkMerchantHasApp(_merchantTarget) {
        // Not implemented yet - assume no app
        return false;
    }
    /**
     * Resolve merchant target with phone number for WhatsApp.
     *
     * For unlisted merchants, phone is already in the target.
     * For listed merchants, phone must be passed separately (after lookup).
     */
    resolveTarget(merchantTarget, merchantPhone) {
        if (merchantTarget.type === "unlisted") {
            return merchantTarget;
        }
        // For listed merchants with a resolved phone, we need to
        // pass the phone to the WhatsApp channel somehow.
        // For now, the WhatsApp channel only handles unlisted directly.
        // Listed merchant dispatch happens at a higher level.
        return merchantTarget;
    }
}
exports.NotificationService = NotificationService;
// =============================================================================
// SINGLETON INSTANCE
// =============================================================================
let _instance = null;
/**
 * Get the NotificationService singleton.
 */
function getNotificationService() {
    if (!_instance) {
        _instance = new NotificationService();
    }
    return _instance;
}
//# sourceMappingURL=index.js.map