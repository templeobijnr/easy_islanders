"use strict";
/**
 * Vendor Repository
 *
 * Manages utility vendors (water, gas, groceries) per market.
 * These are not in the main catalog since they're simple utility providers.
 *
 * Location: markets/{marketId}/vendors/{vendorId}
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.vendorRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// ============================================================================
// REPOSITORY
// ============================================================================
exports.vendorRepository = {
    /**
     * Get collection path for a market's vendors
     */
    collectionPath(marketId) {
        return `markets/${marketId}/vendors`;
    },
    /**
     * Find vendors by type and optionally area
     */
    async findByTypeAndArea(marketId, type, area) {
        let query = db.collection(this.collectionPath(marketId))
            .where('active', '==', true)
            .where('type', '==', type);
        const snapshot = await query.get();
        let vendors = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Filter by area if specified
        if (area) {
            const areaLower = area.toLowerCase();
            vendors = vendors.filter(v => v.coverageAreas.some(a => a.toLowerCase().includes(areaLower)));
        }
        return vendors;
    },
    /**
     * Get vendor by ID
     */
    async getById(marketId, vendorId) {
        const doc = await db.doc(`${this.collectionPath(marketId)}/${vendorId}`).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Get all vendors for a market
     */
    async getAll(marketId, includeInactive = false) {
        let query = db.collection(this.collectionPath(marketId));
        if (!includeInactive) {
            query = query.where('active', '==', true);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Create a new vendor
     */
    async create(marketId, input) {
        var _a;
        const id = db.collection(this.collectionPath(marketId)).doc().id;
        const now = firestore_1.FieldValue.serverTimestamp();
        const vendor = Object.assign(Object.assign({}, input), { active: (_a = input.active) !== null && _a !== void 0 ? _a : true, createdAt: now, updatedAt: now });
        await db.doc(`${this.collectionPath(marketId)}/${id}`).set(vendor);
        return Object.assign(Object.assign({ id }, vendor), { createdAt: firestore_1.Timestamp.now(), updatedAt: firestore_1.Timestamp.now() });
    },
    /**
     * Update a vendor
     */
    async update(marketId, vendorId, updates) {
        await db.doc(`${this.collectionPath(marketId)}/${vendorId}`).update(Object.assign(Object.assign({}, updates), { updatedAt: firestore_1.FieldValue.serverTimestamp() }));
    },
    /**
     * Delete a vendor (hard delete)
     */
    async delete(marketId, vendorId) {
        await db.doc(`${this.collectionPath(marketId)}/${vendorId}`).delete();
    },
    /**
     * Deactivate a vendor (soft delete)
     */
    async deactivate(marketId, vendorId) {
        await this.update(marketId, vendorId, { active: false });
    },
};
//# sourceMappingURL=vendor.repository.js.map