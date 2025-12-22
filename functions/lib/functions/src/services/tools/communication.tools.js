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
exports.communicationTools = void 0;
const errors_1 = require("../../utils/errors");
/**
 * Communication Tools
 *
 * Handles WhatsApp messages, notifications, and user communications.
 */
const logger = __importStar(require("firebase-functions/logger"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../../config/firebase");
const now = firestore_1.FieldValue.serverTimestamp;
exports.communicationTools = {
    /**
     * Send a WhatsApp message via Twilio
     */
    sendWhatsAppMessage: async (args) => {
        logger.debug("📱 [WhatsApp] Sending message:", args);
        try {
            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require("../twilio.service")));
            const res = await sendWhatsApp(args.recipient, args.message);
            // Log notification to database
            await firebase_1.db.collection("notifications").add({
                userId: args.userId || null,
                channel: "whatsapp",
                message: args.message,
                to: args.recipient,
                status: res.status || "sent",
                createdAt: now(),
            });
            return {
                success: true,
                status: res.status,
                sid: res.sid,
            };
        }
        catch (err) {
            console.error("🔴 [WhatsApp] Failed:", err);
            return {
                success: false,
                error: (0, errors_1.getErrorMessage)(err) || "send failed",
            };
        }
    },
    /**
     * Send an in-app notification
     */
    sendAppNotification: async (args) => {
        logger.debug("🔔 [Notification] Sending app notification:", args);
        try {
            await firebase_1.db.collection("notifications").add({
                userId: args.userId,
                channel: "app",
                title: args.title || "Notification",
                message: args.message,
                type: args.type || "info",
                read: false,
                createdAt: now(),
            });
            return {
                success: true,
                message: "Notification sent",
            };
        }
        catch (err) {
            console.error("🔴 [Notification] Failed:", err);
            return {
                success: false,
                error: (0, errors_1.getErrorMessage)(err) || "Failed to send notification",
            };
        }
    },
    /**
     * Send an email notification
     * @future Implement email service integration
     */
    sendEmailNotification: async (args) => {
        const to = args.to || args.email;
        const body = args.body || args.message;
        logger.debug("📧 [Email] Sending email notification:", {
            to,
            subject: args.subject,
            preview: (body || "").slice(0, 80),
        });
        // TODO: Implement actual email service (SendGrid, etc.)
        console.warn("⚠️ Email service not yet implemented");
        return {
            success: false,
            error: "Email service not implemented yet",
        };
    },
};
//# sourceMappingURL=communication.tools.js.map