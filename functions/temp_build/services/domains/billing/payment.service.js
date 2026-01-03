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
exports.paymentService = void 0;
var logger = __importStar(require("firebase-functions/logger"));
var stripe_1 = __importDefault(require("stripe"));
require("firebase-admin/firestore");
var firestore_1 = require("firebase-admin/firestore");
var firebase_1 = require("../../../config/firebase");
var errors_1 = require("../../../utils/errors");
// Lazily initialize Stripe so importing this module never crashes tests or cold-start paths.
// Invariant: external clients must never be created at module scope.
var _stripe = null;
function getStripe() {
    if (_stripe)
        return _stripe;
    var apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new Error("Stripe not configured: STRIPE_SECRET_KEY is missing");
    }
    _stripe = new stripe_1.default(apiKey, { apiVersion: "2025-12-15.clover" });
    return _stripe;
}
exports.paymentService = {
    // 1. Create Payment Intent (The "Invoice")
    createPaymentIntent: function (bookingId, userId) { return __awaiter(void 0, void 0, void 0, function () {
        var bookingRef, bookingSnap, booking, stripe, paymentIntent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bookingRef = firebase_1.db.collection("bookings").doc(bookingId);
                    logger.debug("[Payment] Fetching booking", bookingId);
                    return [4 /*yield*/, bookingRef.get()];
                case 1:
                    bookingSnap = _a.sent();
                    if (!bookingSnap.exists) {
                        console.error("[Payment] Booking not found in Firestore:", bookingId);
                        throw new Error("Booking not found");
                    }
                    booking = bookingSnap.data();
                    // Security Check: Ensure the user requesting payment owns the booking
                    if ((booking === null || booking === void 0 ? void 0 : booking.userId) !== userId) {
                        throw new Error("Unauthorized: You do not own this booking");
                    }
                    if ((booking === null || booking === void 0 ? void 0 : booking.status) === "confirmed") {
                        throw new Error("Booking already paid");
                    }
                    stripe = getStripe();
                    return [4 /*yield*/, stripe.paymentIntents.create({
                            amount: Math.round((booking === null || booking === void 0 ? void 0 : booking.totalPrice) * 100), // Stripe expects cents (e.g. £10.00 = 1000)
                            currency: ((booking === null || booking === void 0 ? void 0 : booking.currency) || "gbp").toLowerCase(),
                            metadata: {
                                bookingId: bookingId, // CRITICAL: Links payment back to Firestore
                                userId: userId,
                            },
                            automatic_payment_methods: {
                                enabled: true,
                            },
                        })];
                case 2:
                    paymentIntent = _a.sent();
                    return [2 /*return*/, {
                            clientSecret: paymentIntent.client_secret,
                            amount: booking === null || booking === void 0 ? void 0 : booking.totalPrice,
                            currency: booking === null || booking === void 0 ? void 0 : booking.currency,
                        }];
            }
        });
    }); },
    // 2. Handle Webhook (The "Receipt")
    handleWebhook: function (signature, rawBody) { return __awaiter(void 0, void 0, void 0, function () {
        var stripe, endpointSecret, event, paymentIntent, bookingId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    stripe = getStripe();
                    endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
                    try {
                        event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
                    }
                    catch (err) {
                        console.error("\u26A0\uFE0F  Webhook signature verification failed.", (0, errors_1.getErrorMessage)(err));
                        throw new Error("Webhook Error");
                    }
                    if (!(event.type === "payment_intent.succeeded")) return [3 /*break*/, 2];
                    paymentIntent = event.data.object;
                    bookingId = paymentIntent.metadata.bookingId;
                    logger.debug("\uD83D\uDCB0 Payment succeeded for Booking ".concat(bookingId));
                    // ATOMIC UPDATE: Mark booking as confirmed
                    return [4 /*yield*/, firebase_1.db.collection("bookings").doc(bookingId).update({
                            status: "confirmed",
                            paymentId: paymentIntent.id,
                            paymentStatus: "paid",
                            updatedAt: firestore_1.FieldValue.serverTimestamp(),
                        })];
                case 1:
                    // ATOMIC UPDATE: Mark booking as confirmed
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/, { received: true }];
            }
        });
    }); },
};
