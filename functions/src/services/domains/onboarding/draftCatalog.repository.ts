/**
 * Draft Catalog Repository
 * 
 * Manages the draft catalog items stored as a subcollection:
 * threads/{threadId}/draftCatalog/{tempId}
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { CatalogDraftItem } from '../../../types/thread.types';

const db = getFirestore();

// ============================================
// PATHS
// ============================================

const getDraftCatalogPath = (threadId: string) =>
    `threads/${threadId}/draftCatalog`;

// ============================================
// REPOSITORY
// ============================================

export const draftCatalogRepository = {

    /**
     * Add items to the draft catalog subcollection.
     * Returns the new total count.
     */
    addItems: async (threadId: string, items: Omit<CatalogDraftItem, 'tempId' | 'createdAt'>[]): Promise<number> => {
        const now = Timestamp.now();
        const batch = db.batch();
        const collRef = db.collection(getDraftCatalogPath(threadId));

        for (const item of items) {
            const tempId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const docRef = collRef.doc(tempId);
            batch.set(docRef, {
                ...item,
                tempId,
                createdAt: now,
            });
        }

        await batch.commit();

        // Return new count
        const snapshot = await collRef.count().get();
        return snapshot.data().count;
    },

    /**
     * Get all draft items for a thread.
     */
    getAll: async (threadId: string): Promise<CatalogDraftItem[]> => {
        const snapshot = await db.collection(getDraftCatalogPath(threadId))
            .orderBy('createdAt', 'asc')
            .get();

        return snapshot.docs.map(doc => ({
            tempId: doc.id,
            ...doc.data(),
        } as CatalogDraftItem));
    },

    /**
     * Get the count of draft items.
     */
    getCount: async (threadId: string): Promise<number> => {
        const snapshot = await db.collection(getDraftCatalogPath(threadId)).count().get();
        return snapshot.data().count;
    },

    /**
     * Clear all draft items for a thread.
     */
    clearAll: async (threadId: string): Promise<void> => {
        const snapshot = await db.collection(getDraftCatalogPath(threadId)).get();
        const batch = db.batch();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
        }
        await batch.commit();
    },
};
