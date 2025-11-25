import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

export const chatRepository = {
    // 1. Get or Create Session Metadata
    getOrCreateSession: async (sessionId: string | undefined, userId: string, agentId: string) => {
        // If no ID provided, generate a new one
        const id = sessionId || `sess_${userId}_${Date.now()}`;
        const docRef = db.collection('chatSessions').doc(id);

        // Check if exists (optimization: only read if sessionId was provided)
        if (sessionId) {
            const doc = await docRef.get();
            if (doc.exists) return id;
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
    getHistory: async (sessionId: string, limit: number = 10) => {
        const snapshot = await db.collection('chatSessions')
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
    saveMessage: async (sessionId: string, role: 'user' | 'model', parts: any[], meta?: { userId?: string; agentId?: string }) => {
        await db.collection('chatSessions')
            .doc(sessionId)
            .collection('messages')
            .add({
                role,
                parts,
                userId: meta?.userId || null,
                agentId: meta?.agentId || null,
                timestamp: new Date().toISOString()
            });

        // Update parent session timestamp (for housekeeping)
        await db.collection('chatSessions').doc(sessionId).update({
            lastMessageAt: new Date().toISOString(),
            messageCount: FieldValue.increment(1)
        });
    }
};
