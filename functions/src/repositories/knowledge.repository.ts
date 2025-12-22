/**
 * Knowledge Repository
 * Handles knowledge documents and chunks with Firestore Vector Search.
 * 
 * Collection: businesses/{businessId}/knowledgeDocs/{docId}
 * Subcollection: .../chunks/{chunkId}
 * 
 * IMPORTANT: Uses collection group query for vector search.
 * Each chunk has denormalized businessId for filtering.
 */

import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import {
    KnowledgeDoc,
    KnowledgeChunk,
    KnowledgeDocStatus,
    ChunkStatus,
    ChunkRetrievalResult
} from '../types/knowledge';
import { log } from '../utils/log';

/**
 * Get the knowledge docs collection path for a business.
 */
const getDocsPath = (businessId: string) =>
    `businesses/${businessId}/knowledgeDocs`;

/**
 * Get the chunks collection path for a document.
 */
const getChunksPath = (businessId: string, docId: string) =>
    `businesses/${businessId}/knowledgeDocs/${docId}/chunks`;

export const knowledgeRepository = {
    // ============================================
    // DOCUMENT OPERATIONS
    // ============================================

    /**
     * Create a new knowledge document.
     */
    createDoc: async (
        businessId: string,
        doc: Omit<KnowledgeDoc, 'id' | 'businessId' | 'createdAt' | 'updatedAt' | 'chunkCount'>
    ): Promise<string> => {
        const docsRef = db.collection(getDocsPath(businessId));
        const docRef = docsRef.doc();

        // Filter out undefined values (Firestore rejects them)
        const cleanDoc = Object.fromEntries(
            Object.entries(doc).filter(([_, v]) => v !== undefined)
        );

        await docRef.set({
            ...cleanDoc,
            businessId,
            chunkCount: 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        log.info('[KnowledgeRepo] Created knowledge doc', { docId: docRef.id });
        return docRef.id;
    },

    /**
     * Count knowledge docs for a business.
     */
    countDocs: async (businessId: string): Promise<number> => {
        const snapshot = await db.collection(getDocsPath(businessId)).count().get();
        return snapshot.data().count;
    },

    /**
     * Get a knowledge document by ID.
     */
    getDoc: async (businessId: string, docId: string): Promise<KnowledgeDoc | null> => {
        const doc = await db.collection(getDocsPath(businessId)).doc(docId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as KnowledgeDoc;
    },

    /**
     * List knowledge documents for a business.
     */
    listDocs: async (
        businessId: string,
        options: { status?: KnowledgeDocStatus } = {}
    ): Promise<KnowledgeDoc[]> => {
        let query = db.collection(getDocsPath(businessId))
            .orderBy('createdAt', 'desc');

        if (options.status) {
            query = query.where('status', '==', options.status) as FirebaseFirestore.Query;
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as KnowledgeDoc[];
    },

    /**
     * Update document status.
     */
    updateDocStatus: async (
        businessId: string,
        docId: string,
        status: KnowledgeDocStatus,
        error?: { code: string; message: string }
    ): Promise<void> => {
        const updateData: any = {
            status,
            updatedAt: FieldValue.serverTimestamp()
        };

        if (error) {
            updateData.error = error;
        }

        await db.collection(getDocsPath(businessId)).doc(docId).update(updateData);
    },

    /**
     * Generic update for any document fields.
     * Supports dot notation for nested fields (e.g., 'catalogExtraction.status').
     */
    updateDoc: async (
        businessId: string,
        docId: string,
        updates: Record<string, any>
    ): Promise<void> => {
        await db.collection(getDocsPath(businessId)).doc(docId).update({
            ...updates,
            updatedAt: FieldValue.serverTimestamp()
        });
    },

    /**
     * Update document chunk count.
     */
    updateChunkCount: async (
        businessId: string,
        docId: string,
        chunkCount: number
    ): Promise<void> => {
        await db.collection(getDocsPath(businessId)).doc(docId).update({
            chunkCount,
            updatedAt: FieldValue.serverTimestamp()
        });
    },

    /**
     * Mark a document as successfully ingested.
     */
    finalizeDocSuccess: async (
        businessId: string,
        docId: string,
        data: {
            chunkCount: number;
            contentHash: string;
            mimeType?: string;
            pageCount?: number;
        }
    ): Promise<void> => {
        await db.collection(getDocsPath(businessId)).doc(docId).update({
            status: 'active',
            chunkCount: data.chunkCount,
            contentHash: data.contentHash,
            ...(data.mimeType ? { mimeType: data.mimeType } : {}),
            ...(typeof data.pageCount === 'number' ? { pageCount: data.pageCount } : {}),
            error: FieldValue.delete(),
            updatedAt: FieldValue.serverTimestamp()
        });
    },

    // ============================================
    // CHUNK OPERATIONS
    // ============================================

    /**
     * Write a chunk with vector embedding.
     * Uses FieldValue.vector() for Firestore Vector Search.
     */
    writeChunk: async (
        businessId: string,
        docId: string,
        chunk: Omit<KnowledgeChunk, 'id' | 'createdAt'>
    ): Promise<string> => {
        const chunksRef = db.collection(getChunksPath(businessId, docId));
        const docRef = chunksRef.doc(chunk.textHash);

        // Store embedding as Firestore Vector for native vector search
        await docRef.set({
            ...chunk,
            businessId, // Denormalized for collection group filtering
            docId,
            embedding: FieldValue.vector(chunk.embedding),
            createdAt: FieldValue.serverTimestamp()
        });

        return docRef.id;
    },

    /**
     * Write multiple chunks in a batch.
     */
    writeChunksBatch: async (
        businessId: string,
        docId: string,
        chunks: Omit<KnowledgeChunk, 'id' | 'createdAt'>[]
    ): Promise<string[]> => {
        const chunksRef = db.collection(getChunksPath(businessId, docId));
        const batch = db.batch();
        const ids: string[] = [];

        for (const chunk of chunks) {
            const docRef = chunksRef.doc(chunk.textHash);
            ids.push(docRef.id);

            batch.set(docRef, {
                ...chunk,
                businessId,
                docId,
                embedding: FieldValue.vector(chunk.embedding),
                createdAt: FieldValue.serverTimestamp()
            });
        }

        await batch.commit();
        log.info('[KnowledgeRepo] Wrote chunks', { docId, chunkCount: chunks.length });
        return ids;
    },

    /**
     * Find nearest chunks using Firestore Vector Search.
     * Uses collection group query with businessId filter.
     */
    findNearestChunks: async (
        businessId: string,
        queryVector: number[],
        topK: number = 10
    ): Promise<ChunkRetrievalResult[]> => {
        try {
            // Collection group query across all chunks
            const query = db.collectionGroup('chunks')
                .where('businessId', '==', businessId)
                .where('status', '==', 'active');

            // Execute vector search
            // Note: findNearest is available in firebase-admin >= 12.0.0
            const vectorQuery = query.findNearest({
                vectorField: 'embedding',
                queryVector: FieldValue.vector(queryVector),
                limit: topK,
                distanceMeasure: 'COSINE'
            });

            const snapshot = await vectorQuery.get();

            return snapshot.docs.map(doc => {
                const data: any = doc.data();
                const distance =
                    (doc as any).distance ??
                    (doc as any)._distance ??
                    data.distance ??
                    data._distance ??
                    data.vector_distance ??
                    data.vectorDistance ??
                    0;
                return {
                    chunkId: doc.id,
                    docId: data.docId,
                    sourceName: data.sourceName,
                    text: data.text,
                    score: typeof distance === 'number' ? distance : 0
                };
            });
        } catch (error) {
            log.error('[KnowledgeRepo] findNearestChunks error', error, { businessId });
            throw error;
        }
    },

    /**
     * Get all chunks for a document.
     */
    getChunksForDoc: async (
        businessId: string,
        docId: string
    ): Promise<KnowledgeChunk[]> => {
        const snapshot = await db.collection(getChunksPath(businessId, docId))
            .orderBy('chunkIndex')
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as KnowledgeChunk[];
    },

    /**
     * Update chunk status.
     */
    updateChunkStatus: async (
        businessId: string,
        docId: string,
        chunkId: string,
        status: ChunkStatus
    ): Promise<void> => {
        await db.collection(getChunksPath(businessId, docId)).doc(chunkId).update({
            status
        });
    },

    /**
     * Disable all chunks for a document.
     */
    disableAllChunks: async (
        businessId: string,
        docId: string
    ): Promise<number> => {
        return knowledgeRepository.setAllChunksStatus(businessId, docId, 'disabled');
    },

    /**
     * Set status for all chunks for a document (batched).
     */
    setAllChunksStatus: async (
        businessId: string,
        docId: string,
        status: ChunkStatus
    ): Promise<number> => {
        const snapshot = await db.collection(getChunksPath(businessId, docId)).get();
        if (snapshot.empty) return 0;

        const BATCH_LIMIT = 450;
        let updated = 0;
        let batch = db.batch();
        let opCount = 0;

        for (const doc of snapshot.docs) {
            batch.update(doc.ref, { status });
            updated += 1;
            opCount += 1;

            if (opCount >= BATCH_LIMIT) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        return updated;
    },

    /**
     * Count active chunks for a business.
     */
    countActiveChunks: async (businessId: string): Promise<number> => {
        const snapshot = await db.collectionGroup('chunks')
            .where('businessId', '==', businessId)
            .where('status', '==', 'active')
            .count()
            .get();

        return snapshot.data().count;
    },

    /**
     * Count active chunks for a single knowledge doc.
     * Useful for enforcing per-business caps without failing retries.
     */
    countActiveChunksForDoc: async (businessId: string, docId: string): Promise<number> => {
        const snapshot = await db.collectionGroup('chunks')
            .where('businessId', '==', businessId)
            .where('docId', '==', docId)
            .where('status', '==', 'active')
            .count()
            .get();

        return snapshot.data().count;
    }
};
