/**
 * Vendor Repository
 *
 * Manages utility vendors (water, gas, groceries) per market.
 * These are not in the main catalog since they're simple utility providers.
 *
 * Location: markets/{marketId}/vendors/{vendorId}
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const db = getFirestore();

// ============================================================================
// TYPES
// ============================================================================

export type VendorType = 'water' | 'gas' | 'groceries';

export interface Vendor {
    id: string;
    type: VendorType;
    name: string;
    whatsappE164: string;
    phone?: string;
    coverageAreas: string[];
    template: string;
    notes?: string;
    active: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface VendorInput {
    type: VendorType;
    name: string;
    whatsappE164: string;
    phone?: string;
    coverageAreas: string[];
    template: string;
    notes?: string;
    active?: boolean;
}

// ============================================================================
// REPOSITORY
// ============================================================================

export const vendorRepository = {
    /**
     * Get collection path for a market's vendors
     */
    collectionPath(marketId: string): string {
        return `markets/${marketId}/vendors`;
    },

    /**
     * Find vendors by type and optionally area
     */
    async findByTypeAndArea(
        marketId: string,
        type: VendorType,
        area?: string
    ): Promise<Vendor[]> {
        let query = db.collection(this.collectionPath(marketId))
            .where('active', '==', true)
            .where('type', '==', type);

        const snapshot = await query.get();
        let vendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));

        // Filter by area if specified
        if (area) {
            const areaLower = area.toLowerCase();
            vendors = vendors.filter(v =>
                v.coverageAreas.some(a => a.toLowerCase().includes(areaLower))
            );
        }

        return vendors;
    },

    /**
     * Get vendor by ID
     */
    async getById(marketId: string, vendorId: string): Promise<Vendor | null> {
        const doc = await db.doc(`${this.collectionPath(marketId)}/${vendorId}`).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Vendor;
    },

    /**
     * Get all vendors for a market
     */
    async getAll(marketId: string, includeInactive = false): Promise<Vendor[]> {
        let query = db.collection(this.collectionPath(marketId));

        if (!includeInactive) {
            query = query.where('active', '==', true) as typeof query;
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
    },

    /**
     * Create a new vendor
     */
    async create(marketId: string, input: VendorInput): Promise<Vendor> {
        const id = db.collection(this.collectionPath(marketId)).doc().id;
        const now = FieldValue.serverTimestamp();

        const vendor = {
            ...input,
            active: input.active ?? true,
            createdAt: now,
            updatedAt: now,
        };

        await db.doc(`${this.collectionPath(marketId)}/${id}`).set(vendor);

        return { id, ...vendor, createdAt: Timestamp.now(), updatedAt: Timestamp.now() } as Vendor;
    },

    /**
     * Update a vendor
     */
    async update(marketId: string, vendorId: string, updates: Partial<VendorInput>): Promise<void> {
        await db.doc(`${this.collectionPath(marketId)}/${vendorId}`).update({
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
        });
    },

    /**
     * Delete a vendor (hard delete)
     */
    async delete(marketId: string, vendorId: string): Promise<void> {
        await db.doc(`${this.collectionPath(marketId)}/${vendorId}`).delete();
    },

    /**
     * Deactivate a vendor (soft delete)
     */
    async deactivate(marketId: string, vendorId: string): Promise<void> {
        await this.update(marketId, vendorId, { active: false });
    },
};
