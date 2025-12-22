"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.placesRepository = void 0;
/**
 * Places Repository
 * Manages venues (restaurants, bars, cafes, sights, etc.)
 */
const firebase_1 = require("../config/firebase");
const COLLECTION = 'places';
exports.placesRepository = {
    /**
     * Create a new place
     */
    async create(place) {
        const now = new Date().toISOString();
        const docRef = await firebase_1.db.collection(COLLECTION).add(Object.assign(Object.assign({}, place), { createdAt: now, updatedAt: now }));
        return Object.assign(Object.assign({ id: docRef.id }, place), { createdAt: now, updatedAt: now });
    },
    /**
     * Get place by ID
     */
    async getById(placeId) {
        const doc = await firebase_1.db.collection(COLLECTION).doc(placeId).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Search places by category
     */
    async getByCategory(cityId, category) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('category', '==', category)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get all places in a city
     */
    async getByCityId(cityId, activeOnly = true) {
        let query = firebase_1.db.collection(COLLECTION).where('cityId', '==', cityId);
        if (activeOnly) {
            query = query.where('isActive', '==', true);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get places by area
     */
    async getByArea(cityId, areaId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('areaId', '==', areaId)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get featured places
     */
    async getFeatured(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('isFeatured', '==', true)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Search places by tags
     */
    async getByTags(cityId, tags) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('tags', 'array-contains-any', tags)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get places with taxi enabled
     */
    async getWithTaxiEnabled(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('actions.taxiEnabled', '==', true)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Update place
     */
    async update(placeId, updates) {
        await firebase_1.db.collection(COLLECTION).doc(placeId).set(Object.assign(Object.assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true });
    },
    /**
     * Delete place (soft delete)
     */
    async delete(placeId) {
        await firebase_1.db.collection(COLLECTION).doc(placeId).set({
            isActive: false,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
};
//# sourceMappingURL=places.repository.js.map