"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeRepository = void 0;
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const log_1 = require("../utils/log");
/**
 * Get the knowledge docs collection path for a business.
 */
const getDocsPath = (businessId) => `businesses/${businessId}/knowledgeDocs`;
/**
 * Get the chunks collection path for a document.
 */
const getChunksPath = (businessId, docId) => `businesses/${businessId}/knowledgeDocs/${docId}/chunks`;
exports.knowledgeRepository = {
    // ============================================
    // DOCUMENT OPERATIONS
    // ============================================
    /**
     * Create a new knowledge document.
     */
    createDoc: async (businessId, doc) => {
        const docsRef = firebase_1.db.collection(getDocsPath(businessId));
        const docRef = docsRef.doc();
        // Filter out undefined values (Firestore rejects them)
        const cleanDoc = Object.fromEntries(Object.entries(doc).filter(([_, v]) => v !== undefined));
        await docRef.set(Object.assign(Object.assign({}, cleanDoc), { businessId, chunkCount: 0, createdAt: firestore_1.FieldValue.serverTimestamp(), updatedAt: firestore_1.FieldValue.serverTimestamp() }));
        log_1.log.info('[KnowledgeRepo] Created knowledge doc', { docId: docRef.id });
        return docRef.id;
    },
    /**
     * Count knowledge docs for a business.
     */
    countDocs: async (businessId) => {
        const snapshot = await firebase_1.db.collection(getDocsPath(businessId)).count().get();
        return snapshot.data().count;
    },
    /**
     * Get a knowledge document by ID.
     */
    getDoc: async (businessId, docId) => {
        const doc = await firebase_1.db.collection(getDocsPath(businessId)).doc(docId).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * List knowledge documents for a business.
     */
    listDocs: async (businessId, options = {}) => {
        let query = firebase_1.db.collection(getDocsPath(businessId))
            .orderBy('createdAt', 'desc');
        if (options.status) {
            query = query.where('status', '==', options.status);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Update document status.
     */
    updateDocStatus: async (businessId, docId, status, error) => {
        const updateData = {
            status,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        };
        if (error) {
            updateData.error = error;
        }
        await firebase_1.db.collection(getDocsPath(businessId)).doc(docId).update(updateData);
    },
    /**
     * Generic update for any document fields.
     * Supports dot notation for nested fields (e.g., 'catalogExtraction.status').
     */
    updateDoc: async (businessId, docId, updates) => {
        await firebase_1.db.collection(getDocsPath(businessId)).doc(docId).update(Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    },
    /**
     * Update document chunk count.
     */
    updateChunkCount: async (businessId, docId, chunkCount) => {
        await firebase_1.db.collection(getDocsPath(businessId)).doc(docId).update({
            chunkCount,
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
    },
    /**
     * Mark a document as successfully ingested.
     */
    finalizeDocSuccess: async (businessId, docId, data) => {
        await firebase_1.db.collection(getDocsPath(businessId)).doc(docId).update(Object.assign(Object.assign(Object.assign({ status: 'active', chunkCount: data.chunkCount, contentHash: data.contentHash }, (data.mimeType ? { mimeType: data.mimeType } : {})), (typeof data.pageCount === 'number' ? { pageCount: data.pageCount } : {})), { error: firestore_1.FieldValue.delete(), updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    },
    // ============================================
    // CHUNK OPERATIONS
    // ============================================
    /**
     * Write a chunk with vector embedding.
     * Uses FieldValue.vector() for Firestore Vector Search.
     */
    writeChunk: async (businessId, docId, chunk) => {
        const chunksRef = firebase_1.db.collection(getChunksPath(businessId, docId));
        const docRef = chunksRef.doc(chunk.textHash);
        // Store embedding as Firestore Vector for native vector search
        await docRef.set(Object.assign(Object.assign({}, chunk), { businessId, // Denormalized for collection group filtering
            docId, embedding: firestore_1.FieldValue.vector(chunk.embedding), createdAt: firestore_1.FieldValue.serverTimestamp() }));
        return docRef.id;
    },
    /**
     * Write multiple chunks in a batch.
     */
    writeChunksBatch: async (businessId, docId, chunks) => {
        const chunksRef = firebase_1.db.collection(getChunksPath(businessId, docId));
        const batch = firebase_1.db.batch();
        const ids = [];
        for (const chunk of chunks) {
            const docRef = chunksRef.doc(chunk.textHash);
            ids.push(docRef.id);
            batch.set(docRef, Object.assign(Object.assign({}, chunk), { businessId,
                docId, embedding: firestore_1.FieldValue.vector(chunk.embedding), createdAt: firestore_1.FieldValue.serverTimestamp() }));
        }
        await batch.commit();
        log_1.log.info('[KnowledgeRepo] Wrote chunks', { docId, chunkCount: chunks.length });
        return ids;
    },
    /**
     * Find nearest chunks using Firestore Vector Search.
     * Uses collection group query with businessId filter.
     */
    findNearestChunks: async (businessId, queryVector, topK = 10) => {
        try {
            // Collection group query across all chunks
            const query = firebase_1.db.collectionGroup('chunks')
                .where('businessId', '==', businessId)
                .where('status', '==', 'active');
            // Execute vector search
            // Note: findNearest is available in firebase-admin >= 12.0.0
            const vectorQuery = query.findNearest({
                vectorField: 'embedding',
                queryVector: firestore_1.FieldValue.vector(queryVector),
                limit: topK,
                distanceMeasure: 'COSINE'
            });
            const snapshot = await vectorQuery.get();
            return snapshot.docs.map(doc => {
                var _a, _b, _c, _d, _e, _f;
                const data = doc.data();
                const distance = (_f = (_e = (_d = (_c = (_b = (_a = doc.distance) !== null && _a !== void 0 ? _a : doc._distance) !== null && _b !== void 0 ? _b : data.distance) !== null && _c !== void 0 ? _c : data._distance) !== null && _d !== void 0 ? _d : data.vector_distance) !== null && _e !== void 0 ? _e : data.vectorDistance) !== null && _f !== void 0 ? _f : 0;
                return {
                    chunkId: doc.id,
                    docId: data.docId,
                    sourceName: data.sourceName,
                    text: data.text,
                    score: typeof distance === 'number' ? distance : 0
                };
            });
        }
        catch (error) {
            log_1.log.error('[KnowledgeRepo] findNearestChunks error', error, { businessId });
            throw error;
        }
    },
    /**
     * Get all chunks for a document.
     */
    getChunksForDoc: async (businessId, docId) => {
        const snapshot = await firebase_1.db.collection(getChunksPath(businessId, docId))
            .orderBy('chunkIndex')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Update chunk status.
     */
    updateChunkStatus: async (businessId, docId, chunkId, status) => {
        await firebase_1.db.collection(getChunksPath(businessId, docId)).doc(chunkId).update({
            status
        });
    },
    /**
     * Disable all chunks for a document.
     */
    disableAllChunks: async (businessId, docId) => {
        return exports.knowledgeRepository.setAllChunksStatus(businessId, docId, 'disabled');
    },
    /**
     * Set status for all chunks for a document (batched).
     */
    setAllChunksStatus: async (businessId, docId, status) => {
        const snapshot = await firebase_1.db.collection(getChunksPath(businessId, docId)).get();
        if (snapshot.empty)
            return 0;
        const BATCH_LIMIT = 450;
        let updated = 0;
        let batch = firebase_1.db.batch();
        let opCount = 0;
        for (const doc of snapshot.docs) {
            batch.update(doc.ref, { status });
            updated += 1;
            opCount += 1;
            if (opCount >= BATCH_LIMIT) {
                await batch.commit();
                batch = firebase_1.db.batch();
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
    countActiveChunks: async (businessId) => {
        const snapshot = await firebase_1.db.collectionGroup('chunks')
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
    countActiveChunksForDoc: async (businessId, docId) => {
        const snapshot = await firebase_1.db.collectionGroup('chunks')
            .where('businessId', '==', businessId)
            .where('docId', '==', docId)
            .where('status', '==', 'active')
            .count()
            .get();
        return snapshot.data().count;
    }
};
//# sourceMappingURL=knowledge.repository.js.map