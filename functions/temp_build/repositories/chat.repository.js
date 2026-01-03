"use strict";
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
exports.chatRepository = void 0;
var firestore_1 = require("firebase-admin/firestore");
var firebase_1 = require("../config/firebase");
exports.chatRepository = {
    // 1. Get or Create Session Metadata
    getOrCreateSession: function (sessionId, userId, agentId) { return __awaiter(void 0, void 0, void 0, function () {
        var id, docRef, doc;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    id = sessionId || "sess_".concat(userId, "_").concat(Date.now());
                    docRef = firebase_1.db.collection('chatSessions').doc(id);
                    if (!sessionId) return [3 /*break*/, 2];
                    return [4 /*yield*/, docRef.get()];
                case 1:
                    doc = _a.sent();
                    if (doc.exists)
                        return [2 /*return*/, id];
                    _a.label = 2;
                case 2: 
                // Create new session metadata
                return [4 /*yield*/, docRef.set({
                        id: id,
                        userId: userId,
                        agentId: agentId,
                        createdAt: new Date().toISOString(),
                        lastMessageAt: new Date().toISOString(),
                        status: 'active'
                    }, { merge: true })];
                case 3:
                    // Create new session metadata
                    _a.sent(); // Merge prevents overwriting if it did exist
                    return [2 /*return*/, id];
            }
        });
    }); },
    // 2. Get History (Sliding Window)
    // Returns format compatible with Gemini 'startChat'
    getHistory: function (sessionId_1) {
        var args_1 = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args_1[_i - 1] = arguments[_i];
        }
        return __awaiter(void 0, __spreadArray([sessionId_1], args_1, true), void 0, function (sessionId, limit) {
            var snapshot;
            if (limit === void 0) { limit = 10; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, firebase_1.db.collection('chatSessions')
                            .doc(sessionId)
                            .collection('messages')
                            .orderBy('timestamp', 'desc') // Get newest first
                            .limit(limit)
                            .get()];
                    case 1:
                        snapshot = _a.sent();
                        // Reverse to chronological order (Oldest -> Newest) for the AI
                        return [2 /*return*/, snapshot.docs.reverse().map(function (doc) {
                                var data = doc.data();
                                return {
                                    role: data.role,
                                    parts: data.parts // Contains [{ text: "..." }] or tool calls
                                };
                            })];
                }
            });
        });
    },
    // 3. Save Message
    // We allow saving 'parts' array directly to support Tool Calls in the future
    saveMessage: function (sessionId, role, parts, meta) { return __awaiter(void 0, void 0, void 0, function () {
        var messageData, userId, agentId, additionalMeta;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    messageData = {
                        role: role,
                        parts: parts,
                        userId: (meta === null || meta === void 0 ? void 0 : meta.userId) || null,
                        agentId: (meta === null || meta === void 0 ? void 0 : meta.agentId) || null,
                        timestamp: new Date().toISOString()
                    };
                    // Store additional metadata (like taxiRequestId, bookingId, etc.)
                    if (meta) {
                        userId = meta.userId, agentId = meta.agentId, additionalMeta = __rest(meta, ["userId", "agentId"]);
                        if (Object.keys(additionalMeta).length > 0) {
                            messageData.metadata = additionalMeta;
                        }
                    }
                    return [4 /*yield*/, firebase_1.db.collection('chatSessions')
                            .doc(sessionId)
                            .collection('messages')
                            .add(messageData)];
                case 1:
                    _a.sent();
                    // Update parent session timestamp (for housekeeping)
                    return [4 /*yield*/, firebase_1.db.collection('chatSessions').doc(sessionId).update({
                            lastMessageAt: new Date().toISOString(),
                            messageCount: firestore_1.FieldValue.increment(1)
                        })];
                case 2:
                    // Update parent session timestamp (for housekeeping)
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    // ============================================
    // 4. PENDING ACTION METHODS (Confirmation Gate)
    // ============================================
    /**
     * Set a pending action that requires user confirmation.
     * The confirmation gate checks this before allowing LLM to process.
     */
    setPendingAction: function (sessionId, action) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, firebase_1.db.collection('chatSessions').doc(sessionId).update({
                        pendingAction: {
                            kind: action.kind,
                            // Transaction fields
                            businessId: action.businessId || null,
                            txId: action.txId || null,
                            // Consumer tool fields
                            orderId: action.orderId || null,
                            requestId: action.requestId || null,
                            // Common fields
                            holdExpiresAt: firestore_1.Timestamp.fromDate(action.holdExpiresAt),
                            summary: action.summary,
                            expectedUserId: action.expectedUserId,
                            createdAt: firestore_1.Timestamp.fromDate(action.createdAt),
                        }
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
    /**
     * Get the pending action for a session, if any.
     * Returns null if no pending action or if it belongs to a different user.
     */
    getPendingAction: function (sessionId, userId) { return __awaiter(void 0, void 0, void 0, function () {
        var doc, data, pending;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, firebase_1.db.collection('chatSessions').doc(sessionId).get()];
                case 1:
                    doc = _c.sent();
                    if (!doc.exists)
                        return [2 /*return*/, null];
                    data = doc.data();
                    pending = data === null || data === void 0 ? void 0 : data.pendingAction;
                    if (!pending)
                        return [2 /*return*/, null];
                    // Verify user matches if userId provided
                    if (userId && pending.expectedUserId !== userId) {
                        console.warn("[ChatRepo] Pending action userId mismatch: expected ".concat(pending.expectedUserId, ", got ").concat(userId));
                        return [2 /*return*/, null];
                    }
                    return [2 /*return*/, {
                            kind: pending.kind,
                            businessId: pending.businessId || undefined,
                            txId: pending.txId || undefined,
                            orderId: pending.orderId || undefined,
                            requestId: pending.requestId || undefined,
                            holdExpiresAt: ((_a = pending.holdExpiresAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(),
                            summary: pending.summary,
                            expectedUserId: pending.expectedUserId,
                            createdAt: ((_b = pending.createdAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date(),
                        }];
            }
        });
    }); },
    /**
     * Clear the pending action after confirmation or cancellation.
     */
    clearPendingAction: function (sessionId) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, firebase_1.db.collection('chatSessions').doc(sessionId).update({
                        pendingAction: firestore_1.FieldValue.delete()
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); },
};
