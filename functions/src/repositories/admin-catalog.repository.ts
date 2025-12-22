/**
 * Admin Catalog Repository
 * 
 * Read operations for admin-controlled catalogs that power Merve's tools.
 * Collections: restaurants, vendors, service_providers, pharmacies_on_duty, news_cache
 */

import { getFirestore } from 'firebase-admin/firestore';
import {
    Restaurant,
    MenuItem,
    Vendor,
    VendorType,
    ServiceProvider,
    ServiceType,
    PharmacyDutyDoc,
    NewsCacheDoc,
    COLLECTIONS,
} from '../types/catalog.types';

const db = getFirestore();

// ============================================================================
// RESTAURANTS
// ============================================================================

export const restaurantRepository = {
    async search(query: {
        cuisineTag?: string;
        area?: string;
        name?: string;
        limit?: number;
    }): Promise<Restaurant[]> {
        let ref = db.collection(COLLECTIONS.restaurants)
            .where('active', '==', true);

        if (query.cuisineTag) {
            ref = ref.where('cuisineTags', 'array-contains', query.cuisineTag);
        }

        if (query.area) {
            ref = ref.where('deliveryAreas', 'array-contains', query.area);
        }

        const snap = await ref.limit(query.limit || 20).get();
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant));

        if (query.name) {
            const lower = query.name.toLowerCase();
            return results.filter(r => r.name.toLowerCase().includes(lower));
        }

        return results;
    },

    async getById(id: string): Promise<Restaurant | null> {
        const doc = await db.collection(COLLECTIONS.restaurants).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } as Restaurant : null;
    },

    async getMenu(restaurantId: string): Promise<MenuItem[]> {
        const snap = await db.collection(COLLECTIONS.menuItems(restaurantId))
            .where('active', '==', true)
            .orderBy('category')
            .get();

        return snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
    },
};

// ============================================================================
// VENDORS (Water, Gas, Groceries)
// ============================================================================

export const vendorRepository = {
    async findByTypeAndArea(type: VendorType, area?: string): Promise<Vendor[]> {
        const ref = db.collection(COLLECTIONS.vendors)
            .where('active', '==', true)
            .where('type', '==', type);

        const snap = await ref.get();
        let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor));

        if (area) {
            results = results.filter(v =>
                v.coverageAreas.some(a => a.toLowerCase().includes(area.toLowerCase()))
            );
        }

        return results;
    },

    async getById(id: string): Promise<Vendor | null> {
        const doc = await db.collection(COLLECTIONS.vendors).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } as Vendor : null;
    },
};

// ============================================================================
// SERVICE PROVIDERS
// ============================================================================

export const serviceProviderRepository = {
    async findByServiceAndArea(serviceType: ServiceType, area?: string): Promise<ServiceProvider[]> {
        const ref = db.collection(COLLECTIONS.serviceProviders)
            .where('active', '==', true)
            .where('services', 'array-contains', serviceType);

        const snap = await ref.get();
        let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceProvider));

        if (area) {
            results = results.filter(p =>
                p.coverageAreas.some(a => a.toLowerCase().includes(area.toLowerCase()))
            );
        }

        return results;
    },

    async getById(id: string): Promise<ServiceProvider | null> {
        const doc = await db.collection(COLLECTIONS.serviceProviders).doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } as ServiceProvider : null;
    },
};

// ============================================================================
// PHARMACIES ON DUTY
// ============================================================================

export const pharmacyRepository = {
    async getTodaysPharmacies(district?: string): Promise<PharmacyDutyDoc | null> {
        const today = new Date().toISOString().split('T')[0];
        const doc = await db.collection(COLLECTIONS.pharmaciesOnDuty).doc(today).get();

        if (!doc.exists) return null;

        const data = doc.data() as PharmacyDutyDoc;

        if (district) {
            data.pharmacies = data.pharmacies.filter(p =>
                p.district.toLowerCase().includes(district.toLowerCase())
            );
        }

        return data;
    },
};

// ============================================================================
// NEWS CACHE
// ============================================================================

export const newsRepository = {
    async getLatest(): Promise<NewsCacheDoc | null> {
        const doc = await db.collection(COLLECTIONS.newsCache).doc('latest').get();
        return doc.exists ? doc.data() as NewsCacheDoc : null;
    },
};
