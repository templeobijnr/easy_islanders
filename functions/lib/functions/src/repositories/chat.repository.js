"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../config/firebase");
exports.chatRepository = {
    // 1. Get or Create Session Metadata
    getOrCreateSession: async (sessionId, userId, agentId) => {
        // If no ID provided, generate a new one
        const id = sessionId || `sess_${userId}_${Date.now()}`;
        const docRef = firebase_1.db.collection('chatSessions').doc(id);
        // Check if exists (optimization: only read if sessionId was provided)
        if (sessionId) {
            const doc = await docRef.get();
            if (doc.exists)
                return id;
        }
        // Create new session metadata
        await docRef.set({
            id,
            userId,
            agentId,
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            status: 'active'
        }, { merge: true }); // Merge prevents overwriting if it did exist
        return id;
    },
    // 2. Get History (Sliding Window)
    // Returns format compatible with Gemini 'startChat'
    getHistory: async (sessionId, limit = 10) => {
        const snapshot = await firebase_1.db.collection('chatSessions')
            .doc(sessionId)
            .collection('messages')
            .orderBy('timestamp', 'desc') // Get newest first
            .limit(limit)
            .get();
        // Reverse to chronological order (Oldest -> Newest) for the AI
        return snapshot.docs.reverse().map(doc => {
            const data = doc.data();
            return {
                role: data.role,
                parts: data.parts // Contains [{ text: "..." }] or tool calls
            };
        });
    },
    // 3. Save Message
    // We allow saving 'parts' array directly to support Tool Calls in the future
    saveMessage: async (sessionId, role, parts, meta) => {
        const messageData = {
            role,
            parts,
            userId: (meta === null || meta === void 0 ? void 0 : meta.userId) || null,
            agentId: (meta === null || meta === void 0 ? void 0 : meta.agentId) || null,
            timestamp: new Date().toISOString()
        };
        // Store additional metadata (like taxiRequestId, bookingId, etc.)
        if (meta) {
            const { userId, agentId } = meta, additionalMeta = __rest(meta, ["userId", "agentId"]);
            if (Object.keys(additionalMeta).length > 0) {
                messageData.metadata = additionalMeta;
            }
        }
        await firebase_1.db.collection('chatSessions')
            .doc(sessionId)
            .collection('messages')
            .add(messageData);
        // Update parent session timestamp (for housekeeping)
        await firebase_1.db.collection('chatSessions').doc(sessionId).update({
            lastMessageAt: new Date().toISOString(),
            messageCount: firestore_1.FieldValue.increment(1)
        });
    },
    // ============================================
    // 4. PENDING ACTION METHODS (Confirmation Gate)
    // ============================================
    /**
     * Set a pending action that requires user confirmation.
     * The confirmation gate checks this before allowing LLM to process.
     */
    setPendingAction: async (sessionId, action) => {
        await firebase_1.db.collection('chatSessions').doc(sessionId).update({
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
        });
    },
    /**
     * Get the pending action for a session, if any.
     * Returns null if no pending action or if it belongs to a different user.
     */
    getPendingAction: async (sessionId, userId) => {
        var _a, _b;
        const doc = await firebase_1.db.collection('chatSessions').doc(sessionId).get();
        if (!doc.exists)
            return null;
        const data = doc.data();
        const pending = data === null || data === void 0 ? void 0 : data.pendingAction;
        if (!pending)
            return null;
        // Verify user matches if userId provided
        if (userId && pending.expectedUserId !== userId) {
            console.warn(`[ChatRepo] Pending action userId mismatch: expected ${pending.expectedUserId}, got ${userId}`);
            return null;
        }
        return {
            kind: pending.kind,
            businessId: pending.businessId || undefined,
            txId: pending.txId || undefined,
            orderId: pending.orderId || undefined,
            requestId: pending.requestId || undefined,
            holdExpiresAt: ((_a = pending.holdExpiresAt) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date(),
            summary: pending.summary,
            expectedUserId: pending.expectedUserId,
            createdAt: ((_b = pending.createdAt) === null || _b === void 0 ? void 0 : _b.toDate()) || new Date(),
        };
    },
    /**
     * Clear the pending action after confirmation or cancellation.
     */
    clearPendingAction: async (sessionId) => {
        await firebase_1.db.collection('chatSessions').doc(sessionId).update({
            pendingAction: firestore_1.FieldValue.delete()
        });
    },
};
//# sourceMappingURL=chat.repository.js.map