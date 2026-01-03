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
exports.dispatchRepository = void 0;
var firebase_1 = require("../../../config/firebase");
var COLLECTION = "dispatchMessages";
function nowIso() {
    return new Date().toISOString();
}
exports.dispatchRepository = {
    ref: function (id) {
        return firebase_1.db.collection(COLLECTION).doc(id);
    },
    get: function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var doc;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db.collection(COLLECTION).doc(id).get()];
                    case 1:
                        doc = _a.sent();
                        if (!doc.exists)
                            return [2 /*return*/, null];
                        return [2 /*return*/, doc.data()];
                }
            });
        });
    },
    /**
     * Reserve/claim a dispatch for sending (fail-closed if transaction fails).
     * Deterministic doc id = idempotencyKey.
     */
    reserveForSend: function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var idempotencyKey, createIfMissing, attemptId, maxAttempts, ref;
            var _this = this;
            return __generator(this, function (_a) {
                idempotencyKey = params.idempotencyKey, createIfMissing = params.createIfMissing, attemptId = params.attemptId, maxAttempts = params.maxAttempts;
                ref = firebase_1.db.collection(COLLECTION).doc(idempotencyKey);
                return [2 /*return*/, firebase_1.db.runTransaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                        var now, doc, record, existing, patched_1, patched;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    now = nowIso();
                                    return [4 /*yield*/, tx.get(ref)];
                                case 1:
                                    doc = _a.sent();
                                    if (!doc.exists) {
                                        record = __assign(__assign({}, createIfMissing), { id: idempotencyKey, idempotencyKey: idempotencyKey, status: "sending", attempts: 1, lastAttemptId: attemptId, createdAt: now, updatedAt: now });
                                        tx.set(ref, record);
                                        return [2 /*return*/, { canSend: true, record: record }];
                                    }
                                    existing = doc.data();
                                    // Terminal: already sent
                                    if (existing.status === "sent") {
                                        return [2 /*return*/, { canSend: false, record: existing }];
                                    }
                                    // Idempotent: same attemptId already claimed
                                    if (existing.lastAttemptId === attemptId) {
                                        return [2 /*return*/, { canSend: false, record: existing }];
                                    }
                                    // Max attempts exceeded => fail-closed (no more sends)
                                    if ((existing.attempts || 0) >= maxAttempts) {
                                        patched_1 = __assign(__assign({}, existing), { status: "failed", lastError: existing.lastError || "Max attempts exceeded", updatedAt: now });
                                        tx.update(ref, patched_1);
                                        return [2 /*return*/, { canSend: false, record: patched_1 }];
                                    }
                                    patched = __assign(__assign({}, existing), { status: "sending", attempts: (existing.attempts || 0) + 1, lastAttemptId: attemptId, updatedAt: now });
                                    tx.update(ref, patched);
                                    return [2 /*return*/, { canSend: true, record: patched }];
                            }
                        });
                    }); })];
            });
        });
    },
    markSent: function (idempotencyKey, patch) {
        return __awaiter(this, void 0, void 0, function () {
            var now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = nowIso();
                        return [4 /*yield*/, firebase_1.db.collection(COLLECTION).doc(idempotencyKey).update({
                                status: "sent",
                                providerMessageId: patch.providerMessageId,
                                lastError: null,
                                updatedAt: now,
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    markFailed: function (idempotencyKey, error) {
        return __awaiter(this, void 0, void 0, function () {
            var now;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = nowIso();
                        return [4 /*yield*/, firebase_1.db.collection(COLLECTION).doc(idempotencyKey).update({
                                status: "failed",
                                lastError: error,
                                updatedAt: now,
                            })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
};
