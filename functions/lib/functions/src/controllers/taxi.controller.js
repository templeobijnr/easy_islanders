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
exports.requestTaxi = exports.webhookTwilio = void 0;
const logger = __importStar(require("firebase-functions/logger"));
const taxiService = __importStar(require("../services/taxi.service"));
/**
 * Webhook endpoint for Twilio WhatsApp replies
 * This should be configured in Twilio Console as the webhook URL
 */
const webhookTwilio = async (req, res) => {
    try {
        const { From, Body } = req.body; // Twilio sends form-url-encoded data
        if (!From || !Body) {
            res.status(400).send("Missing required fields");
            return;
        }
        logger.debug(`Received WhatsApp from ${From}: ${Body}`);
        const replyText = await taxiService.handleDriverReply(From, Body);
        // Return TwiML XML response
        res.set("Content-Type", "text/xml");
        res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`);
    }
    catch (error) {
        console.error("Error in Twilio webhook:", error);
        res.status(500).send("Internal server error");
    }
};
exports.webhookTwilio = webhookTwilio;
/**
 * API endpoint to request a taxi
 * Called by the frontend or AI agent
 */
const requestTaxi = async (req, res) => {
    try {
        const { userId, customerName, customerPhone, pickupAddress, pickupLat, pickupLng, pickupDistrict, dropoffAddress, priceEstimate, } = req.body;
        // Validation
        if (!userId ||
            !customerName ||
            !customerPhone ||
            !pickupAddress ||
            !dropoffAddress ||
            !pickupDistrict) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        const requestId = await taxiService.createAndBroadcastRequest({
            userId,
            customerName,
            customerPhone,
            pickup: {
                address: pickupAddress,
                location: {
                    lat: pickupLat || 0,
                    lng: pickupLng || 0,
                    district: pickupDistrict,
                },
            },
            dropoff: {
                address: dropoffAddress,
            },
            priceEstimate,
        });
        res.json({
            success: true,
            requestId,
            message: "Taxi request sent to available drivers",
        });
    }
    catch (error) {
        console.error("Error requesting taxi:", error);
        res.status(500).json({ error: "Failed to request taxi" });
    }
};
exports.requestTaxi = requestTaxi;
//# sourceMappingURL=taxi.controller.js.map