import { getErrorMessage } from '../utils/errors';
/**
 * Transaction Events Triggers
 * 
 * Listen for transaction events and send notifications.
 * Decoupled from the transaction primitives for reliability.
 * 
 * IMPORTANT: This trigger must be idempotent because Firestore
 * triggers are at-least-once delivery.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

// Collection for notification deduplication
const NOTIFICATIONS_SENT_COLLECTION = 'notificationsSent';

/**
 * Generate a deduplication key for a notification.
 */
function getNotificationDedupeKey(
    txId: string,
    eventId: string,
    notificationType: string,
    recipient: string
): string {
    return `${txId}:${eventId}:${notificationType}:${recipient}`;
}

/**
 * Check if notification was already sent (idempotency).
 */
async function wasNotificationSent(dedupeKey: string): Promise<boolean> {
    const doc = await db.collection(NOTIFICATIONS_SENT_COLLECTION).doc(dedupeKey).get();
    return doc.exists;
}

/**
 * Mark notification as sent (for idempotency).
 */
async function markNotificationSent(dedupeKey: string): Promise<void> {
    await db.collection(NOTIFICATIONS_SENT_COLLECTION).doc(dedupeKey).set({
        sentAt: Timestamp.now(),
        createdAt: Timestamp.now(),
    });
}

/**
 * Listen for new transaction events and send notifications.
 * 
 * Path: businesses/{businessId}/transactions/{txId}/events/{eventId}
 */
export const onTransactionEvent = onDocumentCreated(
    {
        document: 'businesses/{businessId}/transactions/{txId}/events/{eventId}',
        region: 'europe-west1',
    },
    async (event) => {
        const eventData = event.data?.data();
        if (!eventData) {
            logger.warn('[TxEvent] No event data found');
            return;
        }

        const { businessId, txId, eventId } = event.params;
        const eventType = eventData.type;

        logger.info(`[TxEvent] Processing: ${eventType} for tx=${txId}`, { businessId, eventId });

        try {
            // Load the parent transaction for details
            const txDoc = await event.data?.ref.parent.parent?.get();
            const tx = txDoc?.data();

            if (!tx) {
                logger.warn(`[TxEvent] Transaction not found: ${txId}`);
                return;
            }

            // Handle different event types
            switch (eventType) {
                case 'confirmed':
                    await handleConfirmedEvent(tx, eventData, businessId, txId, eventId);
                    break;

                case 'cancelled':
                    await handleCancelledEvent(tx, eventData, businessId, txId, eventId);
                    break;

                case 'expired':
                    await handleExpiredEvent(tx, eventData, businessId, txId, eventId);
                    break;

                default:
                    logger.info(`[TxEvent] No handler for event type: ${eventType}`);
            }

        } catch (err: unknown) {
            logger.error(`[TxEvent] Error processing ${eventType}:`, err);
            // Don't rethrow - let the function complete to avoid infinite retries
        }
    }
);

/**
 * Handle confirmed transaction - notify customer and business.
 */
async function handleConfirmedEvent(
    tx: FirebaseFirestore.DocumentData,
    eventData: FirebaseFirestore.DocumentData,
    businessId: string,
    txId: string,
    eventId: string
): Promise<void> {
    const confirmationCode = eventData.data?.confirmationCode;
    const customerPhone = tx.actor?.phone;
    const customerName = tx.actor?.name || 'Customer';
    const offeringName = tx.lineItems?.[0]?.offeringName || 'Booking';

    // Send customer notification (WhatsApp if phone available)
    if (customerPhone) {
        const dedupeKey = getNotificationDedupeKey(txId, eventId, 'confirm_customer_whatsapp', customerPhone);

        if (await wasNotificationSent(dedupeKey)) {
            logger.info(`[TxEvent] Notification already sent: ${dedupeKey}`);
            return;
        }

        try {
            const { sendWhatsApp } = await import('../services/twilio.service');
            await sendWhatsApp(customerPhone,
                `✅ Your booking is confirmed!\n\n` +
                `📋 Confirmation: ${confirmationCode}\n` +
                `📍 ${offeringName}\n\n` +
                `Thank you for booking with Easy Islanders!`
            );

            await markNotificationSent(dedupeKey);
            logger.info(`[TxEvent] Customer WhatsApp sent for ${txId}`);
        } catch (err: unknown) {
            logger.error(`[TxEvent] Failed to send customer WhatsApp:`, getErrorMessage(err));
            // Don't fail the whole function - business notification should still try
        }
    }

    // Load business data for owner notification
    try {
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        const businessData = businessDoc.data();
        const ownerPhone = businessData?.phone || businessData?.ownerPhone;

        if (ownerPhone) {
            const dedupeKey = getNotificationDedupeKey(txId, eventId, 'confirm_business_whatsapp', ownerPhone);

            if (await wasNotificationSent(dedupeKey)) {
                logger.info(`[TxEvent] Business notification already sent: ${dedupeKey}`);
                return;
            }

            const { sendWhatsApp } = await import('../services/twilio.service');
            await sendWhatsApp(ownerPhone,
                `🔔 New Booking Confirmed!\n\n` +
                `Customer: ${customerName}\n` +
                `Confirmation: ${confirmationCode}\n` +
                `Booking: ${offeringName}\n\n` +
                `Check your dashboard for details.`
            );

            await markNotificationSent(dedupeKey);
            logger.info(`[TxEvent] Business WhatsApp sent for ${txId}`);
        }
    } catch (err: unknown) {
        logger.error(`[TxEvent] Failed to send business notification:`, getErrorMessage(err));
    }
}

/**
 * Handle cancelled transaction - notify customer.
 */
async function handleCancelledEvent(
    tx: FirebaseFirestore.DocumentData,
    eventData: FirebaseFirestore.DocumentData,
    businessId: string,
    txId: string,
    eventId: string
): Promise<void> {
    const customerPhone = tx.actor?.phone;
    const reason = eventData.data?.reason || 'Cancelled by user';

    if (!customerPhone) return;

    const dedupeKey = getNotificationDedupeKey(txId, eventId, 'cancel_customer_whatsapp', customerPhone);

    if (await wasNotificationSent(dedupeKey)) {
        logger.info(`[TxEvent] Cancellation notification already sent: ${dedupeKey}`);
        return;
    }

    try {
        const { sendWhatsApp } = await import('../services/twilio.service');
        await sendWhatsApp(customerPhone,
            `Your booking has been cancelled.\n\n` +
            `Reason: ${reason}\n\n` +
            `Need to rebook? Just message me!`
        );

        await markNotificationSent(dedupeKey);
        logger.info(`[TxEvent] Cancellation WhatsApp sent for ${txId}`);
    } catch (err: unknown) {
        logger.error(`[TxEvent] Failed to send cancellation notification:`, getErrorMessage(err));
    }
}

/**
 * Handle expired hold - notify customer if phone available.
 */
async function handleExpiredEvent(
    tx: FirebaseFirestore.DocumentData,
    _eventData: FirebaseFirestore.DocumentData,
    businessId: string,
    txId: string,
    eventId: string
): Promise<void> {
    const customerPhone = tx.actor?.phone;

    if (!customerPhone) return;

    const dedupeKey = getNotificationDedupeKey(txId, eventId, 'expire_customer_whatsapp', customerPhone);

    if (await wasNotificationSent(dedupeKey)) {
        logger.info(`[TxEvent] Expiry notification already sent: ${dedupeKey}`);
        return;
    }

    try {
        const { sendWhatsApp } = await import('../services/twilio.service');
        await sendWhatsApp(customerPhone,
            `⏰ Your reservation hold has expired.\n\n` +
            `No worries - just message me if you'd like to try again!`
        );

        await markNotificationSent(dedupeKey);
        logger.info(`[TxEvent] Expiry WhatsApp sent for ${txId}`);
    } catch (err: unknown) {
        logger.error(`[TxEvent] Failed to send expiry notification:`, getErrorMessage(err));
    }
}
