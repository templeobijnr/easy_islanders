/**
 * Notification Types
 *
 * Shared types for the notification service.
 * Designed for easy extension when adding new channels.
 */

import type { Job, MerchantTarget } from '@askmerve/shared';

// =============================================================================
// CHANNEL TYPES
// =============================================================================

/**
 * Supported notification channels.
 * Add new channels here as they're implemented.
 */
export type NotificationChannelName = 'push' | 'whatsapp' | 'sms';

/**
 * Options passed to notification channels.
 */
export interface NotificationOptions {
    /**
     * If true, append a "Download our app" CTA to the message.
     * Used when merchant doesn't have the app installed.
     */
    includeAppDownloadCta?: boolean;

    /**
     * Message urgency. Some channels (like push) support priority levels.
     */
    urgency?: 'normal' | 'high';
}

/**
 * Result of a single channel send attempt.
 */
export interface NotificationResult {
    /** Whether the message was sent successfully */
    success: boolean;

    /** Message ID from the channel provider (e.g., Twilio SID, FCM message ID) */
    messageId: string;

    /** If failed, reason for failure */
    failureReason?: string;
}

// =============================================================================
// SERVICE TYPES
// =============================================================================

/**
 * Result of the orchestrated notification dispatch.
 * Includes which channel was used and overall status.
 */
export interface NotificationDispatchResult {
    /** Whether notification was delivered via any channel */
    success: boolean;

    /** Which channel delivered the notification */
    channel: NotificationChannelName | 'none';

    /** Message ID from the successful channel */
    messageId: string;

    /** Error message if all channels failed */
    error?: string;

    /**
     * Record of failed attempts (for debugging).
     * Only populated if there were failures before success.
     */
    failures?: Array<{
        channel: NotificationChannelName;
        reason: string;
        timestamp: string;
    }>;
}

// =============================================================================
// CHANNEL INTERFACE
// =============================================================================

/**
 * Interface that all notification channels must implement.
 *
 * To add a new channel:
 * 1. Create a new file in channels/ that implements this interface
 * 2. Add the channel to NotificationService.channels array
 * 3. Done - no other changes needed
 */
export interface NotificationChannel {
    /** Unique name of this channel */
    readonly name: NotificationChannelName;

    /**
     * Check if this channel is available for the given merchant.
     *
     * E.g., push is only available if merchant has FCM tokens.
     * WhatsApp is available if merchant has a phone number.
     */
    isAvailable(merchantTarget: MerchantTarget): Promise<boolean>;

    /**
     * Send the notification via this channel.
     *
     * @param job - The job being dispatched
     * @param merchantTarget - Where to send the notification
     * @param options - Optional settings for this send
     */
    send(
        job: Job,
        merchantTarget: MerchantTarget,
        options?: NotificationOptions
    ): Promise<NotificationResult>;
}
