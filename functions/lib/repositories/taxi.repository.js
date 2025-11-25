"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markRequestExpired = exports.updateDriverStatus = exports.getTaxiRequest = exports.findPendingRequestForDriver = exports.assignDriverToRequest = exports.updateBroadcastList = exports.createTaxiRequest = exports.findDriverByPhone = exports.findAvailableTaxis = void 0;
const firebase_1 = require("../config/firebase");
const DRIVERS_COLLECTION = 'taxi_drivers';
const REQUESTS_COLLECTION = 'taxi_requests';
/**
 * Find available taxis in a specific district
 */
const findAvailableTaxis = async (district, limit = 5) => {
    const snapshot = await firebase_1.db.collection(DRIVERS_COLLECTION)
        .where('status', '==', 'available')
        .where('currentLocation.district', '==', district)
        .limit(limit)
        .get();
    return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
};
exports.findAvailableTaxis = findAvailableTaxis;
/**
 * Find driver by phone number
 */
const findDriverByPhone = async (phone) => {
    const snapshot = await firebase_1.db.collection(DRIVERS_COLLECTION)
        .where('phone', '==', phone)
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    const doc = snapshot.docs[0];
    return Object.assign({ id: doc.id }, doc.data());
};
exports.findDriverByPhone = findDriverByPhone;
/**
 * Create a new taxi request
 */
const createTaxiRequest = async (request) => {
    const docRef = await firebase_1.db.collection(REQUESTS_COLLECTION).add(Object.assign(Object.assign({}, request), { createdAt: new Date(), status: 'pending', broadcastSentTo: [] }));
    return docRef.id;
};
exports.createTaxiRequest = createTaxiRequest;
/**
 * Update the broadcast list for a request
 */
const updateBroadcastList = async (requestId, driverIds) => {
    await firebase_1.db.collection(REQUESTS_COLLECTION).doc(requestId).update({
        broadcastSentTo: driverIds
    });
};
exports.updateBroadcastList = updateBroadcastList;
/**
 * Atomic assignment - ensures only one driver can accept a request
 * Returns true if successful, false if already assigned
 */
const assignDriverToRequest = async (requestId, driverId) => {
    return await firebase_1.db.runTransaction(async (transaction) => {
        const requestRef = firebase_1.db.collection(REQUESTS_COLLECTION).doc(requestId);
        const driverRef = firebase_1.db.collection(DRIVERS_COLLECTION).doc(driverId);
        const requestDoc = await transaction.get(requestRef);
        if (!requestDoc.exists) {
            throw new Error("Request not found");
        }
        const data = requestDoc.data();
        // CRITICAL: Check if already assigned
        if (data.status !== 'pending' || data.assignedDriverId) {
            return false; // Too late, someone else took it
        }
        // Lock the ride
        transaction.update(requestRef, {
            status: 'assigned',
            assignedDriverId: driverId,
            assignedAt: new Date()
        });
        // Mark driver as busy
        transaction.update(driverRef, {
            status: 'busy'
        });
        return true; // Success
    });
};
exports.assignDriverToRequest = assignDriverToRequest;
/**
 * Find the most recent pending request that was broadcast to a driver
 */
const findPendingRequestForDriver = async (driverPhone) => {
    // First find the driver
    const driver = await (0, exports.findDriverByPhone)(driverPhone);
    if (!driver)
        return null;
    // Find pending requests where this driver was in the broadcast list
    const snapshot = await firebase_1.db.collection(REQUESTS_COLLECTION)
        .where('status', '==', 'pending')
        .where('broadcastSentTo', 'array-contains', driver.id)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    if (snapshot.empty)
        return null;
    const doc = snapshot.docs[0];
    return Object.assign({ id: doc.id }, doc.data());
};
exports.findPendingRequestForDriver = findPendingRequestForDriver;
/**
 * Get taxi request by ID
 */
const getTaxiRequest = async (requestId) => {
    const doc = await firebase_1.db.collection(REQUESTS_COLLECTION).doc(requestId).get();
    if (!doc.exists)
        return null;
    return Object.assign({ id: doc.id }, doc.data());
};
exports.getTaxiRequest = getTaxiRequest;
/**
 * Update taxi driver status
 */
const updateDriverStatus = async (driverId, status) => {
    await firebase_1.db.collection(DRIVERS_COLLECTION).doc(driverId).update({ status });
};
exports.updateDriverStatus = updateDriverStatus;
/**
 * Mark request as expired
 */
const markRequestExpired = async (requestId) => {
    await firebase_1.db.collection(REQUESTS_COLLECTION).doc(requestId).update({
        status: 'expired'
    });
};
exports.markRequestExpired = markRequestExpired;
//# sourceMappingURL=taxi.repository.js.map