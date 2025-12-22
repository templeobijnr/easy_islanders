/**
 * WhatsApp Business Ops Handler
 * 
 * Handles messages from business owners/staff.
 * Routes structured booking replies to legacy handler, otherwise to ops agent.
 */

import { db } from '../../../config/firebase';
import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

// ============================================
// TYPES
// ============================================

export interface BusinessOpsRequest {
    actorId: string;
    businessId: string;
    phoneE164: string;
    text: string;
    messageSid?: string | null;
}

// ============================================
// BOOKING REPLY DETECTION
// ============================================

/**
 * Check if message matches structured booking reply protocol.
 * Format: YES CODE [PRICE] or NO CODE
 */
function isBookingReplyFormat(text: string): boolean {
    return /^(YES|NO)\s+[A-Za-z0-9]{4,}/i.test(text.trim());
}

// ============================================
// HANDLER
// ============================================

/**
 * Handle business ops message.
 * 
 * 1. If structured booking reply → delegate to booking handler
 * 2. Else → log and send friendly acknowledgment (future: business ops agent)
 */
export async function handleBusinessOpsMessage(req: BusinessOpsRequest): Promise<string> {
    const { actorId, businessId, phoneE164, text, messageSid } = req;

    logger.info('[BusinessOps] Processing message', {
        actorId,
        businessId,
        phoneE164,
        textPreview: text.slice(0, 50),
    });

    // Check for structured booking reply first
    if (isBookingReplyFormat(text)) {
        // Delegate to legacy booking handler
        // Import dynamically to avoid circular deps
        const { handleHostBookingReply } = await import('../../../controllers/twilio.controller.internal');
        const response = await handleHostBookingReply(phoneE164, text);
        if (response) {
            return response;
        }
    }

    // Log business ops message for future processing
    try {
        await db.collection('businessOpsMessages').add({
            actorId,
            businessId,
            phoneE164,
            text,
            messageSid: messageSid || null,
            processedAt: Timestamp.now(),
            status: 'acknowledged',
        });
    } catch (err) {
        logger.error('[BusinessOps] Failed to log message', err);
    }

    // For now, acknowledge receipt (future: route to business ops agent)
    return `Thanks! We received your message. A team member will respond shortly.`;
}
