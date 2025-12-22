import { getErrorMessage } from '../utils/errors';
/**
 * Catalog Repository
 *
 * Firestore operations for catalog items.
 * Handles both tenant-specific and global (projection) collections.
 * Supports source-scoped replacement for extraction re-runs.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { CatalogItem, CatalogItemInput, CatalogQueryParams, CatalogSearchResult, CatalogMenuItem, CatalogMenuItemInput } from '../types/catalog';
import { validateCatalogItem, normalizeCatalogItem } from '../taxonomy/validate';
import { TAXONOMY_VERSION } from '../taxonomy';

const db = getFirestore();

// ============================================================================
// COLLECTION PATHS
// ============================================================================
const BUSINESS_CATALOG_PATH = (businessId: string) =>
    `businesses/${businessId}/catalog`;

const GLOBAL_CATALOG_PATH = 'catalog';

// ============================================================================
// REPOSITORY
// ============================================================================
export const catalogRepository = {
    /**
     * Create a new catalog item
     */
    async create(input: CatalogItemInput): Promise<CatalogItem> {
        // Validate
        const validation = validateCatalogItem(input);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.map(e => getErrorMessage(e)).join(', ')}`);
        }

        // Normalize
        const normalized = normalizeCatalogItem(input);

        // Generate ID
        const id = db.collection(GLOBAL_CATALOG_PATH).doc().id;

        const now = FieldValue.serverTimestamp();

        const item: Omit<CatalogItem, 'id'> = {
            businessId: normalized.businessId,
            marketId: normalized.marketId,
            industryDomain: normalized.industryDomain,
            offeringType: normalized.offeringType,
            actionType: normalized.actionType,
            section: normalized.section,
            subsection: normalized.subsection,
            taxonomyVersion: TAXONOMY_VERSION,
            name: normalized.name,
            nameNormalized: normalized.nameNormalized,
            description: normalized.description,
            price: normalized.price,
            currency: normalized.currency,
            priceType: normalized.priceType,
            images: normalized.images,
            isAvailable: normalized.isAvailable ?? true,
            tags: normalized.tags,
            attributeSchemaId: normalized.attributes ? `${normalized.industryDomain}.v1` : undefined,
            attributes: normalized.attributes,
            source: normalized.source ?? { type: 'manual' },
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

        return { id, ...item } as CatalogItem;
    },

    /**
     * Get a catalog item by ID
     */
    async getById(businessId: string, itemId: string): Promise<CatalogItem | null> {
        const doc = await db.collection(BUSINESS_CATALOG_PATH(businessId)).doc(itemId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as CatalogItem;
    },

    /**
     * Update a catalog item
     */
    async update(
        businessId: string,
        itemId: string,
        updates: Partial<CatalogItemInput>
    ): Promise<void> {
        const updateData = {
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Update normalized name if name changed
        if (updates.name) {
            (updateData as Record<string, unknown>).nameNormalized = updates.name.trim().toLowerCase();
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
    async delete(businessId: string, itemId: string): Promise<void> {
        const batch = db.batch();
        batch.delete(db.collection(BUSINESS_CATALOG_PATH(businessId)).doc(itemId));
        batch.delete(db.collection(GLOBAL_CATALOG_PATH).doc(itemId));
        await batch.commit();
    },

    /**
     * Get all active items for a business
     */
    async getByBusiness(businessId: string, includeInactive = false): Promise<CatalogItem[]> {
        let query = db.collection(BUSINESS_CATALOG_PATH(businessId))
            .orderBy('section')
            .orderBy('name');

        if (!includeInactive) {
            query = query.where('status', '==', 'active');
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogItem));
    },

    /**
     * Query catalog items (cross-business) - active only
     */
    async query(params: CatalogQueryParams): Promise<CatalogSearchResult> {
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
            items: docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogItem)),
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
    async upsertExtractedItems(
        businessId: string,
        items: Array<CatalogItemInput & { id: string }>
    ): Promise<string[]> {
        const ids: string[] = [];
        const chunks = chunkArray(items, 500);

        for (const chunk of chunks) {
            const batch = db.batch();

            for (const input of chunk) {
                const validation = validateCatalogItem(input);
                if (!validation.isValid) {
                    console.warn(`Skipping invalid item: ${validation.errors.map(e => getErrorMessage(e)).join(', ')}`);
                    continue;
                }

                const normalized = normalizeCatalogItem(input);
                const now = FieldValue.serverTimestamp();

                const item = {
                    businessId: normalized.businessId,
                    marketId: normalized.marketId,
                    industryDomain: normalized.industryDomain,
                    offeringType: normalized.offeringType,
                    actionType: normalized.actionType,
                    section: normalized.section,
                    subsection: normalized.subsection,
                    taxonomyVersion: TAXONOMY_VERSION,
                    name: normalized.name,
                    nameNormalized: normalized.nameNormalized,
                    description: normalized.description,
                    price: normalized.price,
                    currency: normalized.currency,
                    priceType: normalized.priceType,
                    images: normalized.images,
                    isAvailable: normalized.isAvailable ?? true,
                    tags: normalized.tags,
                    source: normalized.source,
                    status: 'active',
                    createdAt: now,
                    updatedAt: now,
                };

                // Use set with merge to upsert
                batch.set(
                    db.collection(BUSINESS_CATALOG_PATH(businessId)).doc(input.id),
                    item,
                    { merge: true }
                );
                batch.set(
                    db.collection(GLOBAL_CATALOG_PATH).doc(input.id),
                    item,
                    { merge: true }
                );
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
    async deactivatePreviousExtracted(
        businessId: string,
        docId: string,
        currentRunId: string
    ): Promise<number> {
        // Query items from this doc that are not from current run
        const snapshot = await db.collection(BUSINESS_CATALOG_PATH(businessId))
            .where('source.type', '==', 'doc')
            .where('source.docId', '==', docId)
            .where('status', '==', 'active')
            .get();

        // Filter out items from current run (can't do != in Firestore)
        const toDeactivate = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.source?.extractionRunId !== currentRunId;
        });

        if (toDeactivate.length === 0) return 0;

        const chunks = chunkArray(toDeactivate, 500);
        let count = 0;

        for (const chunk of chunks) {
            const batch = db.batch();

            for (const doc of chunk) {
                batch.update(doc.ref, { status: 'inactive', updatedAt: FieldValue.serverTimestamp() });
                batch.update(
                    db.collection(GLOBAL_CATALOG_PATH).doc(doc.id),
                    { status: 'inactive', updatedAt: FieldValue.serverTimestamp() }
                );
                count++;
            }

            await batch.commit();
        }

        return count;
    },

    /**
     * Delete all items for a business (hard delete)
     */
    async deleteByBusiness(businessId: string): Promise<number> {
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
    async queryMerveEnabled(params: {
        marketId: string;
        toolType?: 'restaurant' | 'provider' | 'activity' | 'stay';
        tags?: string[];
        limit?: number;
    }): Promise<CatalogItem[]> {
        const limit = params.limit || 20;
        let query = db.collection(GLOBAL_CATALOG_PATH)
            .where('marketId', '==', params.marketId)
            .where('status', '==', 'active')
            .where('merve.enabled', '==', true);

        if (params.toolType) {
            query = query.where('merve.toolType', '==', params.toolType);
        }

        const snapshot = await query.limit(limit).get();
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogItem));

        // Filter by tags if specified (can't do array-contains on nested field easily)
        if (params.tags && params.tags.length > 0) {
            items = items.filter(item =>
                params.tags!.some(tag => item.merve?.tags?.includes(tag))
            );
        }

        return items;
    },

    // ============================================================================
    // MENU SUBCOLLECTION METHODS
    // ============================================================================

    /**
     * Get menu items for a catalog item (restaurant)
     */
    async getMenuItems(catalogItemId: string): Promise<CatalogMenuItem[]> {
        const snapshot = await db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`)
            .where('isAvailable', '==', true)
            .orderBy('category')
            .orderBy('sortOrder')
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CatalogMenuItem));
    },

    /**
     * Create or update a menu item
     */
    async upsertMenuItem(catalogItemId: string, input: CatalogMenuItemInput, menuItemId?: string): Promise<string> {
        const id = menuItemId || db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`).doc().id;
        const now = FieldValue.serverTimestamp();

        const item = {
            catalogItemId,
            name: input.name,
            nameNormalized: input.name.trim().toLowerCase(),
            price: input.price,
            currency: input.currency,
            category: input.category,
            description: input.description,
            photoUrl: input.photoUrl,
            isAvailable: input.isAvailable ?? true,
            sortOrder: input.sortOrder ?? 0,
            createdAt: now,
            updatedAt: now,
        };

        await db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`).doc(id).set(item, { merge: true });
        return id;
    },

    /**
     * Delete a menu item
     */
    async deleteMenuItem(catalogItemId: string, menuItemId: string): Promise<void> {
        await db.collection(`${GLOBAL_CATALOG_PATH}/${catalogItemId}/menuItems`).doc(menuItemId).delete();
    },
};

// ============================================================================
// HELPERS
// ============================================================================
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
