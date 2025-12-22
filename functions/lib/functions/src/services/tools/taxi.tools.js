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
exports.taxiTools = void 0;
const errors_1 = require("../../utils/errors");
/**
 * Taxi & Transportation Tools
 *
 * Handles taxi dispatch, driver assignment, and ride management.
 */
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../../config/firebase");
const toolContext_1 = require("./toolContext");
exports.taxiTools = {
    /**
     * Request a taxi using the new atomic dispatch system
     */
    requestTaxi: async (args, userIdOrContext, sessionId) => {
        logger.debug("🚕 [RequestTaxi] New System:", args);
        try {
            const ctx = (0, toolContext_1.asToolContext)(userIdOrContext, sessionId);
            const userId = ctx.userId;
            const { createAndBroadcastRequest } = await Promise.resolve().then(() => __importStar(require("../taxi.service")));
            const { reverseGeocode } = await Promise.resolve().then(() => __importStar(require("../../utils/reverseGeocode")));
            // Get user profile for contact info if not provided
            let customerPhone = args.customerPhone || "";
            let customerName = args.customerName || "Guest";
            if (userId && !customerPhone) {
                const userSnap = await firebase_1.db.collection("users").doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone =
                        (userData === null || userData === void 0 ? void 0 : userData.phone) || (userData === null || userData === void 0 ? void 0 : userData.email) || "";
                    customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
                }
            }
            if (!customerPhone) {
                return {
                    success: false,
                    error: "Customer phone number is required",
                };
            }
            // Reverse geocode pickup address if coordinates are provided and address is generic
            let pickupAddress = args.pickupAddress;
            if (args.pickupLat &&
                args.pickupLng &&
                (pickupAddress.toLowerCase().includes("current location") ||
                    pickupAddress.toLowerCase().includes("see map link"))) {
                logger.debug(`🗺️ [RequestTaxi] Reverse geocoding pickup: ${args.pickupLat}, ${args.pickupLng}`);
                const geocodedAddress = await reverseGeocode(args.pickupLat, args.pickupLng);
                if (geocodedAddress) {
                    pickupAddress = geocodedAddress;
                    logger.debug(`✅ [RequestTaxi] Geocoded address: ${geocodedAddress}`);
                }
            }
            // Create and broadcast the request
            // Note: Firestore doesn't accept undefined values, so we conditionally include priceEstimate
            const requestData = {
                userId: userId || "guest",
                customerName,
                customerPhone,
                pickup: {
                    address: pickupAddress, // Use geocoded address
                    location: {
                        lat: args.pickupLat || 0,
                        lng: args.pickupLng || 0,
                        district: args.pickupDistrict || "Unknown",
                    },
                },
                dropoff: {
                    address: args.dropoffAddress,
                },
            };
            // Only include priceEstimate if it's defined
            if (args.priceEstimate !== undefined) {
                requestData.priceEstimate = args.priceEstimate;
            }
            const requestId = await createAndBroadcastRequest(requestData, ctx.sessionId);
            logger.debug(`✅ [RequestTaxi] Request created and broadcast: ${requestId}`);
            return {
                success: true,
                requestId,
                status: "pending",
                message: "Taxi request sent to available drivers. You will be notified when a driver accepts.",
            };
        }
        catch (err) {
            console.error("🔴 [RequestTaxi] Failed:", err);
            return {
                success: false,
                error: (0, errors_1.getErrorMessage)(err) || "Failed to request taxi",
            };
        }
    },
    /**
     * Detect district from coordinates (Northern Cyprus)
     */
    detectDistrictFromCoordinates: (lat, lng) => {
        if (!lat || !lng)
            return "Unknown";
        // Northern Cyprus district boundaries (approximate)
        // Girne (Kyrenia): 35.2-35.4 N, 33.1-33.5 E
        if (lat >= 35.2 && lat <= 35.4 && lng >= 33.1 && lng <= 33.5) {
            return "Girne";
        }
        // Lefkoşa (Nicosia): 35.1-35.3 N, 33.3-33.5 E
        if (lat >= 35.1 && lat <= 35.3 && lng >= 33.3 && lng <= 33.5) {
            return "Lefkosa";
        }
        // Magusa (Famagusta): 35.0-35.2 N, 33.8-34.1 E
        if (lat >= 35.0 && lat <= 35.2 && lng >= 33.8 && lng <= 34.1) {
            return "Famagusta";
        }
        // Iskele: 35.2-35.4 N, 33.8-34.2 E
        if (lat >= 35.2 && lat <= 35.4 && lng >= 33.8 && lng <= 34.2) {
            return "Iskele";
        }
        return "Unknown";
    },
    /**
     * Legacy dispatch function - redirects to new system
     * @deprecated Use requestTaxi instead
     */
    dispatchTaxi: async (args, userIdOrContext, sessionId) => {
        logger.debug("🚖 [DispatchTaxi] Redirecting to new system...", args);
        const ctx = (0, toolContext_1.asToolContext)(userIdOrContext, sessionId);
        // Infer district from location string
        let district = "Unknown";
        const locationLower = (args.pickupLocation || "").toLowerCase();
        if (locationLower.includes("girne") || locationLower.includes("kyrenia")) {
            district = "Girne";
        }
        else if (locationLower.includes("lefkoşa") ||
            locationLower.includes("nicosia") ||
            locationLower.includes("lefkosa")) {
            district = "Lefkosa";
        }
        else if (locationLower.includes("magusa") ||
            locationLower.includes("famagusta")) {
            district = "Famagusta";
        }
        else if (locationLower.includes("iskele")) {
            district = "Iskele";
        }
        else if (locationLower.includes("guzelyurt")) {
            district = "Guzelyurt";
        }
        else if (locationLower.includes("lefke")) {
            district = "Lefke";
        }
        // Fallback to coordinate-based detection if district is still unknown
        if (district === "Unknown" && args.pickupLat && args.pickupLng) {
            district = exports.taxiTools.detectDistrictFromCoordinates(args.pickupLat, args.pickupLng);
            logger.debug(`🗺️ [DispatchTaxi] Detected district from coordinates: ${district} (${args.pickupLat}, ${args.pickupLng})`);
        }
        // Map to new format
        return exports.taxiTools.requestTaxi({
            pickupAddress: args.pickupLocation,
            pickupDistrict: district,
            pickupLat: args.pickupLat,
            pickupLng: args.pickupLng,
            dropoffAddress: args.destination,
            customerName: args.customerName,
            customerPhone: args.customerContact,
        }, ctx, ctx.sessionId);
    },
};
//# sourceMappingURL=taxi.tools.js.map