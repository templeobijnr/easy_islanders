"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userProfilesRepository = void 0;
/**
 * User Profiles Repository
 * Manages user profile data with segmentation (student/expat/traveller/local)
 */
const firebase_1 = require("../config/firebase");
const COLLECTION = 'userProfiles';
exports.userProfilesRepository = {
    /**
     * Create a new user profile
     */
    async create(profile) {
        const now = new Date().toISOString();
        const newProfile = Object.assign(Object.assign({}, profile), { createdAt: now, updatedAt: now });
        await firebase_1.db.collection(COLLECTION).doc(profile.userId).set(newProfile);
        return newProfile;
    },
    /**
     * Get user profile by user ID
     */
    async getByUserId(userId) {
        const doc = await firebase_1.db.collection(COLLECTION).doc(userId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data();
    },
    /**
     * Get users by type (student, expat, traveller, local)
     */
    async getByUserType(cityId, userType) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('currentCityId', '==', cityId)
            .where('userType', '==', userType)
            .get();
        return snapshot.docs.map(doc => doc.data());
    },
    /**
     * Get users by university
     */
    async getByUniversity(universityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('universityId', '==', universityId)
            .get();
        return snapshot.docs.map(doc => doc.data());
    },
    /**
     * Get users in a city
     */
    async getByCityId(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('currentCityId', '==', cityId)
            .get();
        return snapshot.docs.map(doc => doc.data());
    },
    /**
     * Get users with current location (for Connect map)
     */
    async getWithLocation(cityId) {
        const snapshot = await firebase_1.db
            .collection(COLLECTION)
            .where('currentCityId', '==', cityId)
            .get();
        // Filter for users with location data
        return snapshot.docs
            .map(doc => doc.data())
            .filter(profile => { var _a, _b; return ((_a = profile.currentLocation) === null || _a === void 0 ? void 0 : _a.lat) && ((_b = profile.currentLocation) === null || _b === void 0 ? void 0 : _b.lng); });
    },
    /**
     * Update user profile
     */
    async update(userId, updates) {
        await firebase_1.db.collection(COLLECTION).doc(userId).set(Object.assign(Object.assign({}, updates), { updatedAt: new Date().toISOString() }), { merge: true });
    },
    /**
     * Update user location
     */
    async updateLocation(userId, location) {
        await firebase_1.db.collection(COLLECTION).doc(userId).set({
            currentLocation: Object.assign(Object.assign({}, location), { updatedAt: new Date().toISOString() }),
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
    /**
     * Mark onboarding as completed
     */
    async completeOnboarding(userId) {
        await firebase_1.db.collection(COLLECTION).doc(userId).set({
            completedOnboarding: true,
            updatedAt: new Date().toISOString(),
        }, { merge: true });
    },
};
//# sourceMappingURL=userProfiles.repository.js.map