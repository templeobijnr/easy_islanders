"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.bookingTools = void 0;
var errors_1 = require("../../utils/errors");
/**
 * Booking & Reservation Tools
 *
 * Handles property viewings, booking creation, and payment processing.
 */
var logger = __importStar(require("firebase-functions/logger"));
var firestore_1 = require("firebase-admin/firestore");
var listing_repository_1 = require("../../repositories/listing.repository");
var firebase_1 = require("../../config/firebase");
var booking_ledger_tools_1 = require("./booking-ledger.tools");
var toolContext_1 = require("./toolContext");
var now = firestore_1.FieldValue.serverTimestamp;
function mapToLedgerChannel(channel) {
    if (channel === "whatsapp")
        return "whatsapp";
    if (channel === "discover")
        return "discover_chat";
    return "app_chat";
}
exports.bookingTools = {
    /**
     * Create a booking for a listing (short-term stay, car rental, etc.)
     * Persists a booking document and returns a receipt payload.
     */
    createBooking: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, userId, item, bookingId, confirmationNumber, itemData, currency, totalPrice, extArgs, bookingData;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
                    userId = ctx.userId;
                    if (!userId) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Unauthorized: User ID required",
                            }];
                    }
                    return [4 /*yield*/, listing_repository_1.listingRepository.getById(args.itemId)];
                case 1:
                    item = _a.sent();
                    if (!item) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Item not found: ".concat(args.itemId),
                            }];
                    }
                    bookingId = "ORD-".concat(Date.now());
                    confirmationNumber = "CFM-".concat(Date.now());
                    itemData = item;
                    currency = itemData.currency || "GBP";
                    totalPrice = typeof itemData.price === "number"
                        ? itemData.price
                        : parseFloat(String(itemData.price)) || 0;
                    extArgs = args;
                    bookingData = {
                        id: bookingId,
                        userId: userId,
                        itemId: item.id,
                        domain: item.domain,
                        itemTitle: item.title,
                        itemImage: item.imageUrl,
                        totalPrice: totalPrice,
                        currency: currency,
                        customerName: args.customerName,
                        customerContact: args.customerContact,
                        specialRequests: args.specialRequests || "",
                        needsPickup: extArgs.needsPickup || false,
                        checkIn: extArgs.checkInDate || args.checkIn || null,
                        checkOut: extArgs.checkOutDate || args.checkOut || null,
                        viewingTime: extArgs.viewingSlot || null,
                        status: "payment_pending",
                        confirmationNumber: confirmationNumber,
                        createdAt: now(),
                        updatedAt: now(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection("bookings").doc(bookingId).set(bookingData)];
                case 2:
                    _a.sent();
                    logger.debug("\u2705 Booking created: ".concat(bookingId, " for ").concat(item.title));
                    return [2 /*return*/, __assign(__assign({ success: true }, bookingData), { receipt: {
                                bookingId: bookingId,
                                confirmationNumber: confirmationNumber,
                                itemTitle: item.title,
                                category: itemData.category || itemData.subCategory || item.domain,
                                total: totalPrice,
                                currency: currency,
                            } })];
            }
        });
    }); },
    /**
     * Schedule a property viewing with the owner/agent
     */
    scheduleViewing: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, userId, item, vrId, itemData, ownerContact, payload, sendViewingRequest, err_1, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
                    userId = ctx.userId;
                    if (!userId) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Unauthorized: User ID required",
                            }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, listing_repository_1.listingRepository.getById(args.listingId)];
                case 2:
                    item = _a.sent();
                    if (!item) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Listing not found: ".concat(args.listingId),
                            }];
                    }
                    vrId = "VR-".concat(Date.now());
                    itemData = item;
                    ownerContact = itemData.agentPhone ||
                        itemData.ownerContact ||
                        itemData.whatsappNumber;
                    payload = {
                        id: vrId,
                        listingId: args.listingId,
                        listingTitle: item.title,
                        listingLocation: item.location,
                        listingOwnerContact: ownerContact,
                        customerName: args.customerName,
                        customerContact: args.customerContact,
                        preferredSlot: args.preferredSlot,
                        notes: args.notes || "",
                        userId: userId,
                        status: "pending",
                        createdAt: now(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection("viewingRequests").doc(vrId).set(payload)];
                case 3:
                    _a.sent();
                    if (!ownerContact) return [3 /*break*/, 8];
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 7, , 8]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("../twilio.service")); })];
                case 5:
                    sendViewingRequest = (_a.sent()).sendViewingRequest;
                    return [4 /*yield*/, sendViewingRequest(ownerContact, {
                            listingTitle: item.title,
                            listingId: args.listingId,
                            listingLocation: item.location,
                            customerName: args.customerName,
                            customerContact: args.customerContact,
                            preferredSlot: args.preferredSlot,
                            notes: args.notes,
                        })];
                case 6:
                    _a.sent();
                    logger.debug("\u2705 Viewing request sent via WhatsApp to ".concat(ownerContact));
                    return [3 /*break*/, 8];
                case 7:
                    err_1 = _a.sent();
                    console.error("⚠️ Failed to send WhatsApp notification:", err_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, {
                        success: true,
                        viewingRequest: payload,
                    }];
                case 9:
                    err_2 = _a.sent();
                    console.error("🔴 [ScheduleViewing] Failed:", err_2);
                    return [2 /*return*/, {
                            success: false,
                            error: (0, errors_1.getErrorMessage)(err_2) || "Failed to schedule viewing",
                        }];
                case 10: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Create a payment intent for a booking
     */
    createPaymentIntent: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, userId, paymentService, intent, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
                    userId = ctx.userId;
                    if (!userId) {
                        return [2 /*return*/, {
                                success: false,
                                error: "Unauthorized: User ID required",
                            }];
                    }
                    if (!args.bookingId) {
                        return [2 /*return*/, {
                                success: false,
                                error: "bookingId is required",
                            }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require("../payment.service")); })];
                case 2:
                    paymentService = (_a.sent()).paymentService;
                    return [4 /*yield*/, paymentService.createPaymentIntent(args.bookingId, userId)];
                case 3:
                    intent = _a.sent();
                    return [2 /*return*/, {
                            success: true,
                            bookingId: args.bookingId,
                            payment: intent,
                        }];
                case 4:
                    err_3 = _a.sent();
                    console.error("🔴 [CreatePaymentIntent] Failed:", err_3);
                    return [2 /*return*/, {
                            success: false,
                            error: (0, errors_1.getErrorMessage)(err_3) || "Failed to create payment intent",
                        }];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Initiate a booking using the execution ledger (draft → hold).
     * Returns a pendingAction that must be confirmed via YES/NO gate.
     *
     * This is the channel-agnostic equivalent of the controller-specific booking flow.
     */
    initiateBooking: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, userId, itemId, businessResult, today, date, time, partySize, holdResult;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
                    userId = ctx.userId;
                    if (!userId) {
                        return [2 /*return*/, { success: false, error: "Unauthorized: User ID required" }];
                    }
                    itemId = (args === null || args === void 0 ? void 0 : args.itemId) || (args === null || args === void 0 ? void 0 : args.listingId) || (args === null || args === void 0 ? void 0 : args.offeringId);
                    if (!itemId) {
                        return [2 /*return*/, { success: false, error: "itemId is required" }];
                    }
                    return [4 /*yield*/, (0, booking_ledger_tools_1.resolveBusinessId)(itemId)];
                case 1:
                    businessResult = _c.sent();
                    if (!businessResult.success) {
                        return [2 /*return*/, {
                                success: false,
                                error: businessResult.error,
                                errorCode: businessResult.errorCode,
                            }];
                    }
                    today = new Date().toISOString().split("T")[0];
                    date = (args === null || args === void 0 ? void 0 : args.date) || (args === null || args === void 0 ? void 0 : args.checkInDate) || today;
                    time = (args === null || args === void 0 ? void 0 : args.time) || "12:00";
                    partySize = (args === null || args === void 0 ? void 0 : args.guests) || (args === null || args === void 0 ? void 0 : args.partySize) || 1;
                    return [4 /*yield*/, (0, booking_ledger_tools_1.createHeldBooking)({
                            businessId: businessResult.businessId,
                            offeringId: itemId,
                            offeringName: (args === null || args === void 0 ? void 0 : args.itemTitle) || (args === null || args === void 0 ? void 0 : args.offeringName) || "Booking",
                            channel: mapToLedgerChannel(ctx.channel),
                            actor: {
                                userId: userId,
                                name: args.customerName,
                                phoneE164: (_a = ctx.actor) === null || _a === void 0 ? void 0 : _a.phoneE164,
                            },
                            date: date,
                            time: time,
                            partySize: partySize,
                            notes: (args === null || args === void 0 ? void 0 : args.specialRequests) || (args === null || args === void 0 ? void 0 : args.notes),
                            idempotencyKey: "booking:".concat(ctx.sessionId || "no-session", ":").concat(itemId, ":").concat(date, ":").concat(time),
                        })];
                case 2:
                    holdResult = _c.sent();
                    if (!holdResult.success) {
                        return [2 /*return*/, {
                                success: false,
                                error: holdResult.error,
                                errorCode: holdResult.errorCode,
                                unavailable: holdResult.errorCode === "RESOURCE_UNAVAILABLE",
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            awaitingConfirmation: true,
                            transactionId: holdResult.txId,
                            holdExpiresAt: (_b = holdResult.holdExpiresAt) === null || _b === void 0 ? void 0 : _b.toISOString(),
                            confirmationPrompt: holdResult.confirmationPrompt,
                            pendingAction: holdResult.pendingAction,
                        }];
            }
        });
    }); },
};
