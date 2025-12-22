"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citiesRepository = void 0;
/**
 * Cities Repository
 * Manages city data in Firestore
 */
const firebase_1 = require("../config/firebase");
const COLLECTION = 'cities';
exports.citiesRepository = {
    /**
     * Create a new city
     */
    async create(city) {
        const docRef = await firebase_1.db.collection(COLLECTION).add(Object.assign(Object.assign({}, city), { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
        return Object.assign(Object.assign({ id: docRef.id }, city), { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    },
    /**
     * Get city by ID
     */
    async getById(cityId) {
        const doc = await firebase_1.db.collection(COLLECTION).doc(cityId).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Get all active cities
     */
    async getActive() {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get all cities
     */
    async getAll() {
        const snapshot = await firebase_1.db.collection(COLLECTION).get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Update city
     */
    async update(cityId, updates) {
        await firebase_1.db.collection(COLLECTION).doc(cityId).set(Object.assign(Object.assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true });
    },
    /**
     * Delete city (soft delete by marking inactive)
     */
    async delete(cityId) {
        await firebase_1.db.collection(COLLECTION).doc(cityId).set({
            isActive: false,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
};
//# sourceMappingURL=cities.repository.js.map