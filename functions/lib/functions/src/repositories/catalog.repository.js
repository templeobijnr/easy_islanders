"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogRepository = void 0;
const errors_1 = require("../utils/errors");
/**
 * Catalog Repository
 *
 * Firestore operations for catalog items.
 * Handles both tenant-specific and global (projection) collections.
 * Supports source-scoped replacement for extraction re-runs.
 */
const firestore_1 = require("firebase-admin/firestore");
const validate_1 = require("../taxonomy/validate");
const taxonomy_1 = require("../taxonomy");
const db = (0, firestore_1.getFirestore)();
// ============================================================================
// COLLECTION PATHS
// ============================================================================
const BUSINESS_CATALOG_PATH = (businessId) => `businesses/${businessId}/catalog`;
const GLOBAL_CATALOG_PATH = 'catalog';
// ============================================================================
// REPOSITORY
// ============================================================================
exports.catalogRepository = {
    /**
     * Create a new catalog item
     */
    async create(input) {
        var _a, _b;
        // Validate
        const validation = (0, validate_1.validateCatalogItem)(input);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.map(e => (0, errors_1.getErrorMessage)(e)).join(', ')}`);
        }
        // Normalize
        const normalized = (0, validate_1.normalizeCatalogItem)(input);
        // Generate ID
        const id = db.collection(GLOBAL_CATALOG_PATH).doc().id;
        const now = firestore_1.FieldValue.serverTimestamp();
        const item = {
            businessId: normalized.businessId,
            marketId: normalized.marketId,
            industryDomain: normalized.industryDomain,
            offeringType: normalized.offeringType,
            actionType: normalized.actionType,
            section: normalized.section,
            subsection: normalized.subsection,
            taxonomyVersion: taxonomy_1.TAXONOMY_VERSION,
            name: normalized.name,
            nameNormalized: normalized.nameNormalized,
            description: normalized.description,
            price: normalized.price,
            currency: normalized.currency,
            priceType: normalized.priceType,
            images: normalized.images,
            isAvailable: (_a = normalized.isAvailable) !== null && _a !== void 0 ? _a : true,
            tags: normalized.tags,
            attributeSchemaId: normalized.attributes ? `${normalized.industryDomain}.v1` : undefined,
            attributes: normalized.attributes,
            source: (_b = normalized.source) !== null && _b !== void 0 ? _b : { type: 'manual' },
            status: 'active',
            createdAt: now,
            updatedAt: now,
        };
        // Write to both collections atomically
        const batch = db.batch();
        // Tenant collection (canonical)
        const tenantRef = db.collection(BUSINESS_CATALOG_PATH(normalized.businessId)).doc(id);
        batch.set(tenantRef, item);
        // Global collection (projection for cross-business queries)
        const globalRef = db.collection(GLOBAL_CATALOG_PATH).doc(id);
        batch.set(globalRef, item);
        await batch.commit();
        return Object.assign({ id }, item);
    },
    /**
     * Get a catalog item by ID
     */
    async getById(businessId, itemId) {
        const doc = await db.collection(BUSINESS_CATALOG_PATH(businessId)).doc(itemId).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Update a catalog item
     */
    async update(businessId, itemId, updates) {
        const updateData = Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() });
        // Update normalized name if name changed
        if (updates.name) {
            updateData.nameNormalized = updates.name.trim().toLowerCase();
        }
        // Write to both collections atomically
        const batch = db.batch();
        batch.update(db.collection(BUSINESS_CATALOG_PATH(businessId)).doc(itemId), updateData);
        batch.update(db.collection(GLOBAL_CATALOG_PATH).doc(itemId), updateData);
        await batch.commit();
    },
    /**
     * Delete a catalog item (hard delete)
     */
    async delete(businessId, itemId) {
        const batch = db.batch();
        batch.delete(db.collection(BUSINESS_CATALOG_PATH(businessId)).doc(itemId));
        batch.delete(db.collection(GLOBAL_CATALOG_PATH).doc(itemId));
        await batch.commit();
    },
    /**
     * Get all active items for a business
     */
    async getByBusiness(businessId, includeInactive = false) {
        let query = db.collection(BUSINESS_CATALOG_PATH(businessId))
            .orderBy('section')
            .orderBy('name');
        if (!includeInactive) {
            query = query.where('status', '==', 'active');
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Query catalog items (cross-business) - active only
     */
    async query(params) {
        const limit = params.limit || 20;
        let query = db.collection(GLOBAL_CATALOG_PATH)
            .where('marketId', '==', params.marketId)
            .where('status', '==', 'active');
        // Apply filters
        if (params.industryDomain) {
            query = query.where('industryDomain', '==', params.industryDomain);
        }
        if (params.offeringType) {
            query = query.where('offeringType', '==', params.offeringType);
        }
        if (params.isAvailable !== undefined) {
            query = query.where('isAvailable', '==', params.isAvailable);
        }
        if (params.currency && params.maxPrice !== undefined) {
            query = query
                .where('currency', '==', params.currency)
                .where('price', '<=', params.maxPrice);
        }
        // Execute
        const snapshot = await query.limit(limit + 1).get();
        const docs = snapshot.docs.slice(0, limit);
        const hasMore = snapshot.docs.length > limit;
        return {
            items: docs.map(doc => (Object.assign({ id: doc.id }, doc.data()))),
            total: docs.length,
            hasMore,
        };
    },
    // ============================================================================
    // EXTRACTION SUPPORT METHODS
    // ============================================================================
    /**
     * Upsert extracted items (idempotent by deterministic ID)
     */
    async upsertExtractedItems(businessId, items) {
        var _a;
        const ids = [];
        const chunks = chunkArray(items, 500);
        for (const chunk of chunks) {
            const batch = db.batch();
            for (const input of chunk) {
                const validation = (0, validate_1.validateCatalogItem)(input);
                if (!validation.isValid) {
                    console.warn(`Skipping invalid item: ${validation.errors.map(e => (0, errors_1.getErrorMessage)(e)).join(', ')}`);
                    continue;
                }
                const normalized = (0, validate_1.normalizeCatalogItem)(input);
                const now = firestore_1.FieldValue.serverTimestamp();
                const item = {
                    businessId: normalized.businessId,
                    marketId: normalized.marketId,
                    industryDomain: normalized.industryDomain,
                    offeringType: normalized.offeringType,
                    actionType: normalized.actionType,
                    section: normalized.section,
                    subsection: normalized.subsection,
                    taxonomyVersion: taxonomy_1.TAXONOMY_VERSION,
                    name: normalized.name,
                    nameNormalized: normalized.nameNormalized,
                    description: normalized.description,
                    price: normalized.price,
                    currency: normalized.currency,
                    priceType: normalized.priceType,
                    images: normalized.images,
                    isAvailable: (_a = normalized.isAvailable) !== null && _a !== void 0 ? _a : true,
                    tags: normalized.tags,
                    source: normalized.source,
                    status: 'active',
                    createdAt: now,
                    updatedAt: now,
                };
                // Use set with merge to upsert
                batch.set(db.collection(BUSINESS_CATALOG_PATH(businessId)).doc(input.id), item, { merge: true });
                batch.set(db.collection(GLOBAL_CATALOG_PATH).doc(input.id), item, { merge: true });
                ids.push(input.id);
            }
            await batch.commit();
        }
        return ids;
    },
    /**
     * Deactivate previous extracted items from a doc (source-scoped replacement)
     * Only affects items where source.type === 'doc' AND source.docId === docId
     * AND extractionRunId !== currentRunId
     */
    async deactivatePreviousExtracted(businessId, docId, currentRunId) {
        // Query items from this doc that are not from current run
        const snapshot = await db.collection(BUSINESS_CATALOG_PATH(businessId))
            .where('source.type', '==', 'doc')
            .where('source.docId', '==', docId)
            .where('status', '==', 'active')
            .get();
        // Filter out items from current run (can't do != in Firestore)
        const toDeactivate = snapshot.docs.filter(doc => {
            var _a;
            const data = doc.data();
            return ((_a = data.source) === null || _a === void 0 ? void 0 : _a.extractionRunId) !== currentRunId;
        });
        if (toDeactivate.length === 0)
            return 0;
        const chunks = chunkArray(toDeactivate, 500);
        let count = 0;
        for (const chunk of chunks) {
            const batch = db.batch();
            for (const doc of chunk) {
                batch.update(doc.ref, { status: 'inactive', updatedAt: firestore_1.FieldValue.serverTimestamp() });
                batch.update(db.collection(GLOBAL_CATALOG_PATH).doc(doc.id), { status: 'inactive', updatedAt: firestore_1.FieldValue.serverTimestamp() });
                count++;
            }
            await batch.commit();
        }
        return count;
    },
    /**
     * Delete all items for a business (hard delete)
     */
    async deleteByBusiness(businessId) {
        const snapshot = await db.collection(BUSINESS_CATALOG_PATH(businessId)).get();
        let count = 0;
        const chunks = chunkArray(snapshot.docs, 500);
        for (const chunk of chunks) {
            const batch = db.batch();
            for (const doc of chunk) {
                batch.delete(doc.ref);
                batch.delete(db.collection(GLOBAL_CATALOG_PATH).doc(doc.id));
                count++;
            }
            await batch.commit();
        }
        return count;
    },
    // ============================================================================
    // MERVE TOOL QUERIES
    // ============================================================================
    /**
     * Query Merve-enabled catalog items
     */
    async queryMerveEnabled(params) {
        const limit = params.limit || 20;
        let query = db.collection(GLOBAL_CATALOG_PATH)
            .where('marketId', '==', params.marketId)
            .where('status', '==', 'active')
            .where('merve.enabled', '==', true);
        if (params.toolType) {
            query = query.where('merve.toolType', '==', params.toolType);
        }
        const snapshot = await query.limit(limit).get();
        let items = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Filter by tags if specified (can't do array-contains on nested field easily)
        if (params.tags && params.tags.length > 0) {
            items = items.filter(item => params.tags.some(tag => { var _a, _b; return (_b = (_a = item.merve) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes(tag); }));
        }
        return items;
    },
    // ============================================================================
    // MENU SUBCOLLECTION METHODS
    // ============================================================================
    /**
     * Get menu items for a catalog item (restaurant)
     */
    async getMenuItems(catalogItemId) {
        const snapshot = await db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`)
            .where('isAvailable', '==', true)
            .orderBy('category')
            .orderBy('sortOrder')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Create or update a menu item
     */
    async upsertMenuItem(catalogItemId, input, menuItemId) {
        var _a, _b;
        const id = menuItemId || db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`).doc().id;
        const now = firestore_1.FieldValue.serverTimestamp();
        const item = {
            catalogItemId,
            name: input.name,
            nameNormalized: input.name.trim().toLowerCase(),
            price: input.price,
            currency: input.currency,
            category: input.category,
            description: input.description,
            photoUrl: input.photoUrl,
            isAvailable: (_a = input.isAvailable) !== null && _a !== void 0 ? _a : true,
            sortOrder: (_b = input.sortOrder) !== null && _b !== void 0 ? _b : 0,
            createdAt: now,
            updatedAt: now,
        };
        await db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`).doc(id).set(item, { merge: true });
        return id;
    },
    /**
     * Delete a menu item
     */
    async deleteMenuItem(catalogItemId, menuItemId) {
        await db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`).doc(menuItemId).delete();
    },
};
// ============================================================================
// HELPERS
// ============================================================================
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
//# sourceMappingURL=catalog.repository.js.map