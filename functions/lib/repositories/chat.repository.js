"use strict";
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
    saveMessage: async (sessionId, role, parts) => {
        await firebase_1.db.collection('chatSessions')
            .doc(sessionId)
            .collection('messages')
            .add({
            role,
            parts,
            timestamp: new Date().toISOString()
        });
        // Update parent session timestamp (for housekeeping)
        await firebase_1.db.collection('chatSessions').doc(sessionId).update({
            lastMessageAt: new Date().toISOString(),
            messageCount: firestore_1.FieldValue.increment(1)
        });
    }
};
//# sourceMappingURL=chat.repository.js.map