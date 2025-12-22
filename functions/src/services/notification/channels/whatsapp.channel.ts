import { getErrorMessage } from '../../../utils/errors';
/**
 * WhatsApp Notification Channel
 *
 * Wraps the existing Twilio integration to implement NotificationChannel.
 * NO CHANGES to existing WhatsApp behavior - just abstraction.
 */

import type { Job, MerchantTarget } from '@askmerve/shared';
import { sendWhatsApp } from '../../twilio.service';
import type {
    NotificationChannel,
    NotificationOptions,
    NotificationResult,
} from '../notification.types';

// =============================================================================
// MESSAGE BUILDING
// =============================================================================

/**
 * Build WhatsApp message body for a job.
 * Uses the same format as the existing dispatch.ts implementation.
 */
function buildJobMessageBody(job: Job, options?: NotificationOptions): string {
    const lines: string[] = [];
    const data = job.actionData as Record<string, any>;

    // Header
    lines.push(`📋 New ${job.actionType.replace(/_/g, ' ')} request`);
    lines.push(`🔖 Code: ${job.jobCode || 'N/A'}`);

    // Items (for orders)
    if (data.items && Array.isArray(data.items)) {
        const itemList = data.items
            .slice(0, 3)
            .map((i: any) => `${i.quantity}x ${i.name}`)
            .join(', ');
        lines.push(`📦 ${itemList}`);
    }

    // Passengers (for taxi)
    if (data.passengerCount) {
        lines.push(`👥 ${data.passengerCount} passengers`);
    }

    // Guests (for reservations)
    if (data.guestCount) {
        lines.push(`👥 ${data.guestCount} guests`);
    }

    // Locations
    if (data.pickupLocation?.address) {
        lines.push(`📍 From: ${data.pickupLocation.address}`);
    }
    if (data.deliveryLocation?.address) {
        lines.push(`📍 To: ${data.deliveryLocation.address}`);
    }

    // Date/Time
    if (data.dateTime) {
        lines.push(`📅 ${new Date(data.dateTime).toLocaleString()}`);
    }

    // App download CTA (only if merchant doesn't have the app)
    if (options?.includeAppDownloadCta) {
        lines.push('');
        lines.push('📱 Get faster notifications! Download our app:');
        lines.push('https://askmerve.app/download');
    }

    return lines.join('\n');
}

// =============================================================================
// CHANNEL IMPLEMENTATION
// =============================================================================

export class WhatsAppNotificationChannel implements NotificationChannel {
    readonly name = 'whatsapp' as const;

    /**
     * WhatsApp is available if the merchant has a phone number.
     */
    async isAvailable(merchantTarget: MerchantTarget): Promise<boolean> {
        if (merchantTarget.type === 'listing') {
            // For listed merchants, we need to look up the listing's phone
            // This will be checked in the main send() flow
            return true;
        }

        if (merchantTarget.type === 'unlisted') {
            // Unlisted merchants must have a phone
            return Boolean(merchantTarget.phone);
        }

        return false;
    }

    /**
     * Send WhatsApp message to merchant.
     * Reuses existing Twilio integration.
     */
    async send(
        job: Job,
        merchantTarget: MerchantTarget,
        options?: NotificationOptions
    ): Promise<NotificationResult> {
        try {
            // Resolve phone number
            let merchantPhone: string;

            if (merchantTarget.type === 'unlisted') {
                merchantPhone = merchantTarget.phone;
            } else {
                // For listed merchants, phone must be passed via job metadata
                // or looked up from listing. The dispatch endpoint handles this.
                // This channel receives the resolved phone via merchantTarget.
                throw new Error(
                    'Listed merchant phone resolution must happen before channel send'
                );
            }

            // Build message
            const messageBody = buildJobMessageBody(job, options);

            // Add action instructions for unlisted merchants
            let fullMessage = messageBody;
            if (merchantTarget.type === 'unlisted') {
                const merchantName = merchantTarget.name || 'Merchant';
                fullMessage += `\n\nHi ${merchantName}, please reply:\n✅ YES to accept\n❌ NO to decline\n\n(Job Code: ${job.jobCode})`;
            }

            // Send via existing Twilio service
            const result = await sendWhatsApp(merchantPhone, fullMessage, {
                role: 'merchant',
            });

            return {
                success: true,
                messageId: result?.sid || `whatsapp-${Date.now()}`,
            };
        } catch (error: unknown) {
            console.error('[WhatsAppChannel] Send failed:', getErrorMessage(error));

            return {
                success: false,
                messageId: '',
                failureReason: getErrorMessage(error) || 'Unknown WhatsApp error',
            };
        }
    }
}
