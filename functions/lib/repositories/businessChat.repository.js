"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessChatRepository = void 0;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
/**
 * Get the chat sessions collection path for a business.
 */
const getSessionsPath = (businessId) => `businesses/${businessId}/chatSessions`;
/**
 * Get the messages collection path for a session.
 */
const getMessagesPath = (businessId, sessionId) => `businesses/${businessId}/chatSessions/${sessionId}/messages`;
exports.businessChatRepository = {
    /**
     * Create a new chat session.
     */
    createSession: async (businessId, kind, anonUid, userId) => {
        const sessionsRef = firebase_1.db.collection(getSessionsPath(businessId));
        const docRef = sessionsRef.doc();
        // Build session data, filtering out undefined values (Firestore doesn't allow undefined)
        const sessionData = {
            businessId,
            kind,
            status: 'open',
            messageCount: 0,
            leadCaptured: false
        };
        // Only add uid fields if they have values
        if (anonUid)
            sessionData.anonUid = anonUid;
        if (userId)
            sessionData.userId = userId;
        await docRef.set(Object.assign(Object.assign({}, sessionData), { createdAt: firestore_1.FieldValue.serverTimestamp(), lastMessageAt: firestore_1.FieldValue.serverTimestamp() }));
        return Object.assign(Object.assign({ id: docRef.id }, sessionData), { createdAt: firestore_1.Timestamp.now(), lastMessageAt: firestore_1.Timestamp.now() });
    },
    /**
     * Increment message count transactionally, enforcing cap.
     */
    incrementMessageCount: async (businessId, sessionId, maxMessages) => {
        const sessionRef = firebase_1.db.collection(getSessionsPath(businessId)).doc(sessionId);
        return firebase_1.db.runTransaction(async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
            if (!sessionSnap.exists) {
                throw new Error('SESSION_NOT_FOUND');
            }
            const session = sessionSnap.data() || {};
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
    getSession: async (businessId, sessionId) => {
        const doc = await firebase_1.db.collection(getSessionsPath(businessId))
            .doc(sessionId)
            .get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
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
    appendUserMessageWithCap: async (businessId, sessionId, userUid, text, maxMessages) => {
        const sessionRef = firebase_1.db.collection(getSessionsPath(businessId)).doc(sessionId);
        const messagesRef = firebase_1.db.collection(getMessagesPath(businessId, sessionId));
        const messageRef = messagesRef.doc();
        return firebase_1.db.runTransaction(async (transaction) => {
            const sessionSnap = await transaction.get(sessionRef);
            if (!sessionSnap.exists) {
                throw new Error('SESSION_NOT_FOUND');
            }
            const session = sessionSnap.data() || {};
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
                createdAt: firestore_1.FieldValue.serverTimestamp()
            });
            transaction.update(sessionRef, {
                messageCount: newCount,
                lastMessage: text.slice(0, 100),
                lastMessageAt: firestore_1.FieldValue.serverTimestamp()
            });
            return { allowed: true, newCount, messageId: messageRef.id };
        });
    },
    /**
     * Save a message to a session.
     */
    saveMessage: async (businessId, sessionId, message) => {
        const messagesRef = firebase_1.db.collection(getMessagesPath(businessId, sessionId));
        const docRef = await messagesRef.add(Object.assign(Object.assign({}, message), { createdAt: firestore_1.FieldValue.serverTimestamp() }));
        // Update session's lastMessage preview
        await firebase_1.db.collection(getSessionsPath(businessId)).doc(sessionId).update({
            lastMessage: message.text.slice(0, 100),
            lastMessageAt: firestore_1.FieldValue.serverTimestamp()
        });
        return docRef.id;
    },
    /**
     * Get message history for a session.
     */
    getHistory: async (businessId, sessionId, limit = 10) => {
        const snapshot = await firebase_1.db.collection(getMessagesPath(businessId, sessionId))
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        // Reverse to chronological order
        return snapshot.docs.reverse().map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * List sessions for a business (for inbox).
     */
    listSessions: async (businessId, options = {}) => {
        let query = firebase_1.db.collection(getSessionsPath(businessId))
            .orderBy('lastMessageAt', 'desc');
        if (options.kind) {
            query = query.where('kind', '==', options.kind);
        }
        if (options.limit) {
            query = query.limit(options.limit);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Mark session as having captured a lead.
     */
    markLeadCaptured: async (businessId, sessionId, leadId) => {
        await firebase_1.db.collection(getSessionsPath(businessId)).doc(sessionId).update({
            leadCaptured: true,
            leadId
        });
    },
    /**
     * Close a session.
     */
    closeSession: async (businessId, sessionId) => {
        await firebase_1.db.collection(getSessionsPath(businessId)).doc(sessionId).update({
            status: 'closed'
        });
    }
};
//# sourceMappingURL=businessChat.repository.js.map