"use strict";
/**
 * Draft Catalog Repository
 *
 * Manages the draft catalog items stored as a subcollection:
 * threads/{threadId}/draftCatalog/{tempId}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftCatalogRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// ============================================
// PATHS
// ============================================
const getDraftCatalogPath = (threadId) => `threads/${threadId}/draftCatalog`;
// ============================================
// REPOSITORY
// ============================================
exports.draftCatalogRepository = {
    /**
     * Add items to the draft catalog subcollection.
     * Returns the new total count.
     */
    addItems: async (threadId, items) => {
        const now = firestore_1.Timestamp.now();
        const batch = db.batch();
        const collRef = db.collection(getDraftCatalogPath(threadId));
        for (const item of items) {
            const tempId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const docRef = collRef.doc(tempId);
            batch.set(docRef, Object.assign(Object.assign({}, item), { tempId, createdAt: now }));
        }
        await batch.commit();
        // Return new count
        const snapshot = await collRef.count().get();
        return snapshot.data().count;
    },
    /**
     * Get all draft items for a thread.
     */
    getAll: async (threadId) => {
        const snapshot = await db.collection(getDraftCatalogPath(threadId))
            .orderBy('createdAt', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ tempId: doc.id }, doc.data())));
    },
    /**
     * Get the count of draft items.
     */
    getCount: async (threadId) => {
        const snapshot = await db.collection(getDraftCatalogPath(threadId)).count().get();
        return snapshot.data().count;
    },
    /**
     * Clear all draft items for a thread.
     */
    clearAll: async (threadId) => {
        const snapshot = await db.collection(getDraftCatalogPath(threadId)).get();
        const batch = db.batch();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();
    },
};
//# sourceMappingURL=draftCatalog.repository.js.map