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
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTransactionEvent = void 0;
const errors_1 = require("../utils/errors");
/**
 * Transaction Events Triggers
 *
 * Listen for transaction events and send notifications.
 * Decoupled from the transaction primitives for reliability.
 *
 * IMPORTANT: This trigger must be idempotent because Firestore
 * triggers are at-least-once delivery.
 */
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const firestore_2 = require("firebase-admin/firestore");
const db = (0, firestore_2.getFirestore)();
// Collection for notification deduplication
const NOTIFICATIONS_SENT_COLLECTION = 'notificationsSent';
/**
 * Generate a deduplication key for a notification.
 */
function getNotificationDedupeKey(txId, eventId, notificationType, recipient) {
    return `${txId}:${eventId}:${notificationType}:${recipient}`;
}
/**
 * Check if notification was already sent (idempotency).
 */
async function wasNotificationSent(dedupeKey) {
    const doc = await db.collection(NOTIFICATIONS_SENT_COLLECTION).doc(dedupeKey).get();
    return doc.exists;
}
/**
 * Mark notification as sent (for idempotency).
 */
async function markNotificationSent(dedupeKey) {
    await db.collection(NOTIFICATIONS_SENT_COLLECTION).doc(dedupeKey).set({
        sentAt: firestore_2.Timestamp.now(),
        createdAt: firestore_2.Timestamp.now(),
    });
}
/**
 * Listen for new transaction events and send notifications.
 *
 * Path: businesses/{businessId}/transactions/{txId}/events/{eventId}
 */
exports.onTransactionEvent = (0, firestore_1.onDocumentCreated)({
    document: 'businesses/{businessId}/transactions/{txId}/events/{eventId}',
    region: 'europe-west1',
}, async (event) => {
    var _a, _b, _c;
    const eventData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!eventData) {
        logger.warn('[TxEvent] No event data found');
        return;
    }
    const { businessId, txId, eventId } = event.params;
    const eventType = eventData.type;
    logger.info(`[TxEvent] Processing: ${eventType} for tx=${txId}`, { businessId, eventId });
    try {
        // Load the parent transaction for details
        const txDoc = await ((_c = (_b = event.data) === null || _b === void 0 ? void 0 : _b.ref.parent.parent) === null || _c === void 0 ? void 0 : _c.get());
        const tx = txDoc === null || txDoc === void 0 ? void 0 : txDoc.data();
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
    }
    catch (err) {
        logger.error(`[TxEvent] Error processing ${eventType}:`, err);
        // Don't rethrow - let the function complete to avoid infinite retries
    }
});
/**
 * Handle confirmed transaction - notify customer and business.
 */
async function handleConfirmedEvent(tx, eventData, businessId, txId, eventId) {
    var _a, _b, _c, _d, _e;
    const confirmationCode = (_a = eventData.data) === null || _a === void 0 ? void 0 : _a.confirmationCode;
    const customerPhone = (_b = tx.actor) === null || _b === void 0 ? void 0 : _b.phone;
    const customerName = ((_c = tx.actor) === null || _c === void 0 ? void 0 : _c.name) || 'Customer';
    const offeringName = ((_e = (_d = tx.lineItems) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.offeringName) || 'Booking';
    // Send customer notification (WhatsApp if phone available)
    if (customerPhone) {
        const dedupeKey = getNotificationDedupeKey(txId, eventId, 'confirm_customer_whatsapp', customerPhone);
        if (await wasNotificationSent(dedupeKey)) {
            logger.info(`[TxEvent] Notification already sent: ${dedupeKey}`);
            return;
        }
        try {
            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../services/twilio.service')));
            await sendWhatsApp(customerPhone, `✅ Your booking is confirmed!\n\n` +
                `📋 Confirmation: ${confirmationCode}\n` +
                `📍 ${offeringName}\n\n` +
                `Thank you for booking with Easy Islanders!`);
            await markNotificationSent(dedupeKey);
            logger.info(`[TxEvent] Customer WhatsApp sent for ${txId}`);
        }
        catch (err) {
            logger.error(`[TxEvent] Failed to send customer WhatsApp:`, (0, errors_1.getErrorMessage)(err));
            // Don't fail the whole function - business notification should still try
        }
    }
    // Load business data for owner notification
    try {
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        const businessData = businessDoc.data();
        const ownerPhone = (businessData === null || businessData === void 0 ? void 0 : businessData.phone) || (businessData === null || businessData === void 0 ? void 0 : businessData.ownerPhone);
        if (ownerPhone) {
            const dedupeKey = getNotificationDedupeKey(txId, eventId, 'confirm_business_whatsapp', ownerPhone);
            if (await wasNotificationSent(dedupeKey)) {
                logger.info(`[TxEvent] Business notification already sent: ${dedupeKey}`);
                return;
            }
            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../services/twilio.service')));
            await sendWhatsApp(ownerPhone, `🔔 New Booking Confirmed!\n\n` +
                `Customer: ${customerName}\n` +
                `Confirmation: ${confirmationCode}\n` +
                `Booking: ${offeringName}\n\n` +
                `Check your dashboard for details.`);
            await markNotificationSent(dedupeKey);
            logger.info(`[TxEvent] Business WhatsApp sent for ${txId}`);
        }
    }
    catch (err) {
        logger.error(`[TxEvent] Failed to send business notification:`, (0, errors_1.getErrorMessage)(err));
    }
}
/**
 * Handle cancelled transaction - notify customer.
 */
async function handleCancelledEvent(tx, eventData, businessId, txId, eventId) {
    var _a, _b;
    const customerPhone = (_a = tx.actor) === null || _a === void 0 ? void 0 : _a.phone;
    const reason = ((_b = eventData.data) === null || _b === void 0 ? void 0 : _b.reason) || 'Cancelled by user';
    if (!customerPhone)
        return;
    const dedupeKey = getNotificationDedupeKey(txId, eventId, 'cancel_customer_whatsapp', customerPhone);
    if (await wasNotificationSent(dedupeKey)) {
        logger.info(`[TxEvent] Cancellation notification already sent: ${dedupeKey}`);
        return;
    }
    try {
        const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../services/twilio.service')));
        await sendWhatsApp(customerPhone, `Your booking has been cancelled.\n\n` +
            `Reason: ${reason}\n\n` +
            `Need to rebook? Just message me!`);
        await markNotificationSent(dedupeKey);
        logger.info(`[TxEvent] Cancellation WhatsApp sent for ${txId}`);
    }
    catch (err) {
        logger.error(`[TxEvent] Failed to send cancellation notification:`, (0, errors_1.getErrorMessage)(err));
    }
}
/**
 * Handle expired hold - notify customer if phone available.
 */
async function handleExpiredEvent(tx, _eventData, businessId, txId, eventId) {
    var _a;
    const customerPhone = (_a = tx.actor) === null || _a === void 0 ? void 0 : _a.phone;
    if (!customerPhone)
        return;
    const dedupeKey = getNotificationDedupeKey(txId, eventId, 'expire_customer_whatsapp', customerPhone);
    if (await wasNotificationSent(dedupeKey)) {
        logger.info(`[TxEvent] Expiry notification already sent: ${dedupeKey}`);
        return;
    }
    try {
        const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../services/twilio.service')));
        await sendWhatsApp(customerPhone, `⏰ Your reservation hold has expired.\n\n` +
            `No worries - just message me if you'd like to try again!`);
        await markNotificationSent(dedupeKey);
        logger.info(`[TxEvent] Expiry WhatsApp sent for ${txId}`);
    }
    catch (err) {
        logger.error(`[TxEvent] Failed to send expiry notification:`, (0, errors_1.getErrorMessage)(err));
    }
}
//# sourceMappingURL=transaction-events.triggers.js.map