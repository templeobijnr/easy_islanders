"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleEmailWebhook = void 0;
const firebase_1 = require("../config/firebase");
/**
 * Generic email provider webhook receiver.
 * Configure your email service to POST delivery/reply events here.
 */
const handleEmailWebhook = async (req, res) => {
    try {
        console.log('📥 [Email Webhook] Incoming email event:', req.body);
        await firebase_1.db.collection('email_logs').add({
            payload: req.body,
            headers: req.headers,
            receivedAt: new Date(),
        });
        res.status(200).send('OK');
    }
    catch (err) {
        console.error('❌ [Email Webhook] Error:', err);
        res.status(500).send('Error');
    }
};
exports.handleEmailWebhook = handleEmailWebhook;
//# sourceMappingURL=emailWebhook.controller.js.map