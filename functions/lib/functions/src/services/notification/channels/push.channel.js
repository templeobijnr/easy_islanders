"use strict";
/**
 * Push Notification Channel (STUB)
 *
 * This channel is a placeholder for Sprint 3 when the mobile app exists.
 * Currently always returns "not available".
 *
 * TODO (Sprint 3):
 * 1. Check merchantProfile.fcmTokens to determine availability
 * 2. Use Firebase Admin SDK to send FCM messages
 * 3. Handle token refresh and invalid tokens
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationChannel = void 0;
class PushNotificationChannel {
    constructor() {
        this.name = 'push';
    }
    /**
     * Check if push notifications are available for this merchant.
     *
     * TODO (Sprint 3):
     * - Look up merchant profile in Firestore
     * - Check if fcmTokens array is non-empty
     * - Return true if merchant has registered devices
     */
    async isAvailable(_merchantTarget) {
        // Push not implemented yet - always unavailable
        return false;
    }
    /**
     * Send push notification to merchant.
     *
     * TODO (Sprint 3):
     * - Get FCM tokens from merchant profile
     * - Build notification payload (title, body, data)
     * - Send via admin.messaging().sendMulticast()
     * - Handle expired tokens gracefully
     */
    async send(_job, _merchantTarget, _options) {
        // Push not implemented yet
        return {
            success: false,
            messageId: '',
            failureReason: 'Push notifications not yet implemented (Sprint 3)',
        };
    }
}
exports.PushNotificationChannel = PushNotificationChannel;
//# sourceMappingURL=push.channel.js.map