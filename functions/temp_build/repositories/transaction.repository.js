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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionRepository = void 0;
exports.appendEvent = appendEvent;
var errors_1 = require("../utils/errors");
/**
 * Transaction Repository - Execution Ledger Core
 *
 * Implements atomic state transitions with:
 * - Firestore transactions for consistency
 * - Lock documents for concurrency control
 * - Per-operation idempotency for retry safety
 *
 * Collection paths:
 * - businesses/{businessId}/transactions/{txId}
 * - businesses/{businessId}/transactions/{txId}/events/{eventId}
 * - businesses/{businessId}/resourceLocks/{lockKey}
 * - idempotency/{key}
 */
var firestore_1 = require("firebase-admin/firestore");
var idempotency_1 = require("../types/idempotency");
/**
 * Firestore accessor (lazy).
 *
 * Why:
 * - Avoid module-scope initialization crashes in unit tests (and align with
 *   "no module-scope side effects" where possible).
 * - Allow Jest to mock `getFirestore()` cleanly.
 */
function getDb() {
    return (0, firestore_1.getFirestore)();
}
// Proxy the Firestore instance so existing `db.*` usage stays readable without eager init.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var db = new Proxy({}, {
    get: function (_target, prop) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return getDb()[prop];
    },
});
// ============================================
// COLLECTION PATH HELPERS
// ============================================
var getTransactionsPath = function (businessId) {
    return "businesses/".concat(businessId, "/transactions");
};
var getEventsPath = function (businessId, txId) {
    return "businesses/".concat(businessId, "/transactions/").concat(txId, "/events");
};
var getLocksPath = function (businessId) {
    return "businesses/".concat(businessId, "/resourceLocks");
};
var IDEMPOTENCY_COLLECTION = 'idempotency';
// ============================================
// CONFIRMATION CODE GENERATOR
// ============================================
function generateConfirmationCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 for clarity
    var code = '';
    for (var i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
// ============================================
// REPOSITORY
// ============================================
exports.transactionRepository = {
    // ──────────────────────────────────────────────────────────────────────────
    // CREATE DRAFT
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Create a new transaction in draft status.
     * Draft transactions are not yet held and don't affect availability.
     */
    createDraft: function (params, idempotencyKey) { return __awaiter(void 0, void 0, void 0, function () {
        var businessId, txRef, txId, now, idempKey, existing, existingTx, subtotal, fees, total, transaction, batch, eventRef, event, idempKey;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    businessId = params.businessId;
                    txRef = db.collection(getTransactionsPath(businessId)).doc();
                    txId = txRef.id;
                    now = firestore_1.Timestamp.now();
                    if (!idempotencyKey) return [3 /*break*/, 3];
                    idempKey = "tx_draft:".concat(businessId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, checkIdempotency(idempKey)];
                case 1:
                    existing = _a.sent();
                    if (!existing) return [3 /*break*/, 3];
                    return [4 /*yield*/, exports.transactionRepository.getById(businessId, existing.resultRef)];
                case 2:
                    existingTx = _a.sent();
                    return [2 /*return*/, { success: true, transaction: existingTx }];
                case 3:
                    subtotal = params.lineItems.reduce(function (sum, item) { return sum + item.subtotal; }, 0);
                    fees = 0;
                    total = subtotal + fees;
                    transaction = {
                        id: txId,
                        businessId: businessId,
                        type: params.type,
                        status: 'draft',
                        channel: params.channel,
                        actor: params.actor,
                        lineItems: params.lineItems,
                        timeWindow: params.timeWindow ? {
                            start: firestore_1.Timestamp.fromDate(params.timeWindow.start),
                            end: firestore_1.Timestamp.fromDate(params.timeWindow.end),
                            timezone: params.timeWindow.timezone,
                        } : undefined,
                        currency: params.currency || 'TRY',
                        subtotal: subtotal,
                        fees: fees,
                        total: total,
                        sessionId: params.sessionId,
                        createdAt: now,
                        updatedAt: now,
                    };
                    batch = db.batch();
                    batch.set(txRef, transaction);
                    eventRef = db.collection(getEventsPath(businessId, txId)).doc();
                    event = {
                        type: 'draft_created',
                        actorType: 'system',
                        idempotencyKey: idempotencyKey,
                        createdAt: now,
                        data: { channel: params.channel },
                    };
                    batch.set(eventRef, event);
                    if (!idempotencyKey) return [3 /*break*/, 5];
                    idempKey = "tx_draft:".concat(businessId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, storeIdempotency(idempKey, 'createDraft', businessId, txId)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, batch.commit()];
                case 6:
                    _a.sent();
                    return [2 /*return*/, { success: true, transaction: transaction }];
            }
        });
    }); },
    // ──────────────────────────────────────────────────────────────────────────
    // CREATE HOLD (Atomic with Lock Acquisition)
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Create a hold on a draft transaction.
     * Atomically:
     * 1. Verify transaction is in 'draft' status
     * 2. Acquire resource lock (fail if already held/confirmed)
     * 3. Transition to 'hold' status
     * 4. Append hold_created event
     */
    createHold: function (params, idempotencyKey) { return __awaiter(void 0, void 0, void 0, function () {
        var transactionId, businessId, lockKey, _a, holdDurationMinutes, now, holdExpiresAt, idempKey, existing, existingTx, txRef, lockRef, result, idempKey, updatedTx, err_1;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    transactionId = params.transactionId, businessId = params.businessId, lockKey = params.lockKey, _a = params.holdDurationMinutes, holdDurationMinutes = _a === void 0 ? 10 : _a;
                    now = firestore_1.Timestamp.now();
                    holdExpiresAt = firestore_1.Timestamp.fromMillis(now.toMillis() + holdDurationMinutes * 60 * 1000);
                    if (!idempotencyKey) return [3 /*break*/, 3];
                    idempKey = "tx_hold:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, checkIdempotency(idempKey)];
                case 1:
                    existing = _c.sent();
                    if (!existing) return [3 /*break*/, 3];
                    return [4 /*yield*/, exports.transactionRepository.getById(businessId, transactionId)];
                case 2:
                    existingTx = _c.sent();
                    return [2 /*return*/, {
                            success: true,
                            alreadyProcessed: true,
                            transaction: existingTx,
                            holdExpiresAt: (_b = existingTx === null || existingTx === void 0 ? void 0 : existingTx.holdExpiresAt) === null || _b === void 0 ? void 0 : _b.toDate(),
                        }];
                case 3:
                    txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
                    lockRef = db.collection(getLocksPath(businessId)).doc(lockKey);
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 10, , 11]);
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                            var txDoc, txData, lockDoc, lockData, lock;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(txRef)];
                                    case 1:
                                        txDoc = _a.sent();
                                        if (!txDoc.exists) {
                                            return [2 /*return*/, { success: false, errorCode: 'TRANSACTION_NOT_FOUND' }];
                                        }
                                        txData = txDoc.data();
                                        // Guard: must be in draft status
                                        if (txData.status !== 'draft') {
                                            return [2 /*return*/, {
                                                    success: false,
                                                    errorCode: 'INVALID_STATE',
                                                    error: "Cannot hold: transaction is in '".concat(txData.status, "' status")
                                                }];
                                        }
                                        return [4 /*yield*/, transaction.get(lockRef)];
                                    case 2:
                                        lockDoc = _a.sent();
                                        if (lockDoc.exists) {
                                            lockData = lockDoc.data();
                                            // If lock is held and not expired, fail
                                            if (lockData.status === 'held') {
                                                if (lockData.expiresAt && lockData.expiresAt.toMillis() > now.toMillis()) {
                                                    return [2 /*return*/, {
                                                            success: false,
                                                            errorCode: 'RESOURCE_UNAVAILABLE',
                                                            error: 'Slot is already held by another transaction'
                                                        }];
                                                }
                                                // Lock expired, we can take it
                                            }
                                            else if (lockData.status === 'confirmed') {
                                                return [2 /*return*/, {
                                                        success: false,
                                                        errorCode: 'RESOURCE_UNAVAILABLE',
                                                        error: 'Slot is already booked'
                                                    }];
                                            }
                                        }
                                        lock = {
                                            lockKey: lockKey,
                                            transactionId: transactionId,
                                            status: 'held',
                                            expiresAt: holdExpiresAt,
                                            createdAt: now,
                                            updatedAt: now,
                                        };
                                        transaction.set(lockRef, lock);
                                        // Update transaction
                                        transaction.update(txRef, {
                                            status: 'hold',
                                            holdExpiresAt: holdExpiresAt,
                                            holdDurationMinutes: holdDurationMinutes,
                                            updatedAt: now,
                                        });
                                        return [2 /*return*/, {
                                                success: true,
                                                holdExpiresAt: holdExpiresAt.toDate(),
                                            }];
                                }
                            });
                        }); })];
                case 5:
                    result = _c.sent();
                    if (!result.success) {
                        return [2 /*return*/, result];
                    }
                    // Append event (outside transaction for simplicity)
                    return [4 /*yield*/, appendEvent(businessId, transactionId, {
                            type: 'hold_created',
                            actorType: 'system',
                            idempotencyKey: idempotencyKey,
                            createdAt: firestore_1.Timestamp.now(),
                            data: { lockKey: lockKey, holdDurationMinutes: holdDurationMinutes },
                        })];
                case 6:
                    // Append event (outside transaction for simplicity)
                    _c.sent();
                    if (!idempotencyKey) return [3 /*break*/, 8];
                    idempKey = "tx_hold:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, storeIdempotency(idempKey, 'createHold', transactionId, transactionId)];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8: return [4 /*yield*/, exports.transactionRepository.getById(businessId, transactionId)];
                case 9:
                    updatedTx = _c.sent();
                    return [2 /*return*/, {
                            success: true,
                            transaction: updatedTx,
                            holdExpiresAt: result.holdExpiresAt,
                        }];
                case 10:
                    err_1 = _c.sent();
                    console.error('[Transaction] createHold failed:', err_1);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_1) }];
                case 11: return [2 /*return*/];
            }
        });
    }); },
    // ──────────────────────────────────────────────────────────────────────────
    // CONFIRM TRANSACTION
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Confirm a held transaction.
     * Atomically:
     * 1. Verify transaction is in 'hold' status
     * 2. Verify hold has not expired
     * 3. Transition to 'confirmed' status
     * 4. Update lock to 'confirmed'
     * 5. Append confirmed event
     */
    confirmTransaction: function (params, idempotencyKey) { return __awaiter(void 0, void 0, void 0, function () {
        var transactionId, businessId, actorType, actorId, now, idempKey, existing, existingTx, txRef, confirmationCode, result, idempKey, updatedTx, err_2;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    transactionId = params.transactionId, businessId = params.businessId, actorType = params.actorType, actorId = params.actorId;
                    now = firestore_1.Timestamp.now();
                    if (!idempotencyKey) return [3 /*break*/, 3];
                    idempKey = "tx_confirm:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, checkIdempotency(idempKey)];
                case 1:
                    existing = _b.sent();
                    if (!(existing === null || existing === void 0 ? void 0 : existing.result)) return [3 /*break*/, 3];
                    return [4 /*yield*/, exports.transactionRepository.getById(businessId, transactionId)];
                case 2:
                    existingTx = _b.sent();
                    return [2 /*return*/, {
                            success: true,
                            alreadyProcessed: true,
                            confirmationCode: (_a = existing.result.data) === null || _a === void 0 ? void 0 : _a.confirmationCode,
                            transaction: existingTx,
                        }];
                case 3:
                    txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
                    confirmationCode = generateConfirmationCode();
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 10, , 11]);
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                            var txDoc, txData, locksSnap, lockRef;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(txRef)];
                                    case 1:
                                        txDoc = _a.sent();
                                        if (!txDoc.exists) {
                                            return [2 /*return*/, { success: false, errorCode: 'TRANSACTION_NOT_FOUND' }];
                                        }
                                        txData = txDoc.data();
                                        // Guard: must be in hold status
                                        if (txData.status !== 'hold') {
                                            return [2 /*return*/, {
                                                    success: false,
                                                    errorCode: 'INVALID_STATE',
                                                    error: "Cannot confirm: transaction is in '".concat(txData.status, "' status")
                                                }];
                                        }
                                        // Guard: hold must not be expired
                                        if (txData.holdExpiresAt && txData.holdExpiresAt.toMillis() <= now.toMillis()) {
                                            return [2 /*return*/, {
                                                    success: false,
                                                    errorCode: 'HOLD_EXPIRED',
                                                    error: 'Hold has expired'
                                                }];
                                        }
                                        // Update transaction
                                        transaction.update(txRef, {
                                            status: 'confirmed',
                                            confirmationCode: confirmationCode,
                                            confirmedAt: now,
                                            updatedAt: now,
                                        });
                                        return [4 /*yield*/, db.collection(getLocksPath(businessId))
                                                .where('transactionId', '==', transactionId)
                                                .where('status', '==', 'held')
                                                .limit(1)
                                                .get()];
                                    case 2:
                                        locksSnap = _a.sent();
                                        if (!locksSnap.empty) {
                                            lockRef = locksSnap.docs[0].ref;
                                            transaction.update(lockRef, {
                                                status: 'confirmed',
                                                expiresAt: firestore_1.FieldValue.delete(),
                                                updatedAt: now,
                                            });
                                        }
                                        return [2 /*return*/, { success: true }];
                                }
                            });
                        }); })];
                case 5:
                    result = _b.sent();
                    if (!result.success) {
                        return [2 /*return*/, result];
                    }
                    // Append event
                    return [4 /*yield*/, appendEvent(businessId, transactionId, {
                            type: 'confirmed',
                            actorType: actorType,
                            actorId: actorId,
                            idempotencyKey: idempotencyKey,
                            createdAt: firestore_1.Timestamp.now(),
                            data: { confirmationCode: confirmationCode },
                        })];
                case 6:
                    // Append event
                    _b.sent();
                    if (!idempotencyKey) return [3 /*break*/, 8];
                    idempKey = "tx_confirm:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, storeIdempotency(idempKey, 'confirmTransaction', transactionId, transactionId, {
                            success: true,
                            data: { confirmationCode: confirmationCode },
                        })];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [4 /*yield*/, exports.transactionRepository.getById(businessId, transactionId)];
                case 9:
                    updatedTx = _b.sent();
                    return [2 /*return*/, {
                            success: true,
                            confirmationCode: confirmationCode,
                            transaction: updatedTx,
                        }];
                case 10:
                    err_2 = _b.sent();
                    console.error('[Transaction] confirmTransaction failed:', err_2);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_2) }];
                case 11: return [2 /*return*/];
            }
        });
    }); },
    // ──────────────────────────────────────────────────────────────────────────
    // RELEASE HOLD
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Release a hold without confirming.
     * Moves transaction to 'cancelled' and releases the lock.
     */
    releaseHold: function (businessId, transactionId, reason, idempotencyKey) { return __awaiter(void 0, void 0, void 0, function () {
        var now, idempKey, existing, txRef, result, idempKey, err_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = firestore_1.Timestamp.now();
                    if (!idempotencyKey) return [3 /*break*/, 2];
                    idempKey = "tx_release:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, checkIdempotency(idempKey)];
                case 1:
                    existing = _a.sent();
                    if (existing) {
                        return [2 /*return*/, { success: true, alreadyProcessed: true }];
                    }
                    _a.label = 2;
                case 2:
                    txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 8, , 9]);
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                            var txDoc, txData, locksSnap;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(txRef)];
                                    case 1:
                                        txDoc = _a.sent();
                                        if (!txDoc.exists) {
                                            return [2 /*return*/, { success: false, errorCode: 'TRANSACTION_NOT_FOUND' }];
                                        }
                                        txData = txDoc.data();
                                        // Guard: must be in hold status
                                        if (txData.status !== 'hold') {
                                            return [2 /*return*/, {
                                                    success: false,
                                                    errorCode: 'INVALID_STATE',
                                                    error: "Cannot release: transaction is in '".concat(txData.status, "' status")
                                                }];
                                        }
                                        // Update transaction
                                        transaction.update(txRef, {
                                            status: 'cancelled',
                                            cancelledAt: now,
                                            updatedAt: now,
                                        });
                                        return [4 /*yield*/, db.collection(getLocksPath(businessId))
                                                .where('transactionId', '==', transactionId)
                                                .limit(1)
                                                .get()];
                                    case 2:
                                        locksSnap = _a.sent();
                                        if (!locksSnap.empty) {
                                            transaction.delete(locksSnap.docs[0].ref);
                                        }
                                        return [2 /*return*/, { success: true }];
                                }
                            });
                        }); })];
                case 4:
                    result = _a.sent();
                    if (!result.success) {
                        return [2 /*return*/, result];
                    }
                    // Append event
                    return [4 /*yield*/, appendEvent(businessId, transactionId, {
                            type: 'hold_released',
                            actorType: 'system',
                            idempotencyKey: idempotencyKey,
                            createdAt: firestore_1.Timestamp.now(),
                            data: { reason: reason },
                        })];
                case 5:
                    // Append event
                    _a.sent();
                    if (!idempotencyKey) return [3 /*break*/, 7];
                    idempKey = "tx_release:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, storeIdempotency(idempKey, 'releaseHold', transactionId, transactionId)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [2 /*return*/, { success: true }];
                case 8:
                    err_3 = _a.sent();
                    console.error('[Transaction] releaseHold failed:', err_3);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_3) }];
                case 9: return [2 /*return*/];
            }
        });
    }); },
    // ──────────────────────────────────────────────────────────────────────────
    // CANCEL TRANSACTION
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Cancel a confirmed transaction.
     * Does NOT delete the lock (keep for audit).
     */
    cancelTransaction: function (params, idempotencyKey) { return __awaiter(void 0, void 0, void 0, function () {
        var transactionId, businessId, reason, actorType, actorId, now, idempKey, existing, txRef, result, idempKey, err_4;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transactionId = params.transactionId, businessId = params.businessId, reason = params.reason, actorType = params.actorType, actorId = params.actorId;
                    now = firestore_1.Timestamp.now();
                    if (!idempotencyKey) return [3 /*break*/, 2];
                    idempKey = "tx_cancel:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, checkIdempotency(idempKey)];
                case 1:
                    existing = _a.sent();
                    if (existing) {
                        return [2 /*return*/, { success: true, alreadyProcessed: true }];
                    }
                    _a.label = 2;
                case 2:
                    txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 8, , 9]);
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                            var txDoc, txData;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(txRef)];
                                    case 1:
                                        txDoc = _a.sent();
                                        if (!txDoc.exists) {
                                            return [2 /*return*/, { success: false, errorCode: 'TRANSACTION_NOT_FOUND' }];
                                        }
                                        txData = txDoc.data();
                                        // Guard: can cancel from hold or confirmed
                                        if (txData.status !== 'hold' && txData.status !== 'confirmed') {
                                            return [2 /*return*/, {
                                                    success: false,
                                                    errorCode: 'INVALID_STATE',
                                                    error: "Cannot cancel: transaction is in '".concat(txData.status, "' status")
                                                }];
                                        }
                                        // Update transaction
                                        transaction.update(txRef, {
                                            status: 'cancelled',
                                            cancelledAt: now,
                                            updatedAt: now,
                                        });
                                        return [2 /*return*/, { success: true }];
                                }
                            });
                        }); })];
                case 4:
                    result = _a.sent();
                    if (!result.success) {
                        return [2 /*return*/, result];
                    }
                    // Append event
                    return [4 /*yield*/, appendEvent(businessId, transactionId, {
                            type: 'cancelled',
                            actorType: actorType,
                            actorId: actorId,
                            idempotencyKey: idempotencyKey,
                            createdAt: firestore_1.Timestamp.now(),
                            data: { reason: reason },
                        })];
                case 5:
                    // Append event
                    _a.sent();
                    if (!idempotencyKey) return [3 /*break*/, 7];
                    idempKey = "tx_cancel:".concat(transactionId, ":").concat(idempotencyKey);
                    return [4 /*yield*/, storeIdempotency(idempKey, 'cancelTransaction', transactionId, transactionId)];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [2 /*return*/, { success: true }];
                case 8:
                    err_4 = _a.sent();
                    console.error('[Transaction] cancelTransaction failed:', err_4);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_4) }];
                case 9: return [2 /*return*/];
            }
        });
    }); },
    // ──────────────────────────────────────────────────────────────────────────
    // EXPIRE HOLD (Called by scheduled worker)
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Expire a held transaction.
     * Called by the scheduled expiry worker, not directly by agents.
     */
    expireHold: function (businessId, transactionId) { return __awaiter(void 0, void 0, void 0, function () {
        var now, txRef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    now = firestore_1.Timestamp.now();
                    txRef = db.collection(getTransactionsPath(businessId)).doc(transactionId);
                    return [4 /*yield*/, db.runTransaction(function (transaction) { return __awaiter(void 0, void 0, void 0, function () {
                            var txDoc, txData, locksSnap;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, transaction.get(txRef)];
                                    case 1:
                                        txDoc = _a.sent();
                                        if (!txDoc.exists)
                                            return [2 /*return*/];
                                        txData = txDoc.data();
                                        // Only expire if still in hold
                                        if (txData.status !== 'hold')
                                            return [2 /*return*/];
                                        // Update transaction
                                        transaction.update(txRef, {
                                            status: 'expired',
                                            expiredAt: now,
                                            updatedAt: now,
                                        });
                                        return [4 /*yield*/, db.collection(getLocksPath(businessId))
                                                .where('transactionId', '==', transactionId)
                                                .limit(1)
                                                .get()];
                                    case 2:
                                        locksSnap = _a.sent();
                                        if (!locksSnap.empty) {
                                            transaction.delete(locksSnap.docs[0].ref);
                                        }
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 1:
                    _a.sent();
                    // Append event
                    return [4 /*yield*/, appendEvent(businessId, transactionId, {
                            type: 'expired',
                            actorType: 'system',
                            createdAt: firestore_1.Timestamp.now(),
                            data: { reason: 'Hold expired without confirmation' },
                        })];
                case 2:
                    // Append event
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    // ──────────────────────────────────────────────────────────────────────────
    // READ OPERATIONS
    // ──────────────────────────────────────────────────────────────────────────
    getById: function (businessId, transactionId) { return __awaiter(void 0, void 0, void 0, function () {
        var doc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.collection(getTransactionsPath(businessId)).doc(transactionId).get()];
                case 1:
                    doc = _a.sent();
                    if (!doc.exists)
                        return [2 /*return*/, null];
                    return [2 /*return*/, __assign({ id: doc.id }, doc.data())];
            }
        });
    }); },
    getExpiredHolds: function () {
        var args_1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args_1[_i] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (limit) {
            var now, snapshot;
            if (limit === void 0) { limit = 100; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = firestore_1.Timestamp.now();
                        return [4 /*yield*/, db.collectionGroup('transactions')
                                .where('status', '==', 'hold')
                                .where('holdExpiresAt', '<=', now)
                                .limit(limit)
                                .get()];
                    case 1:
                        snapshot = _a.sent();
                        return [2 /*return*/, snapshot.docs.map(function (doc) {
                                // Path: businesses/{businessId}/transactions/{txId}
                                var pathParts = doc.ref.path.split('/');
                                return {
                                    businessId: pathParts[1],
                                    txId: doc.id,
                                };
                            })];
                }
            });
        });
    },
    getEvents: function (businessId, transactionId) { return __awaiter(void 0, void 0, void 0, function () {
        var snapshot;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.collection(getEventsPath(businessId, transactionId))
                        .orderBy('createdAt', 'asc')
                        .get()];
                case 1:
                    snapshot = _a.sent();
                    return [2 /*return*/, snapshot.docs.map(function (doc) { return (__assign({ id: doc.id }, doc.data())); })];
            }
        });
    }); },
};
// ============================================
// INTERNAL HELPERS
// ============================================
function appendEvent(businessId, transactionId, event) {
    return __awaiter(this, void 0, void 0, function () {
        var eventRef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.collection(getEventsPath(businessId, transactionId)).add(event)];
                case 1:
                    eventRef = _a.sent();
                    return [2 /*return*/, eventRef.id];
            }
        });
    });
}
function checkIdempotency(key) {
    return __awaiter(this, void 0, void 0, function () {
        var doc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.collection(IDEMPOTENCY_COLLECTION).doc(key).get()];
                case 1:
                    doc = _a.sent();
                    if (!doc.exists)
                        return [2 /*return*/, null];
                    return [2 /*return*/, doc.data()];
            }
        });
    });
}
function storeIdempotency(key, op, scopeId, resultRef, result) {
    return __awaiter(this, void 0, void 0, function () {
        var record;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    record = {
                        key: key,
                        op: op,
                        scopeId: scopeId,
                        resultRef: resultRef,
                        result: result,
                        createdAt: firestore_1.Timestamp.now(),
                        expiresAt: firestore_1.Timestamp.fromDate((0, idempotency_1.calculateIdempotencyExpiry)()),
                    };
                    return [4 /*yield*/, db.collection(IDEMPOTENCY_COLLECTION).doc(key).set(record)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
