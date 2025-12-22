"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingsRepository = void 0;
/**
 * Listings Repository
 * Manages housing and car rental listings
 */
const firebase_1 = require("../config/firebase");
const COLLECTION = 'listings';
exports.listingsRepository = {
    /**
     * Create a new listing
     */
    async create(listing) {
        const now = new Date().toISOString();
        const docRef = await firebase_1.db.collection(COLLECTION).add(Object.assign(Object.assign({}, listing), { createdAt: now, updatedAt: now }));
        return Object.assign(Object.assign({ id: docRef.id }, listing), { createdAt: now, updatedAt: now });
    },
    /**
     * Get listing by ID
     */
    async getById(listingId) {
        const doc = await firebase_1.db.collection(COLLECTION).doc(listingId).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Get listings by kind (housing or car_rental)
     */
    async getByKind(cityId, kind) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('kind', '==', kind)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Search housing listings
     */
    async searchHousing(cityId, filters) {
        let query = firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('kind', '==', 'housing')
            .where('isActive', '==', true);
        if (filters === null || filters === void 0 ? void 0 : filters.bedrooms) {
            query = query.where('housing.bedrooms', '==', filters.bedrooms);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.housingType) {
            query = query.where('housing.type', '==', filters.housingType);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.areaName) {
            query = query.where('housing.areaName', '==', filters.areaName);
        }
        if ((filters === null || filters === void 0 ? void 0 : filters.furnished) !== undefined) {
            query = query.where('housing.furnished', '==', filters.furnished);
        }
        const snapshot = await query.get();
        let results = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Client-side filtering for price range
        if (filters === null || filters === void 0 ? void 0 : filters.minPrice) {
            results = results.filter(listing => listing.price >= filters.minPrice);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.maxPrice) {
            results = results.filter(listing => listing.price <= filters.maxPrice);
        }
        return results;
    },
    /**
     * Search car rental listings
     */
    async searchCarRentals(cityId, filters) {
        let query = firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('kind', '==', 'car_rental')
            .where('isActive', '==', true);
        if (filters === null || filters === void 0 ? void 0 : filters.carType) {
            query = query.where('carRental.carType', '==', filters.carType);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.transmission) {
            query = query.where('carRental.transmission', '==', filters.transmission);
        }
        const snapshot = await query.get();
        let results = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Client-side filtering
        if (filters === null || filters === void 0 ? void 0 : filters.minPrice) {
            results = results.filter(listing => listing.price >= filters.minPrice);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.maxPrice) {
            results = results.filter(listing => listing.price <= filters.maxPrice);
        }
        if (filters === null || filters === void 0 ? void 0 : filters.minSeats) {
            results = results.filter(listing => { var _a; return (((_a = listing.carRental) === null || _a === void 0 ? void 0 : _a.seats) || 0) >= filters.minSeats; });
        }
        return results;
    },
    /**
     * Get featured listings
     */
    async getFeatured(cityId, kind) {
        let query = firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('isFeatured', '==', true)
            .where('isActive', '==', true);
        if (kind) {
            query = query.where('kind', '==', kind);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get all active listings in a city
     */
    async getByCityId(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Update listing
     */
    async update(listingId, updates) {
        await firebase_1.db.collection(COLLECTION).doc(listingId).set(Object.assign(Object.assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true });
    },
    /**
     * Delete listing (soft delete)
     */
    async delete(listingId) {
        await firebase_1.db.collection(COLLECTION).doc(listingId).set({
            isActive: false,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
};
//# sourceMappingURL=listings.repository.js.map