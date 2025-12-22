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
exports.createAndBroadcastRequest = exports.handleDriverReply = exports.broadcastRequest = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const repo = __importStar(require("../../../repositories/taxi.repository"));
const twilio_service_1 = require("../../twilio.service");
const firebase_1 = require("../../../config/firebase");
/**
 * Broadcast request to available drivers
 */
const broadcastRequest = async (request) => {
    // Find drivers in the same district
    const drivers = await repo.findAvailableTaxis(request.pickup.location.district);
    if (drivers.length === 0) {
        logger.debug(`No drivers available in district: ${request.pickup.location.district}`);
        // Fallback will be handled by timeout trigger
        return;
    }
    const requestCode = request.id.slice(-4).toUpperCase();
    const messageBody = `🚕 *NEW JOB* 🚕
From: ${request.pickup.address}
To: ${request.dropoff.address}
${request.priceEstimate ? `Est: ${request.priceEstimate} TL` : ""}

Reply *YES ${requestCode}* to accept.`;
    // Send WhatsApps to all available drivers
    const promises = drivers.map((driver) => (0, twilio_service_1.sendWhatsApp)(driver.phone, messageBody).catch((err) => {
        console.error(`Failed to send WhatsApp to ${driver.name}:`, err);
        return null;
    }));
    await Promise.allSettled(promises);
    // Update record of who we messaged
    await repo.updateBroadcastList(request.id, drivers.map((d) => d.id));
    logger.debug(`Broadcast sent to ${drivers.length} drivers for request ${request.id}`);
};
exports.broadcastRequest = broadcastRequest;
/**
 * Handle incoming WhatsApp reply from driver
 */
const handleDriverReply = async (driverPhone, messageBody) => {
    // Clean phone number (remove whatsapp: prefix)
    const phone = driverPhone.replace("whatsapp:", "");
    logger.debug(`🚖 [handleDriverReply] Processing reply from: ${phone}`);
    logger.debug(`📝 [handleDriverReply] Message: ${messageBody}`);
    // Find the most recent pending request this driver was messaged about
    logger.debug(`🔍 [handleDriverReply] Looking for pending request for driver...`);
    const request = await repo.findPendingRequestForDriver(phone);
    if (!request) {
        logger.debug(`⚠️ [handleDriverReply] No active requests found for ${phone}`);
        return "No active requests found.";
    }
    logger.debug(`✅ [handleDriverReply] Found request: ${request.id}`);
    const messageTrimmed = messageBody.trim().toUpperCase();
    if (messageTrimmed.startsWith("YES")) {
        const driver = await repo.findDriverByPhone(phone);
        if (!driver) {
            return "Driver not found in system.";
        }
        const success = await repo.assignDriverToRequest(request.id, driver.id);
        if (success) {
            // Notify customer via WhatsApp
            await notifyCustomer(request, driver);
            // Send detailed pickup info to driver
            await sendDriverDetails(driver, request);
            // Send real-time update to customer's chat
            await sendChatUpdate(request, driver);
            return `✅ Job Accepted!
Customer: ${request.customerName}
Pickup: ${request.pickup.address}
Destination: ${request.dropoff.address}`;
        }
        else {
            return "❌ Job already taken by another driver.";
        }
    }
    if (messageTrimmed.startsWith("NO")) {
        return "👍 Understood. You'll receive the next available request.";
    }
    return "Please reply *YES* to accept or *NO* to decline.";
};
exports.handleDriverReply = handleDriverReply;
/**
 * Notify customer that driver is assigned
 */
async function notifyCustomer(request, driver) {
    const message = `🚕 *Taxi Confirmed!*

Driver: ${driver.name}
Vehicle: ${driver.vehicleType}
Rating: ${"⭐".repeat(Math.round(driver.rating))}

Driver will contact you shortly.
Contact: ${driver.phone}`;
    try {
        await (0, twilio_service_1.sendWhatsApp)(request.customerPhone, message);
    }
    catch (error) {
        console.error("Failed to notify customer:", error);
    }
}
/**
 * Send real-time update to customer's chat session
 */
async function sendChatUpdate(request, driver) {
    try {
        const { db } = await Promise.resolve().then(() => __importStar(require("../../../config/firebase")));
        // Find the user's active chat session
        const sessionsSnap = await db
            .collection("chatSessions")
            .where("userId", "==", request.userId)
            .where("status", "==", "active")
            .orderBy("lastMessageAt", "desc")
            .limit(1)
            .get();
        if (sessionsSnap.empty) {
            logger.debug("⚠️ [Chat Update] No active session found for user:", request.userId);
            return;
        }
        const sessionId = sessionsSnap.docs[0].id;
        // Create a system message in the chat
        const systemMessage = {
            role: "model",
            parts: [
                {
                    text: `🚕 *Taxi Update*\n\nGreat news! Your taxi has been confirmed!\n\n👤 **Driver:** ${driver.name}\n🚗 **Vehicle:** ${driver.vehicleType}\n⭐ **Rating:** ${driver.rating}/5\n📞 **Contact:** ${driver.phone}\n\nYour driver will contact you shortly and is on the way to pick you up.`,
                },
            ],
            timestamp: new Date().toISOString(),
            metadata: {
                type: "taxi_status_update",
                requestId: request.id,
                status: "assigned",
                driverInfo: {
                    name: driver.name,
                    phone: driver.phone,
                    vehicleType: driver.vehicleType,
                    rating: driver.rating,
                },
            },
        };
        // Add to chat history
        await db
            .collection("chatSessions")
            .doc(sessionId)
            .collection("messages")
            .add(systemMessage);
        // Update session timestamp
        await db.collection("chatSessions").doc(sessionId).set({
            lastMessageAt: new Date().toISOString(),
            hasUnreadMessages: true,
        }, { merge: true });
        logger.debug(`✅ [Chat Update] Sent taxi status update to session: ${sessionId}`);
    }
    catch (error) {
        console.error("❌ [Chat Update] Failed to send chat update:", error);
    }
}
/**
 * Send detailed pickup information to driver
 */
async function sendDriverDetails(driver, request) {
    let message = `📍 *PICKUP DETAILS*

Customer: ${request.customerName}
Phone: ${request.customerPhone}

📍 Pickup: ${request.pickup.address}`;
    if (request.pickup.location.lat && request.pickup.location.lng) {
        message += `\n📲 Navigate: https://www.google.com/maps/dir/?api=1&destination=${request.pickup.location.lat},${request.pickup.location.lng}`;
    }
    message += `\n\n🎯 Destination: ${request.dropoff.address}`;
    try {
        await (0, twilio_service_1.sendWhatsApp)(driver.phone, message);
    }
    catch (error) {
        console.error("Failed to send driver details:", error);
    }
}
/**
 * Create and broadcast a new taxi request
 */
const createAndBroadcastRequest = async (requestData, sessionId) => {
    // Create the request
    const requestId = await repo.createTaxiRequest(requestData);
    // Get the full request object
    const request = await repo.getTaxiRequest(requestId);
    if (!request) {
        throw new Error("Failed to create taxi request");
    }
    // Store requestId in chat session for agent tracking
    if (sessionId) {
        try {
            await firebase_1.db.collection("chatSessions").doc(sessionId).set({
                pendingTaxiRequestId: requestId,
                lastMessageAt: new Date().toISOString(),
            }, { merge: true });
            logger.debug(`✅ [Taxi Service] Stored requestId ${requestId} in session ${sessionId}`);
        }
        catch (error) {
            console.error(`⚠️ [Taxi Service] Failed to store requestId in session:`, error);
            // Don't fail the request creation if session update fails
        }
    }
    // Broadcast to drivers
    await (0, exports.broadcastRequest)(request);
    return requestId;
};
exports.createAndBroadcastRequest = createAndBroadcastRequest;
//# sourceMappingURL=taxi.service.js.map