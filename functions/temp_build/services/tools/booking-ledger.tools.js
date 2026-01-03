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
exports.createHeldBooking = createHeldBooking;
exports.resolveBusinessId = resolveBusinessId;
var errors_1 = require("../../utils/errors");
/**
 * Booking Ledger Tools
 *
 * Transaction-aware booking creation that uses the execution ledger.
 * Creates draft → hold flow; NEVER confirms directly.
 *
 * Confirmation must come from the confirmation gate in the controller.
 */
var transaction_repository_1 = require("../../repositories/transaction.repository");
var listing_repository_1 = require("../../repositories/listing.repository");
var firebase_1 = require("../../config/firebase");
// ============================================
// LOCK KEY DERIVATION (Extensible Format)
// ============================================
/**
 * Canonical lock key format (extensible for capacity tokens later):
 * {businessId}:offering:{offeringId}:{YYYY-MM-DDTHH:MM}
 *
 * Future capacity token format:
 * {businessId}:offering:{offeringId}:{YYYY-MM-DDTHH:MM}:token:{N}
 *
 * Semantics: Single-capacity slot locks for pilot.
 * When capacity is added, tokens 1..N can be allocated without migration.
 */
function deriveLockKey(businessId, offeringId, date, time, slotDurationMinutes) {
    if (slotDurationMinutes === void 0) { slotDurationMinutes = 15; }
    // Normalize time to slot boundaries
    var _a = time.split(':').map(Number), hours = _a[0], mins = _a[1];
    var normalizedMins = Math.floor(mins / slotDurationMinutes) * slotDurationMinutes;
    var normalizedTime = "".concat(hours.toString().padStart(2, '0'), ":").concat(normalizedMins.toString().padStart(2, '0'));
    // ISO-like format for start time
    var startTime = "".concat(date, "T").concat(normalizedTime);
    return "".concat(businessId, ":offering:").concat(offeringId, ":").concat(startTime);
}
// ============================================
// MAIN FUNCTION
// ============================================
/**
 * Create a held booking transaction.
 *
 * Flow:
 * 1. Validate params
 * 2. Create draft transaction (with actor.phone for notifications)
 * 3. Create hold with lock
 * 4. Return pending action for session storage
 *
 * DOES NOT CONFIRM - confirmation is a second step via the gate.
 */
function createHeldBooking(params) {
    return __awaiter(this, void 0, void 0, function () {
        var businessId, offeringId, offeringName, channel, actor, date, time, _a, partySize, notes, _b, unitPrice, _c, currency, idempotencyKey, _d, holdDurationMinutes, _e, slotDurationMinutes, startDateTime, endDateTime, enrichedActor, userDoc, userData, err_1, draftResult, txId, lockKey, holdResult, formattedDate, summary, confirmationPrompt, pendingAction, err_2;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    businessId = params.businessId, offeringId = params.offeringId, offeringName = params.offeringName, channel = params.channel, actor = params.actor, date = params.date, time = params.time, _a = params.partySize, partySize = _a === void 0 ? 1 : _a, notes = params.notes, _b = params.unitPrice, unitPrice = _b === void 0 ? 0 : _b, _c = params.currency, currency = _c === void 0 ? 'TRY' : _c, idempotencyKey = params.idempotencyKey, _d = params.holdDurationMinutes, holdDurationMinutes = _d === void 0 ? 10 : _d, _e = params.slotDurationMinutes, slotDurationMinutes = _e === void 0 ? 15 : _e;
                    // Validate required fields
                    if (!businessId || !offeringId || !date || !time) {
                        return [2 /*return*/, {
                                success: false,
                                errorCode: 'INVALID_PARAMS',
                                error: 'Missing required fields: businessId, offeringId, date, time',
                            }];
                    }
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 8, , 9]);
                    startDateTime = new Date("".concat(date, "T").concat(time, ":00"));
                    endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
                    if (isNaN(startDateTime.getTime())) {
                        return [2 /*return*/, {
                                success: false,
                                errorCode: 'INVALID_PARAMS',
                                error: "Invalid date/time: ".concat(date, " ").concat(time),
                            }];
                    }
                    enrichedActor = __assign({}, actor);
                    if (!(actor.userId && !actor.phoneE164)) return [3 /*break*/, 5];
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, firebase_1.db.collection('users').doc(actor.userId).get()];
                case 3:
                    userDoc = _f.sent();
                    userData = userDoc.data();
                    if ((userData === null || userData === void 0 ? void 0 : userData.phone) || (userData === null || userData === void 0 ? void 0 : userData.phoneNumber)) {
                        enrichedActor.phoneE164 = userData.phone || userData.phoneNumber;
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _f.sent();
                    console.warn('[BookingLedger] Failed to enrich actor phone:', err_1);
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, transaction_repository_1.transactionRepository.createDraft({
                        businessId: businessId,
                        type: 'booking',
                        channel: channel,
                        actor: enrichedActor,
                        lineItems: [{
                                offeringId: offeringId,
                                offeringName: offeringName,
                                quantity: partySize,
                                unitPrice: unitPrice,
                                subtotal: unitPrice * partySize,
                            }],
                        timeWindow: {
                            start: startDateTime,
                            end: endDateTime,
                        },
                        currency: currency,
                    }, idempotencyKey ? "draft:".concat(idempotencyKey) : undefined)];
                case 6:
                    draftResult = _f.sent();
                    if (!draftResult.success || !draftResult.transaction) {
                        return [2 /*return*/, {
                                success: false,
                                errorCode: 'INTERNAL_ERROR',
                                error: 'Failed to create draft transaction',
                            }];
                    }
                    txId = draftResult.transaction.id;
                    lockKey = deriveLockKey(businessId, offeringId, date, time, slotDurationMinutes);
                    return [4 /*yield*/, transaction_repository_1.transactionRepository.createHold({
                            transactionId: txId,
                            businessId: businessId,
                            lockKey: lockKey,
                            holdDurationMinutes: holdDurationMinutes,
                        }, idempotencyKey ? "hold:".concat(idempotencyKey) : undefined)];
                case 7:
                    holdResult = _f.sent();
                    if (!holdResult.success) {
                        // Map error codes
                        if (holdResult.errorCode === 'RESOURCE_UNAVAILABLE') {
                            return [2 /*return*/, {
                                    success: false,
                                    errorCode: 'RESOURCE_UNAVAILABLE',
                                    error: holdResult.error || 'This time slot is already reserved',
                                }];
                        }
                        return [2 /*return*/, {
                                success: false,
                                errorCode: 'INTERNAL_ERROR',
                                error: holdResult.error || 'Failed to create hold',
                            }];
                    }
                    formattedDate = new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    });
                    summary = "".concat(offeringName, " for ").concat(partySize, " on ").concat(formattedDate, " at ").concat(time);
                    confirmationPrompt = "I've reserved a slot for you:\n\n" +
                        "\uD83D\uDCCD **".concat(offeringName, "**\n") +
                        "\uD83D\uDCC5 ".concat(formattedDate, " at ").concat(time, "\n") +
                        "\uD83D\uDC65 Party of ".concat(partySize, "\n") +
                        (notes ? "\uD83D\uDCDD ".concat(notes, "\n") : '') +
                        "\n\u23F0 This hold expires in ".concat(holdDurationMinutes, " minutes.\n\n") +
                        "**Reply YES to confirm or NO to cancel.**";
                    pendingAction = {
                        kind: 'confirm_transaction',
                        businessId: businessId,
                        txId: txId,
                        holdExpiresAt: holdResult.holdExpiresAt,
                        summary: summary,
                        expectedUserId: actor.userId,
                        createdAt: new Date(),
                    };
                    return [2 /*return*/, {
                            success: true,
                            txId: txId,
                            holdExpiresAt: holdResult.holdExpiresAt,
                            confirmationPrompt: confirmationPrompt,
                            pendingAction: pendingAction,
                        }];
                case 8:
                    err_2 = _f.sent();
                    console.error('[BookingLedger] createHeldBooking failed:', err_2);
                    return [2 /*return*/, {
                            success: false,
                            errorCode: 'INTERNAL_ERROR',
                            error: (0, errors_1.getErrorMessage)(err_2) || 'Internal error',
                        }];
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Look up businessId from an itemId (listing).
 * FAIL CLOSED: If businessId cannot be determined, returns error.
 * DO NOT silently use itemId as businessId - that creates orphan data.
 */
function resolveBusinessId(itemId) {
    return __awaiter(this, void 0, void 0, function () {
        var listing, businessId, businessDoc, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, listing_repository_1.listingRepository.getById(itemId)];
                case 1:
                    listing = _a.sent();
                    if (listing) {
                        businessId = listing.businessId
                            || listing.ownerId
                            || listing.ownerUid;
                        if (businessId) {
                            return [2 /*return*/, { success: true, businessId: businessId }];
                        }
                    }
                    return [4 /*yield*/, firebase_1.db.collection('businesses').doc(itemId).get()];
                case 2:
                    businessDoc = _a.sent();
                    if (businessDoc.exists) {
                        return [2 /*return*/, { success: true, businessId: itemId }];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.warn("[BookingLedger] Failed to lookup businessId for ".concat(itemId, ":"), err_3);
                    return [3 /*break*/, 4];
                case 4: 
                // FAIL CLOSED: Do not return itemId as fallback
                return [2 /*return*/, {
                        success: false,
                        errorCode: 'BUSINESS_CONTEXT_REQUIRED',
                        error: "Cannot determine business for item ".concat(itemId, ". Please select a business first."),
                    }];
            }
        });
    });
}
