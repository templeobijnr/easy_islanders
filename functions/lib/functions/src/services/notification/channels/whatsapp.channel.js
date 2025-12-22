"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppNotificationChannel = void 0;
const errors_1 = require("../../../utils/errors");
const twilio_service_1 = require("../../twilio.service");
// =============================================================================
// MESSAGE BUILDING
// =============================================================================
/**
 * Build WhatsApp message body for a job.
 * Uses the same format as the existing dispatch.ts implementation.
 */
function buildJobMessageBody(job, options) {
    var _a, _b;
    const lines = [];
    const data = job.actionData;
    // Header
    lines.push(`📋 New ${job.actionType.replace(/_/g, ' ')} request`);
    lines.push(`🔖 Code: ${job.jobCode || 'N/A'}`);
    // Items (for orders)
    if (data.items && Array.isArray(data.items)) {
        const itemList = data.items
            .slice(0, 3)
            .map((i) => `${i.quantity}x ${i.name}`)
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
    if ((_a = data.pickupLocation) === null || _a === void 0 ? void 0 : _a.address) {
        lines.push(`📍 From: ${data.pickupLocation.address}`);
    }
    if ((_b = data.deliveryLocation) === null || _b === void 0 ? void 0 : _b.address) {
        lines.push(`📍 To: ${data.deliveryLocation.address}`);
    }
    // Date/Time
    if (data.dateTime) {
        lines.push(`📅 ${new Date(data.dateTime).toLocaleString()}`);
    }
    // App download CTA (only if merchant doesn't have the app)
    if (options === null || options === void 0 ? void 0 : options.includeAppDownloadCta) {
        lines.push('');
        lines.push('📱 Get faster notifications! Download our app:');
        lines.push('https://askmerve.app/download');
    }
    return lines.join('\n');
}
// =============================================================================
// CHANNEL IMPLEMENTATION
// =============================================================================
class WhatsAppNotificationChannel {
    constructor() {
        this.name = 'whatsapp';
    }
    /**
     * WhatsApp is available if the merchant has a phone number.
     */
    async isAvailable(merchantTarget) {
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
    async send(job, merchantTarget, options) {
        try {
            // Resolve phone number
            let merchantPhone;
            if (merchantTarget.type === 'unlisted') {
                merchantPhone = merchantTarget.phone;
            }
            else {
                // For listed merchants, phone must be passed via job metadata
                // or looked up from listing. The dispatch endpoint handles this.
                // This channel receives the resolved phone via merchantTarget.
                throw new Error('Listed merchant phone resolution must happen before channel send');
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
            const result = await (0, twilio_service_1.sendWhatsApp)(merchantPhone, fullMessage, {
                role: 'merchant',
            });
            return {
                success: true,
                messageId: (result === null || result === void 0 ? void 0 : result.sid) || `whatsapp-${Date.now()}`,
            };
        }
        catch (error) {
            console.error('[WhatsAppChannel] Send failed:', (0, errors_1.getErrorMessage)(error));
            return {
                success: false,
                messageId: '',
                failureReason: (0, errors_1.getErrorMessage)(error) || 'Unknown WhatsApp error',
            };
        }
    }
}
exports.WhatsAppNotificationChannel = WhatsAppNotificationChannel;
//# sourceMappingURL=whatsapp.channel.js.map