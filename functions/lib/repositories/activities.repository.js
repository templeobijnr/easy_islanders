"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activitiesRepository = void 0;
/**
 * Activities Repository
 * Manages events and activities with approval workflow
 */
const firebase_1 = require("../config/firebase");
const COLLECTION = 'activities';
exports.activitiesRepository = {
    /**
     * Create a new activity (starts as pending)
     */
    async create(activity) {
        const now = new Date().toISOString();
        const docRef = await firebase_1.db.collection(COLLECTION).add(Object.assign(Object.assign({}, activity), { status: 'pending', createdAt: now, updatedAt: now }));
        return Object.assign(Object.assign({ id: docRef.id }, activity), { status: 'pending', createdAt: now, updatedAt: now });
    },
    /**
     * Get activity by ID
     */
    async getById(activityId) {
        const doc = await firebase_1.db.collection(COLLECTION).doc(activityId).get();
        if (!doc.exists) {
            return null;
        }
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Get approved activities in a city
     */
    async getApproved(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('status', '==', 'approved')
            .orderBy('startsAt', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get upcoming approved activities
     */
    async getUpcoming(cityId) {
        const now = new Date().toISOString();
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('status', '==', 'approved')
            .where('startsAt', '>=', now)
            .orderBy('startsAt', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get activities by category
     */
    async getByCategory(cityId, category) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('category', '==', category)
            .where('status', '==', 'approved')
            .orderBy('startsAt', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get activities by date range
     */
    async getByDateRange(cityId, startDate, endDate) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('cityId', '==', cityId)
            .where('status', '==', 'approved')
            .where('startsAt', '>=', startDate)
            .where('startsAt', '<=', endDate)
            .orderBy('startsAt', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get pending activities (for admin approval)
     */
    async getPending(cityId) {
        let query = firebase_1.db.collection(COLLECTION).where('status', '==', 'pending');
        if (cityId) {
            query = query.where('cityId', '==', cityId);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Get activities at a specific place
     */
    async getByPlace(placeId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('placeId', '==', placeId)
            .where('status', '==', 'approved')
            .orderBy('startsAt', 'asc')
            .get();
        return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
    },
    /**
     * Approve activity
     */
    async approve(activityId) {
        await firebase_1.db.collection(COLLECTION).doc(activityId).set({
            status: 'approved',
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
    /**
     * Reject activity
     */
    async reject(activityId) {
        await firebase_1.db.collection(COLLECTION).doc(activityId).set({
            status: 'rejected',
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
    /**
     * Update activity
     */
    async update(activityId, updates) {
        await firebase_1.db.collection(COLLECTION).doc(activityId).set(Object.assign(Object.assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true });
    },
    /**
     * Delete activity
     */
    async delete(activityId) {
        await firebase_1.db.collection(COLLECTION).doc(activityId).delete();
    },
};
//# sourceMappingURL=activities.repository.js.map