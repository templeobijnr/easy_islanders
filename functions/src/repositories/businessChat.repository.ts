/**
 * Business Chat Repository
 * Handles multi-tenant chat sessions and messages.
 * 
 * Collection: businesses/{businessId}/chatSessions/{sessionId}
 * Subcollection: .../messages/{messageId}
 * 
 * NOTE: This is SEPARATE from chat.repository.ts which handles
 * platform concierge chat (user-scoped, not business-scoped).
 */

import { db } from '../config/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { BusinessChatSession, BusinessChatMessage, ChatSessionKind } from '../types/chat';

/**
 * Get the chat sessions collection path for a business.
 */
const getSessionsPath = (businessId: string) =>
    `businesses/${businessId}/chatSessions`;

/**
 * Get the messages collection path for a session.
 */
const getMessagesPath = (businessId: string, sessionId: string) =>
    `businesses/${businessId}/chatSessions/${sessionId}/messages`;

export const businessChatRepository = {
    /**
     * Create a new chat session.
     */
    createSession: async (
        businessId: string,
        kind: ChatSessionKind,
        anonUid?: string,
        userId?: string
    ): Promise<BusinessChatSession> => {
        const sessionsRef = db.collection(getSessionsPath(businessId));
        const docRef = sessionsRef.doc();

        // Build session data, filtering out undefined values (Firestore doesn't allow undefined)
        const sessionData: Record<string, any> = {
            businessId,
            kind,
            status: 'open',
            messageCount: 0,
            leadCaptured: false
        };

        // Only add uid fields if they have values
        if (anonUid) sessionData.anonUid = anonUid;
        if (userId) sessionData.userId = userId;

        await docRef.set({
            ...sessionData,
            createdAt: FieldValue.serverTimestamp(),
            lastMessageAt: FieldValue.serverTimestamp()
        });

        return {
            id: docRef.id,
            ...sessionData,
            createdAt: Timestamp.now(),
            lastMessageAt: Timestamp.now()
        } as BusinessChatSession;
    },

    /**
     * Increment message count transactionally, enforcing cap.
     */
    incrementMessageCount: async (
        businessId: string,
        sessionId: string,
        maxMessages: number
    ): Promise<{ allowed: boolean; newCount: number }> => {
        const sessionRef = db.collection(getSessionsPath(businessId)).doc(sessionId);

        return db.runTransaction(async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
            if (!sessionSnap.exists) {
                throw new Error('SESSION_NOT_FOUND');
            }

            const session: any = sessionSnap.data() || {};
            const currentCount = session.messageCount || 0;

            if (currentCount >= maxMessages) {
                return { allowed: false, newCount: currentCount };
            }

            const newCount = currentCount + 1;
            transaction.update(sessionRef, { messageCount: newCount });

            return { allowed: true, newCount };
        });
    },

    /**
     * Get a session by ID.
     */
    getSession: async (
        businessId: string,
        sessionId: string
    ): Promise<BusinessChatSession | null> => {
        const doc = await db.collection(getSessionsPath(businessId))
            .doc(sessionId)
            .get();

        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as BusinessChatSession;
    },

    /**
     * Append a user message and increment messageCount transactionally.
     *
     * Required V1 behavior:
     * 1) read session
     * 2) enforce cap
     * 3) write user message
     * 4) increment messageCount
     */
    appendUserMessageWithCap: async (
        businessId: string,
        sessionId: string,
        userUid: string,
        text: string,
        maxMessages: number
    ): Promise<{ allowed: boolean; newCount: number; messageId?: string }> => {
        const sessionRef = db.collection(getSessionsPath(businessId)).doc(sessionId);
        const messagesRef = db.collection(getMessagesPath(businessId, sessionId));
        const messageRef = messagesRef.doc();

        return db.runTransaction(async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
            if (!sessionSnap.exists) {
                throw new Error('SESSION_NOT_FOUND');
            }

            const session: any = sessionSnap.data() || {};
            const currentCount = session.messageCount || 0;

            // Ownership check (fail-closed)
            if (session.anonUid && session.anonUid !== userUid) {
                throw new Error('SESSION_ACCESS_DENIED');
            }
            if (session.userId && session.userId !== userUid) {
                throw new Error('SESSION_ACCESS_DENIED');
            }

            if (currentCount >= maxMessages) {
                return { allowed: false, newCount: currentCount };
            }

            const newCount = currentCount + 1;

            transaction.set(messageRef, {
                role: 'user',
                text,
                createdAt: FieldValue.serverTimestamp()
            });

            transaction.update(sessionRef, {
                messageCount: newCount,
                lastMessage: text.slice(0, 100),
                lastMessageAt: FieldValue.serverTimestamp()
            });

            return { allowed: true, newCount, messageId: messageRef.id };
        });
    },

    /**
     * Save a message to a session.
     */
    saveMessage: async (
        businessId: string,
        sessionId: string,
        message: Omit<BusinessChatMessage, 'id' | 'createdAt'>
    ): Promise<string> => {
        const messagesRef = db.collection(getMessagesPath(businessId, sessionId));
        const docRef = await messagesRef.add({
            ...message,
            createdAt: FieldValue.serverTimestamp()
        });

        // Update session's lastMessage preview
        await db.collection(getSessionsPath(businessId)).doc(sessionId).update({
            lastMessage: message.text.slice(0, 100),
            lastMessageAt: FieldValue.serverTimestamp()
        });

        return docRef.id;
    },

    /**
     * Get message history for a session.
     */
    getHistory: async (
        businessId: string,
        sessionId: string,
        limit: number = 10
    ): Promise<BusinessChatMessage[]> => {
        const snapshot = await db.collection(getMessagesPath(businessId, sessionId))
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        // Reverse to chronological order
        return snapshot.docs.reverse().map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as BusinessChatMessage[];
    },

    /**
     * List sessions for a business (for inbox).
     */
    listSessions: async (
        businessId: string,
        options: {
            limit?: number;
            kind?: ChatSessionKind;
        } = {}
    ): Promise<BusinessChatSession[]> => {
        let query = db.collection(getSessionsPath(businessId))
            .orderBy('lastMessageAt', 'desc');

        if (options.kind) {
            query = query.where('kind', '==', options.kind) as FirebaseFirestore.Query;
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as BusinessChatSession[];
    },

    /**
     * Mark session as having captured a lead.
     */
    markLeadCaptured: async (
        businessId: string,
        sessionId: string,
        leadId: string
    ): Promise<void> => {
        await db.collection(getSessionsPath(businessId)).doc(sessionId).update({
            leadCaptured: true,
            leadId
        });
    },

    /**
     * Close a session.
     */
    closeSession: async (businessId: string, sessionId: string): Promise<void> => {
        await db.collection(getSessionsPath(businessId)).doc(sessionId).update({
            status: 'closed'
        });
    }
};
