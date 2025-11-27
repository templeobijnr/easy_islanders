"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageStatus = exports.handleIncomingWhatsApp = void 0;
const taxi_service_1 = require("../services/taxi.service");
const firebase_1 = require("../config/firebase");
/**
 * Webhook endpoint for incoming WhatsApp messages
 * Called by Twilio when someone sends a message to our WhatsApp number
 */
const handleIncomingWhatsApp = async (req, res) => {
    try {
        console.log('📥 [Twilio Webhook] Incoming WhatsApp message:', req.body);
        const { From: from, Body: body } = req.body;
        if (!from || !body) {
            console.error('⚠️ [Twilio Webhook] Missing required fields');
            res.status(400).send('Missing required fields');
            return;
        }
        // Clean phone number (remove whatsapp: prefix)
        const cleanPhone = from.replace('whatsapp:', '');
        console.log(`📞 [Twilio Webhook] From: ${cleanPhone}, Message: ${body}`);
        // Check if this is a driver response
        console.log(`🔍 [Twilio Webhook] Calling handleDriverReply...`);
        const replyText = await (0, taxi_service_1.handleDriverReply)(cleanPhone, body);
        console.log(`💬 [Twilio Webhook] Reply: ${replyText}`);
        // Send TwiML response
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${replyText}</Message>
</Response>`;
        res.type('text/xml');
        res.send(twiml);
    }
    catch (error) {
        console.error('❌ [Twilio Webhook] Error:', error);
        const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Sorry, there was an error processing your message.</Message>
</Response>`;
        res.type('text/xml');
        res.send(errorTwiml);
    }
};
exports.handleIncomingWhatsApp = handleIncomingWhatsApp;
/**
 * Webhook endpoint for Twilio message status callbacks
 * Called when message status changes (sent, delivered, read, failed)
 */
const handleMessageStatus = async (req, res) => {
    try {
        console.log('📊 [Twilio Status] Message status update:', req.body);
        const { MessageSid: messageSid, MessageStatus: status, To: to, ErrorCode: errorCode, ErrorMessage: errorMessage } = req.body;
        // Log to Firestore for tracking
        await firebase_1.db.collection('whatsapp_logs').add({
            messageSid,
            status,
            to,
            errorCode: errorCode || null,
            errorMessage: errorMessage || null,
            timestamp: new Date()
        });
        console.log(`✅ [Twilio Status] Logged status: ${status} for ${messageSid}`);
        res.status(200).send('OK');
    }
    catch (error) {
        console.error('❌ [Twilio Status] Error:', error);
        res.status(500).send('Error');
    }
};
exports.handleMessageStatus = handleMessageStatus;
//# sourceMappingURL=twilio.controller.js.map