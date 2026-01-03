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
var logger = __importStar(require("firebase-functions/logger"));
var twilio_1 = __importDefault(require("twilio"));
var firebase_1 = require("../../../config/firebase");
var accountSid = process.env.TWILIO_ACCOUNT_SID || "";
var authToken = process.env.TWILIO_AUTH_TOKEN || "";
var fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || "";
// Lazily create client to avoid throwing if envs missing during tests
var client = null;
function getClient() {
    if (!client) {
        if (!accountSid || !accountSid.startsWith("AC")) {
            throw new Error("Twilio account SID missing/invalid");
        }
        if (!authToken) {
            throw new Error("Twilio auth token missing");
        }
        client = (0, twilio_1.default)(accountSid, authToken);
    }
    return client;
}
function sendWhatsApp(to, body, context) {
    return __awaiter(this, void 0, void 0, function () {
        var normalizedTo, cli, message, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!accountSid ||
                        !authToken ||
                        !fromWhatsApp ||
                        !accountSid.startsWith("AC")) {
                        throw new Error("Twilio WhatsApp not configured");
                    }
                    normalizedTo = to.startsWith("whatsapp:") ? to : "whatsapp:".concat(to);
                    // Log outbound attempt with a short preview
                    logger.debug("📤 [WhatsApp] Sending message", {
                        from: fromWhatsApp,
                        to: normalizedTo,
                        preview: body.length > 200 ? "".concat(body.slice(0, 200), "\u2026") : body,
                    });
                    cli = getClient();
                    return [4 /*yield*/, cli.messages.create({
                            from: fromWhatsApp,
                            to: normalizedTo,
                            body: body,
                        })];
                case 1:
                    message = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, firebase_1.db.collection("whatsappMessages").add({
                            from: fromWhatsApp,
                            to: normalizedTo,
                            body: body,
                            direction: "outbound",
                            messageSid: message.sid,
                            status: message.status,
                            sentAt: new Date().toISOString(),
                            bookingId: (context === null || context === void 0 ? void 0 : context.bookingId) || null,
                            stayId: (context === null || context === void 0 ? void 0 : context.stayId) || null,
                            role: (context === null || context === void 0 ? void 0 : context.role) || null,
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error("⚠️ [WhatsApp] Failed to persist outbound message log:", (err_1 === null || err_1 === void 0 ? void 0 : err_1.message) || err_1);
                    return [3 /*break*/, 5];
                case 5:
                    logger.debug("✅ [WhatsApp] Message sent", {
                        to: normalizedTo,
                        sid: message.sid,
                        status: message.status,
                    });
                    return [2 /*return*/, {
                            sid: message.sid,
                            status: message.status,
                        }];
            }
        });
    });
}
function sendTaxiRequest(to, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var body;
        return __generator(this, function (_a) {
            body = "\uD83D\uDE96 *New Taxi Booking Request*\n\n";
            body += "\uD83D\uDC64 Customer: ".concat(payload.customerName || "Guest", "\n");
            body += "\uD83D\uDCF1 Contact: ".concat(payload.customerContact, "\n\n");
            // Pickup location with prominent map link
            body += "\uD83D\uDCCD *PICKUP LOCATION:*\n";
            body += "".concat(payload.pickup, "\n");
            if (payload.pickupLat && payload.pickupLng) {
                // Use Google Maps navigation URL - opens directly in navigation mode
                body += "\uD83D\uDCF2 *TAP TO NAVIGATE:*\n";
                body += "https://www.google.com/maps/dir/?api=1&destination=".concat(payload.pickupLat, ",").concat(payload.pickupLng, "\n\n");
            }
            else {
                body += "\n";
            }
            // Destination with map link
            body += "\uD83C\uDFAF *DESTINATION:*\n";
            body += "".concat(payload.destination, "\n");
            if (payload.destinationLat && payload.destinationLng) {
                body += "\uD83D\uDCF2 *TAP TO NAVIGATE:*\n";
                body += "https://www.google.com/maps/dir/?api=1&destination=".concat(payload.destinationLat, ",").concat(payload.destinationLng, "\n");
            }
            if (payload.pickupTime) {
                body += "\n\uD83D\uDD50 *Time:* ".concat(payload.pickupTime);
            }
            if (payload.notes) {
                body += "\n\n\uD83D\uDCAC *Notes:* ".concat(payload.notes);
            }
            // Add route planning link if both locations have coordinates
            if (payload.pickupLat &&
                payload.pickupLng &&
                payload.destinationLat &&
                payload.destinationLng) {
                body += "\n\n\uD83D\uDDFA\uFE0F *FULL ROUTE:*\n";
                body += "https://www.google.com/maps/dir/?api=1&origin=".concat(payload.pickupLat, ",").concat(payload.pickupLng, "&destination=").concat(payload.destinationLat, ",").concat(payload.destinationLng, "&travelmode=driving");
            }
            return [2 /*return*/, sendWhatsApp(to, body)];
        });
    });
}
function sendViewingRequest(to, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var body;
        return __generator(this, function (_a) {
            body = "\uD83C\uDFE0 *New Property Viewing Request*\n\n";
            body += "\uD83C\uDFE1 Property: ".concat(payload.listingTitle, "\n");
            if (payload.listingLocation) {
                body += "\uD83D\uDCCD Location: ".concat(payload.listingLocation, "\n");
            }
            body += "\n\uD83D\uDC64 *Prospect Details:*\n";
            body += "Name: ".concat(payload.customerName, "\n");
            body += "Contact: ".concat(payload.customerContact, "\n");
            body += "\n\uD83D\uDD50 *Preferred Time:* ".concat(payload.preferredSlot, "\n");
            if (payload.notes) {
                body += "\n\uD83D\uDCAC *Additional Notes:*\n".concat(payload.notes);
            }
            body += "\n\n\uD83D\uDCCB Listing ID: ".concat(payload.listingId);
            return [2 /*return*/, sendWhatsApp(to, body)];
        });
    });
}
function sendBookingConfirmation(to, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var body;
        return __generator(this, function (_a) {
            body = "\u2705 *Booking Confirmed!*\n\n";
            body += "\uD83C\uDFAB Confirmation: ".concat(payload.confirmationNumber, "\n");
            body += "\uD83D\uDCE6 Booking ID: ".concat(payload.bookingId, "\n\n");
            body += "\uD83C\uDFE0 ".concat(payload.itemTitle, "\n");
            body += "\uD83D\uDC64 Guest: ".concat(payload.customerName, "\n");
            if (payload.checkIn && payload.checkOut) {
                body += "\uD83D\uDCC5 Check-in: ".concat(payload.checkIn, "\n");
                body += "\uD83D\uDCC5 Check-out: ".concat(payload.checkOut, "\n");
            }
            body += "\n\uD83D\uDCB0 Total: ".concat(payload.currency, " \u00A3").concat(payload.totalPrice, "\n");
            body += "\nThank you for your booking!";
            return [2 /*return*/, sendWhatsApp(to, body)];
        });
    });
}
function sendGeneralInquiry(to, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var body;
        return __generator(this, function (_a) {
            body = "\uD83D\uDCE8 *New Inquiry*\n\n";
            body += "\uD83D\uDCCC Subject: ".concat(payload.subject, "\n\n");
            if (payload.customerName) {
                body += "\uD83D\uDC64 From: ".concat(payload.customerName, "\n");
            }
            if (payload.customerContact) {
                body += "\uD83D\uDCF1 Contact: ".concat(payload.customerContact, "\n\n");
            }
            body += "\uD83D\uDCAC Message:\n".concat(payload.message);
            return [2 /*return*/, sendWhatsApp(to, body)];
        });
    });
}
/**
 * Send a booking inquiry to a business via WhatsApp
 * Business can reply with YES [shortCode] [PRICE] or NO [shortCode]
 */
function sendBookingInquiry(to, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var body, _i, _a, _b, key, value;
        return __generator(this, function (_c) {
            body = "\uD83D\uDD14 *New Booking Request*\n\n";
            body += "\uD83D\uDCCD *".concat(payload.listingTitle, "*\n");
            body += "\uD83D\uDCC2 Category: ".concat(payload.listingCategory, "\n\n");
            // Customer info
            body += "\uD83D\uDC64 *Customer:* ".concat(payload.customerName, "\n");
            body += "\uD83D\uDCF1 *Contact:* ".concat(payload.customerPhone, "\n\n");
            // Booking details
            body += "\uD83D\uDCC5 *Date:* ".concat(payload.date, "\n");
            if (payload.time) {
                body += "\uD83D\uDD50 *Time:* ".concat(payload.time, "\n");
            }
            body += "\uD83D\uDC65 *Guests:* ".concat(payload.guests, "\n");
            if (payload.duration) {
                body += "\u23F1\uFE0F *Duration:* ".concat(payload.duration, "\n");
            }
            // Custom fields
            if (payload.customFields && Object.keys(payload.customFields).length > 0) {
                body += "\n\uD83D\uDCCB *Additional Details:*\n";
                for (_i = 0, _a = Object.entries(payload.customFields); _i < _a.length; _i++) {
                    _b = _a[_i], key = _b[0], value = _b[1];
                    body += "\u2022 ".concat(key, ": ").concat(value, "\n");
                }
            }
            // User message
            if (payload.userMessage) {
                body += "\n\uD83D\uDCAC *Customer Note:*\n".concat(payload.userMessage, "\n");
            }
            // Response instructions
            body += "\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n";
            body += "*Reply with:*\n\n";
            body += "\u2705 *YES ".concat(payload.shortCode, " [PRICE]* to confirm\n");
            body += "   Example: YES ".concat(payload.shortCode, " 80\n\n");
            body += "\u274C *NO ".concat(payload.shortCode, "* to decline\n");
            body += "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501";
            return [2 /*return*/, sendWhatsApp(to, body, {
                    bookingId: payload.bookingId,
                    role: "business",
                })];
        });
    });
}
