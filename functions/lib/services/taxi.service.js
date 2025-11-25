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
const repo = __importStar(require("../repositories/taxi.repository"));
const twilio_service_1 = require("./twilio.service");
/**
 * Broadcast request to available drivers
 */
const broadcastRequest = async (request) => {
    // Find drivers in the same district
    const drivers = await repo.findAvailableTaxis(request.pickup.location.district);
    if (drivers.length === 0) {
        console.log(`No drivers available in district: ${request.pickup.location.district}`);
        // Fallback will be handled by timeout trigger
        return;
    }
    const requestCode = request.id.slice(-4).toUpperCase();
    const messageBody = `🚕 *NEW JOB* 🚕
From: ${request.pickup.address}
To: ${request.dropoff.address}
${request.priceEstimate ? `Est: ${request.priceEstimate} TL` : ''}

Reply *YES ${requestCode}* to accept.`;
    // Send WhatsApps to all available drivers
    const promises = drivers.map(driver => (0, twilio_service_1.sendWhatsApp)(driver.phone, messageBody).catch(err => {
        console.error(`Failed to send WhatsApp to ${driver.name}:`, err);
        return null;
    }));
    await Promise.allSettled(promises);
    // Update record of who we messaged
    await repo.updateBroadcastList(request.id, drivers.map(d => d.id));
    console.log(`Broadcast sent to ${drivers.length} drivers for request ${request.id}`);
};
exports.broadcastRequest = broadcastRequest;
/**
 * Handle incoming WhatsApp reply from driver
 */
const handleDriverReply = async (driverPhone, messageBody) => {
    // Clean phone number (remove whatsapp: prefix)
    const phone = driverPhone.replace('whatsapp:', '');
    // Find the most recent pending request this driver was messaged about
    const request = await repo.findPendingRequestForDriver(phone);
    if (!request) {
        return "No active requests found.";
    }
    const messageTrimmed = messageBody.trim().toUpperCase();
    if (messageTrimmed.startsWith('YES')) {
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
            return `✅ Job Accepted! 
Customer: ${request.customerName}
Pickup: ${request.pickup.address}
Destination: ${request.dropoff.address}`;
        }
        else {
            return "❌ Job already taken by another driver.";
        }
    }
    if (messageTrimmed.startsWith('NO')) {
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
Rating: ${'⭐'.repeat(Math.round(driver.rating))}

Driver will contact you shortly.
Contact: ${driver.phone}`;
    try {
        await (0, twilio_service_1.sendWhatsApp)(request.customerPhone, message);
    }
    catch (error) {
        console.error('Failed to notify customer:', error);
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
        console.error('Failed to send driver details:', error);
    }
}
/**
 * Create and broadcast a new taxi request
 */
const createAndBroadcastRequest = async (requestData) => {
    // Create the request
    const requestId = await repo.createTaxiRequest(requestData);
    // Get the full request object
    const request = await repo.getTaxiRequest(requestId);
    if (!request) {
        throw new Error('Failed to create taxi request');
    }
    // Broadcast to drivers
    await (0, exports.broadcastRequest)(request);
    return requestId;
};
exports.createAndBroadcastRequest = createAndBroadcastRequest;
//# sourceMappingURL=taxi.service.js.map