"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestsRepository = void 0;
/**
 * Requests Repository
 * Manages user service requests (catch-all for all demands)
 */
const firebase_1 = require("../config/firebase");
const COLLECTION = 'requests';
exports.requestsRepository = {
    /**
     * Create a new request
     */
    async create(request) {
        const now = new Date().toISOString();
        const docRef = await firebase_1.db.collection(COLLECTION).add(Object.assign(Object.assign({}, request), { status: request.status || 'new', createdAt: now, updatedAt: now }));
        return Object.assign(Object.assign({ id: docRef.id }, request), { status: request.status || 'new', createdAt: now, updatedAt: now });
    },
    /**
     * Get request by ID
     */
    async getById(requestId) {
        const doc = await firebase_1.db.collection(COLLECTION).doc(requestId).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Get requests by user ID
     */
    async getByUserId(userId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get requests by category
     */
    async getByCategory(cityId, category, status) {
        let query = firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('category', '==', category);
        if (status) {
            query = query.where('status', '==', status);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get requests by status
     */
    async getByStatus(cityId, status) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('status', '==', status)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get new requests (for admin)
     */
    async getNew(cityId) {
        let query = firebase_1.db.collection(COLLECTION).where('status', '==', 'new');
        if (cityId) {
            query = query.where('cityId', '==', cityId);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get requests assigned to a partner
     */
    async getByPartner(partnerId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('assignedPartnerId', '==', partnerId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get all requests for a city
     */
    async getByCityId(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Update request status
     */
    async updateStatus(requestId, status) {
        await firebase_1.db.collection(COLLECTION).doc(requestId).set({
            status,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
    /**
     * Assign request to partner
     */
    async assignToPartner(requestId, partnerId) {
        await firebase_1.db.collection(COLLECTION).doc(requestId).set({
            assignedPartnerId: partnerId,
            status: 'in_progress',
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
    /**
     * Add internal notes
     */
    async addInternalNotes(requestId, notes) {
        await firebase_1.db.collection(COLLECTION).doc(requestId).set({
            internalNotes: notes,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
    /**
     * Update request
     */
    async update(requestId, updates) {
        await firebase_1.db.collection(COLLECTION).doc(requestId).set(Object.assign(Object.assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true });
    },
    /**
     * Delete request
     */
    async delete(requestId) {
        await firebase_1.db.collection(COLLECTION).doc(requestId).delete();
    },
};
//# sourceMappingURL=requests.repository.js.map