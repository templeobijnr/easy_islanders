"use strict";
/**
 * Admin Catalog Repository
 *
 * Read operations for admin-controlled catalogs that power Merve's tools.
 * Collections: restaurants, vendors, service_providers, pharmacies_on_duty, news_cache
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsRepository = exports.pharmacyRepository = exports.serviceProviderRepository = exports.vendorRepository = exports.restaurantRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
const catalog_types_1 = require("../types/catalog.types");
const db = (0, firestore_1.getFirestore)();
// ============================================================================
// RESTAURANTS
// ============================================================================
exports.restaurantRepository = {
    async search(query) {
        let ref = db.collection(catalog_types_1.COLLECTIONS.restaurants)
            .where('active', '==', true);
        if (query.cuisineTag) {
            ref = ref.where('cuisineTags', 'array-contains', query.cuisineTag);
        }
        if (query.area) {
            ref = ref.where('deliveryAreas', 'array-contains', query.area);
        }
        const snap = await ref.limit(query.limit || 20).get();
        const results = snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        if (query.name) {
            const lower = query.name.toLowerCase();
            return results.filter(r => r.name.toLowerCase().includes(lower));
        }
        return results;
    },
    async getById(id) {
        const doc = await db.collection(catalog_types_1.COLLECTIONS.restaurants).doc(id).get();
        return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
    },
    async getMenu(restaurantId) {
        const snap = await db.collection(catalog_types_1.COLLECTIONS.menuItems(restaurantId))
            .where('active', '==', true)
            .orderBy('category')
            .get();
        return snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
    },
};
// ============================================================================
// VENDORS (Water, Gas, Groceries)
// ============================================================================
exports.vendorRepository = {
    async findByTypeAndArea(type, area) {
        const ref = db.collection(catalog_types_1.COLLECTIONS.vendors)
            .where('active', '==', true)
            .where('type', '==', type);
        const snap = await ref.get();
        let results = snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        if (area) {
            results = results.filter(v => v.coverageAreas.some(a => a.toLowerCase().includes(area.toLowerCase())));
        }
        return results;
    },
    async getById(id) {
        const doc = await db.collection(catalog_types_1.COLLECTIONS.vendors).doc(id).get();
        return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
    },
};
// ============================================================================
// SERVICE PROVIDERS
// ============================================================================
exports.serviceProviderRepository = {
    async findByServiceAndArea(serviceType, area) {
        const ref = db.collection(catalog_types_1.COLLECTIONS.serviceProviders)
            .where('active', '==', true)
            .where('services', 'array-contains', serviceType);
        const snap = await ref.get();
        let results = snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        if (area) {
            results = results.filter(p => p.coverageAreas.some(a => a.toLowerCase().includes(area.toLowerCase())));
        }
        return results;
    },
    async getById(id) {
        const doc = await db.collection(catalog_types_1.COLLECTIONS.serviceProviders).doc(id).get();
        return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
    },
};
// ============================================================================
// PHARMACIES ON DUTY
// ============================================================================
exports.pharmacyRepository = {
    async getTodaysPharmacies(district) {
        const today = new Date().toISOString().split('T')[0];
        const doc = await db.collection(catalog_types_1.COLLECTIONS.pharmaciesOnDuty).doc(today).get();
        if (!doc.exists)
            return null;
        const data = doc.data();
        if (district) {
            data.pharmacies = data.pharmacies.filter(p => p.district.toLowerCase().includes(district.toLowerCase()));
        }
        return data;
    },
};
// ============================================================================
// NEWS CACHE
// ============================================================================
exports.newsRepository = {
    async getLatest() {
        const doc = await db.collection(catalog_types_1.COLLECTIONS.newsCache).doc('latest').get();
        return doc.exists ? doc.data() : null;
    },
};
//# sourceMappingURL=admin-catalog.repository.js.map