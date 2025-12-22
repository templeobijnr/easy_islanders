"use strict";
/**
 * WhatsApp Business Ops Handler
 *
 * Handles messages from business owners/staff.
 * Routes structured booking replies to legacy handler, otherwise to ops agent.
 */
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
exports.handleBusinessOpsMessage = handleBusinessOpsMessage;
const firebase_1 = require("../../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
// ============================================
// BOOKING REPLY DETECTION
// ============================================
/**
 * Check if message matches structured booking reply protocol.
 * Format: YES CODE [PRICE] or NO CODE
 */
function isBookingReplyFormat(text) {
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
async function handleBusinessOpsMessage(req) {
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
        const { handleHostBookingReply } = await Promise.resolve().then(() => __importStar(require('../../../controllers/twilio.controller.internal')));
        const response = await handleHostBookingReply(phoneE164, text);
        if (response) {
            return response;
        }
    }
    // Log business ops message for future processing
    try {
        await firebase_1.db.collection('businessOpsMessages').add({
            actorId,
            businessId,
            phoneE164,
            text,
            messageSid: messageSid || null,
            processedAt: firestore_1.Timestamp.now(),
            status: 'acknowledged',
        });
    }
    catch (err) {
        logger.error('[BusinessOps] Failed to log message', err);
    }
    // For now, acknowledge receipt (future: route to business ops agent)
    return `Thanks! We received your message. A team member will respond shortly.`;
}
//# sourceMappingURL=whatsapp.business-ops.js.map