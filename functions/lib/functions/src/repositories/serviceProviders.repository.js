"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceProvidersRepository = void 0;
/**
 * Service Providers Repository
 * Manages partners (taxi companies, vendors, agents, etc.)
 */
const firebase_1 = require("../config/firebase");
const COLLECTION = 'serviceProviders';
exports.serviceProvidersRepository = {
    /**
     * Create a new service provider
     */
    async create(provider) {
        const now = new Date().toISOString();
        const docRef = await firebase_1.db.collection(COLLECTION).add(Object.assign(Object.assign({}, provider), { createdAt: now, updatedAt: now }));
        return Object.assign(Object.assign({ id: docRef.id }, provider), { createdAt: now, updatedAt: now });
    },
    /**
     * Get service provider by ID
     */
    async getById(providerId) {
        const doc = await firebase_1.db.collection(COLLECTION).doc(providerId).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Get providers by type
     */
    async getByType(cityId, type) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('type', '==', type)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get all active providers in a city
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
     * Get providers by service category
     */
    async getByServiceCategory(cityId, category) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('serviceCategories', 'array-contains', category)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get providers by area
     */
    async getByArea(cityId, areaName) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('areaNames', 'array-contains', areaName)
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get taxi drivers/companies
     */
    async getTaxiProviders(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('type', 'in', ['taxi_company', 'driver'])
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get housing providers (agents, landlords)
     */
    async getHousingProviders(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('type', 'in', ['real_estate_agent', 'landlord'])
            .where('isActive', '==', true)
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Search providers by phone/whatsapp
     */
    async getByPhone(phone) {
        // Try phone field
        let snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('contact.phone', '==', phone)
            .limit(1)
            .get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return Object.assign({ id: doc.id }, doc.data());
        }
        // Try whatsapp field
        snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('contact.whatsapp', '==', phone)
            .limit(1)
            .get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return Object.assign({ id: doc.id }, doc.data());
        }
        return null;
    },
    /**
     * Update service provider
     */
    async update(providerId, updates) {
        await firebase_1.db.collection(COLLECTION).doc(providerId).set(Object.assign(Object.assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true });
    },
    /**
     * Delete service provider (soft delete)
     */
    async delete(providerId) {
        await firebase_1.db.collection(COLLECTION).doc(providerId).set({
            isActive: false,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
};
//# sourceMappingURL=serviceProviders.repository.js.map