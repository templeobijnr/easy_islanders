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

import type { Job, MerchantTarget } from '@askmerve/shared';
import type {
    NotificationChannel,
    NotificationOptions,
    NotificationResult,
} from '../notification.types';

export class PushNotificationChannel implements NotificationChannel {
    readonly name = 'push' as const;

    /**
     * Check if push notifications are available for this merchant.
     *
     * TODO (Sprint 3):
     * - Look up merchant profile in Firestore
     * - Check if fcmTokens array is non-empty
     * - Return true if merchant has registered devices
     */
    async isAvailable(_merchantTarget: MerchantTarget): Promise<boolean> {
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
    async send(
        _job: Job,
        _merchantTarget: MerchantTarget,
        _options?: NotificationOptions
    ): Promise<NotificationResult> {
        // Push not implemented yet
        return {
            success: false,
            messageId: '',
            failureReason: 'Push notifications not yet implemented (Sprint 3)',
        };
    }
}
