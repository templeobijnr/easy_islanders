import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../config/firebase';

// ============================================
// PENDING ACTION (Confirmation Gate)
// ============================================

/**
 * Represents a pending action that requires user confirmation.
 * Stored on the chat session document.
 * 
 * Kinds:
 * - confirm_transaction: Booking ledger transaction
 * - confirm_order: Food order (V1)
 * - confirm_service: Service request (V1)
 */
export type PendingActionKind = 'confirm_transaction' | 'confirm_order' | 'confirm_service';

export interface PendingAction {
    kind: PendingActionKind;

    // For confirm_transaction (legacy booking ledger)
    businessId?: string;
    txId?: string;

    // For confirm_order / confirm_service (V1 consumer tools)
    orderId?: string;
    requestId?: string;

    holdExpiresAt: Date;         // When confirmation expires
    summary: string;             // What user is confirming (e.g., "Table for 2 at Restaurant XYZ")
    expectedUserId: string;      // Prevents cross-user confirmation
    createdAt: Date;
}

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
    saveMessage: async (sessionId: string, role: 'user' | 'model', parts: any[], meta?: { userId?: string; agentId?: string;[key: string]: any }) => {
        const messageData: any = {
            role,
            parts,
            userId: meta?.userId || null,
            agentId: meta?.agentId || null,
            timestamp: new Date().toISOString()
        };

        // Store additional metadata (like taxiRequestId, bookingId, etc.)
        if (meta) {
            const { userId, agentId, ...additionalMeta } = meta;
            if (Object.keys(additionalMeta).length > 0) {
                messageData.metadata = additionalMeta;
            }
        }

        await db.collection('chatSessions')
            .doc(sessionId)
            .collection('messages')
            .add(messageData);

        // Update parent session timestamp (for housekeeping)
        await db.collection('chatSessions').doc(sessionId).update({
            lastMessageAt: new Date().toISOString(),
            messageCount: FieldValue.increment(1)
        });
    },

    // ============================================
    // 4. PENDING ACTION METHODS (Confirmation Gate)
    // ============================================

    /**
     * Set a pending action that requires user confirmation.
     * The confirmation gate checks this before allowing LLM to process.
     */
    setPendingAction: async (sessionId: string, action: PendingAction): Promise<void> => {
        await db.collection('chatSessions').doc(sessionId).update({
            pendingAction: {
                kind: action.kind,
                // Transaction fields
                businessId: action.businessId || null,
                txId: action.txId || null,
                // Consumer tool fields
                orderId: action.orderId || null,
                requestId: action.requestId || null,
                // Common fields
                holdExpiresAt: Timestamp.fromDate(action.holdExpiresAt),
                summary: action.summary,
                expectedUserId: action.expectedUserId,
                createdAt: Timestamp.fromDate(action.createdAt),
            }
        });
    },

    /**
     * Get the pending action for a session, if any.
     * Returns null if no pending action or if it belongs to a different user.
     */
    getPendingAction: async (sessionId: string, userId?: string): Promise<PendingAction | null> => {
        const doc = await db.collection('chatSessions').doc(sessionId).get();
        if (!doc.exists) return null;

        const data = doc.data();
        const pending = data?.pendingAction;
        if (!pending) return null;

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
            holdExpiresAt: pending.holdExpiresAt?.toDate() || new Date(),
            summary: pending.summary,
            expectedUserId: pending.expectedUserId,
            createdAt: pending.createdAt?.toDate() || new Date(),
        };
    },

    /**
     * Clear the pending action after confirmation or cancellation.
     */
    clearPendingAction: async (sessionId: string): Promise<void> => {
        await db.collection('chatSessions').doc(sessionId).update({
            pendingAction: FieldValue.delete()
        });
    },
};
