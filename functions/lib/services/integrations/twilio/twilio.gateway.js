"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsApp = sendWhatsApp;
exports.sendTaxiRequest = sendTaxiRequest;
exports.sendViewingRequest = sendViewingRequest;
exports.sendBookingConfirmation = sendBookingConfirmation;
exports.sendGeneralInquiry = sendGeneralInquiry;
exports.sendBookingInquiry = sendBookingInquiry;
const twilio_1 = __importDefault(require("twilio"));
const firebase_1 = require("../../../config/firebase");
const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || '';
// Lazily create client to avoid throwing if envs missing during tests
let client = null;
function getClient() {
    if (!client) {
        if (!accountSid || !accountSid.startsWith('AC')) {
            throw new Error('Twilio account SID missing/invalid');
        }
        if (!authToken) {
            throw new Error('Twilio auth token missing');
        }
        client = (0, twilio_1.default)(accountSid, authToken);
    }
    return client;
}
async function sendWhatsApp(to, body, context) {
    if (!accountSid || !authToken || !fromWhatsApp || !accountSid.startsWith('AC')) {
        throw new Error('Twilio WhatsApp not configured');
    }
    const normalizedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    // Log outbound attempt with a short preview
    console.log('📤 [WhatsApp] Sending message', {
        from: fromWhatsApp,
        to: normalizedTo,
        preview: body.length > 200 ? `${body.slice(0, 200)}…` : body
    });
    const cli = getClient();
    const message = await cli.messages.create({
        from: fromWhatsApp,
        to: normalizedTo,
        body
    });
    // Persist outbound message for debugging / tracing
    try {
        await firebase_1.db.collection('whatsappMessages').add({
            from: fromWhatsApp,
            to: normalizedTo,
            body,
            direction: 'outbound',
            messageSid: message.sid,
            status: message.status,
            sentAt: new Date().toISOString(),
            bookingId: (context === null || context === void 0 ? void 0 : context.bookingId) || null,
            stayId: (context === null || context === void 0 ? void 0 : context.stayId) || null,
            role: (context === null || context === void 0 ? void 0 : context.role) || null
        });
    }
    catch (err) {
        console.error('⚠️ [WhatsApp] Failed to persist outbound message log:', (err === null || err === void 0 ? void 0 : err.message) || err);
    }
    console.log('✅ [WhatsApp] Message sent', {
        to: normalizedTo,
        sid: message.sid,
        status: message.status
    });
    return {
        sid: message.sid,
        status: message.status
    };
}
async function sendTaxiRequest(to, payload) {
    let body = `🚖 *New Taxi Booking Request*\n\n`;
    body += `👤 Customer: ${payload.customerName || 'Guest'}\n`;
    body += `📱 Contact: ${payload.customerContact}\n\n`;
    // Pickup location with prominent map link
    body += `📍 *PICKUP LOCATION:*\n`;
    body += `${payload.pickup}\n`;
    if (payload.pickupLat && payload.pickupLng) {
        // Use Google Maps navigation URL - opens directly in navigation mode
        body += `📲 *TAP TO NAVIGATE:*\n`;
        body += `https://www.google.com/maps/dir/?api=1&destination=${payload.pickupLat},${payload.pickupLng}\n\n`;
    }
    else {
        body += `\n`;
    }
    // Destination with map link
    body += `🎯 *DESTINATION:*\n`;
    body += `${payload.destination}\n`;
    if (payload.destinationLat && payload.destinationLng) {
        body += `📲 *TAP TO NAVIGATE:*\n`;
        body += `https://www.google.com/maps/dir/?api=1&destination=${payload.destinationLat},${payload.destinationLng}\n`;
    }
    if (payload.pickupTime) {
        body += `\n🕐 *Time:* ${payload.pickupTime}`;
    }
    if (payload.notes) {
        body += `\n\n💬 *Notes:* ${payload.notes}`;
    }
    // Add route planning link if both locations have coordinates
    if (payload.pickupLat && payload.pickupLng && payload.destinationLat && payload.destinationLng) {
        body += `\n\n🗺️ *FULL ROUTE:*\n`;
        body += `https://www.google.com/maps/dir/?api=1&origin=${payload.pickupLat},${payload.pickupLng}&destination=${payload.destinationLat},${payload.destinationLng}&travelmode=driving`;
    }
    return sendWhatsApp(to, body);
}
async function sendViewingRequest(to, payload) {
    let body = `🏠 *New Property Viewing Request*\n\n`;
    body += `🏡 Property: ${payload.listingTitle}\n`;
    if (payload.listingLocation) {
        body += `📍 Location: ${payload.listingLocation}\n`;
    }
    body += `\n👤 *Prospect Details:*\n`;
    body += `Name: ${payload.customerName}\n`;
    body += `Contact: ${payload.customerContact}\n`;
    body += `\n🕐 *Preferred Time:* ${payload.preferredSlot}\n`;
    if (payload.notes) {
        body += `\n💬 *Additional Notes:*\n${payload.notes}`;
    }
    body += `\n\n📋 Listing ID: ${payload.listingId}`;
    return sendWhatsApp(to, body);
}
async function sendBookingConfirmation(to, payload) {
    let body = `✅ *Booking Confirmed!*\n\n`;
    body += `🎫 Confirmation: ${payload.confirmationNumber}\n`;
    body += `📦 Booking ID: ${payload.bookingId}\n\n`;
    body += `🏠 ${payload.itemTitle}\n`;
    body += `👤 Guest: ${payload.customerName}\n`;
    if (payload.checkIn && payload.checkOut) {
        body += `📅 Check-in: ${payload.checkIn}\n`;
        body += `📅 Check-out: ${payload.checkOut}\n`;
    }
    body += `\n💰 Total: ${payload.currency} £${payload.totalPrice}\n`;
    body += `\nThank you for your booking!`;
    return sendWhatsApp(to, body);
}
async function sendGeneralInquiry(to, payload) {
    let body = `📨 *New Inquiry*\n\n`;
    body += `📌 Subject: ${payload.subject}\n\n`;
    if (payload.customerName) {
        body += `👤 From: ${payload.customerName}\n`;
    }
    if (payload.customerContact) {
        body += `📱 Contact: ${payload.customerContact}\n\n`;
    }
    body += `💬 Message:\n${payload.message}`;
    return sendWhatsApp(to, body);
}
/**
 * Send a booking inquiry to a business via WhatsApp
 * Business can reply with YES [shortCode] [PRICE] or NO [shortCode]
 */
async function sendBookingInquiry(to, payload) {
    let body = `🔔 *New Booking Request*\n\n`;
    body += `📍 *${payload.listingTitle}*\n`;
    body += `📂 Category: ${payload.listingCategory}\n\n`;
    // Customer info
    body += `👤 *Customer:* ${payload.customerName}\n`;
    body += `📱 *Contact:* ${payload.customerPhone}\n\n`;
    // Booking details
    body += `📅 *Date:* ${payload.date}\n`;
    if (payload.time) {
        body += `🕐 *Time:* ${payload.time}\n`;
    }
    body += `👥 *Guests:* ${payload.guests}\n`;
    if (payload.duration) {
        body += `⏱️ *Duration:* ${payload.duration}\n`;
    }
    // Custom fields
    if (payload.customFields && Object.keys(payload.customFields).length > 0) {
        body += `\n📋 *Additional Details:*\n`;
        for (const [key, value] of Object.entries(payload.customFields)) {
            body += `• ${key}: ${value}\n`;
        }
    }
    // User message
    if (payload.userMessage) {
        body += `\n💬 *Customer Note:*\n${payload.userMessage}\n`;
    }
    // Response instructions
    body += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `*Reply with:*\n\n`;
    body += `✅ *YES ${payload.shortCode} [PRICE]* to confirm\n`;
    body += `   Example: YES ${payload.shortCode} 80\n\n`;
    body += `❌ *NO ${payload.shortCode}* to decline\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━`;
    return sendWhatsApp(to, body, { bookingId: payload.bookingId, role: 'business' });
}
//# sourceMappingURL=twilio.gateway.js.map