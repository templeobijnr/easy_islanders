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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxiTools = void 0;
var errors_1 = require("../../utils/errors");
/**
 * Taxi & Transportation Tools
 *
 * Handles taxi dispatch, driver assignment, and ride management.
 */
var logger = __importStar(require("firebase-functions/logger"));
var firebase_1 = require("../../config/firebase");
var toolContext_1 = require("./toolContext");
exports.taxiTools = {
    /**
     * Request a taxi using the new atomic dispatch system
     */
    requestTaxi: function (args, userIdOrContext, sessionId) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, userId, createAndBroadcastRequest, reverseGeocode, customerPhone, customerName, userSnap, userData, pickupAddress, geocodedAddress, requestData, requestId, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("🚕 [RequestTaxi] New System:", args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    ctx = (0, toolContext_1.asToolContext)(userIdOrContext, sessionId);
                    userId = ctx.userId;
                    createAndBroadcastRequest = require("../taxi.service").createAndBroadcastRequest;
                    reverseGeocode = require("../../utils/reverseGeocode").reverseGeocode;
                    customerPhone = args.customerPhone || "";
                    customerName = args.customerName || "Guest";
                    if (!(userId && !customerPhone)) return [3 /*break*/, 3];
                    return [4 /*yield*/, firebase_1.db.collection("users").doc(userId).get()];
                case 2:
                    userSnap = _a.sent();
                    if (userSnap.exists) {
                        userData = userSnap.data();
                        customerPhone =
                            (userData === null || userData === void 0 ? void 0 : userData.phone) || (userData === null || userData === void 0 ? void 0 : userData.email) || "";
                        customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
                    }
                    _a.label = 3;
                case 3:
                    if (!customerPhone) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Customer phone number is required",
                            }];
                    }
                    pickupAddress = args.pickupAddress;
                    if (!(args.pickupLat &&
                        args.pickupLng &&
                        (pickupAddress.toLowerCase().includes("current location") ||
                            pickupAddress.toLowerCase().includes("see map link")))) return [3 /*break*/, 5];
                    logger.debug("\uD83D\uDDFA\uFE0F [RequestTaxi] Reverse geocoding pickup: ".concat(args.pickupLat, ", ").concat(args.pickupLng));
                    return [4 /*yield*/, reverseGeocode(args.pickupLat, args.pickupLng)];
                case 4:
                    geocodedAddress = _a.sent();
                    if (geocodedAddress) {
                        pickupAddress = geocodedAddress;
                        logger.debug("\u2705 [RequestTaxi] Geocoded address: ".concat(geocodedAddress));
                    }
                    _a.label = 5;
                case 5:
                    requestData = {
                        userId: userId || "guest",
                        customerName: customerName,
                        customerPhone: customerPhone,
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
                    return [4 /*yield*/, createAndBroadcastRequest(requestData, ctx.sessionId)];
                case 6:
                    requestId = _a.sent();
                    logger.debug("\u2705 [RequestTaxi] Request created and broadcast: ".concat(requestId));
                    return [2 /*return*/, {
                            success: true,
                            requestId: requestId,
                            status: "pending",
                            message: "Taxi request sent to available drivers. You will be notified when a driver accepts.",
                        }];
                case 7:
                    err_1 = _a.sent();
                    console.error("🔴 [RequestTaxi] Failed:", err_1);
                    return [2 /*return*/, {
                            success: false,
                            error: (0, errors_1.getErrorMessage)(err_1) || "Failed to request taxi",
                        }];
                case 8: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Detect district from coordinates (Northern Cyprus)
     */
    detectDistrictFromCoordinates: function (lat, lng) {
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
    dispatchTaxi: function (args, userIdOrContext, sessionId) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, district, locationLower;
        return __generator(this, function (_a) {
            logger.debug("🚖 [DispatchTaxi] Redirecting to new system...", args);
            ctx = (0, toolContext_1.asToolContext)(userIdOrContext, sessionId);
            district = "Unknown";
            locationLower = (args.pickupLocation || "").toLowerCase();
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
                logger.debug("\uD83D\uDDFA\uFE0F [DispatchTaxi] Detected district from coordinates: ".concat(district, " (").concat(args.pickupLat, ", ").concat(args.pickupLng, ")"));
            }
            // Map to new format
            return [2 /*return*/, exports.taxiTools.requestTaxi({
                    pickupAddress: args.pickupLocation,
                    pickupDistrict: district,
                    pickupLat: args.pickupLat,
                    pickupLng: args.pickupLng,
                    dropoffAddress: args.destination,
                    customerName: args.customerName,
                    customerPhone: args.customerContact,
                }, ctx, ctx.sessionId)];
        });
    }); },
};
