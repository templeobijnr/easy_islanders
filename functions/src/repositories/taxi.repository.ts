import { db } from '../config/firebase';
import { TaxiDriver, TaxiRequest } from '../types/taxi';

const DRIVERS_COLLECTION = 'taxi_drivers';
const REQUESTS_COLLECTION = 'taxi_requests';

/**
 * Find available taxis in a specific district
 * If district is "Unknown", broadcasts to ALL available drivers
 */
export const findAvailableTaxis = async (district: string, limit: number = 5): Promise<TaxiDriver[]> => {
    let query = db.collection(DRIVERS_COLLECTION)
        .where('status', '==', 'available');

    // Only filter by district if it's known
    if (district && district !== 'Unknown') {
        query = query.where('currentLocation.district', '==', district);
    }

    const snapshot = await query.limit(limit).get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaxiDriver));
};

/**
 * Find driver by phone number
 */
export const findDriverByPhone = async (phone: string): Promise<TaxiDriver | null> => {
    const snapshot = await db.collection(DRIVERS_COLLECTION)
        .where('phone', '==', phone)
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as TaxiDriver;
};

/**
 * Create a new taxi request
 */
export const createTaxiRequest = async (request: Omit<TaxiRequest, 'id' | 'status' | 'createdAt' | 'broadcastSentTo'>): Promise<string> => {
    const docRef = await db.collection(REQUESTS_COLLECTION).add({
        ...request,
        createdAt: new Date(),
        status: 'pending',
        broadcastSentTo: []
    });
    return docRef.id;
};

/**
 * Update the broadcast list for a request
 */
export const updateBroadcastList = async (requestId: string, driverIds: string[]): Promise<void> => {
    await db.collection(REQUESTS_COLLECTION).doc(requestId).update({
        broadcastSentTo: driverIds
    });
};

/**
 * Atomic assignment - ensures only one driver can accept a request
 * Returns true if successful, false if already assigned
 */
export const assignDriverToRequest = async (requestId: string, driverId: string): Promise<boolean> => {
    return await db.runTransaction(async (transaction) => {
        const requestRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
        const driverRef = db.collection(DRIVERS_COLLECTION).doc(driverId);

        const requestDoc = await transaction.get(requestRef);
        const driverDoc = await transaction.get(driverRef);

        if (!requestDoc.exists) {
            throw new Error("Request not found");
        }

        if (!driverDoc.exists) {
            throw new Error("Driver not found");
        }

        const requestData = requestDoc.data() as TaxiRequest;
        const driverData = driverDoc.data() as TaxiDriver;

        // CRITICAL: Check if already assigned
        if (requestData.status !== 'pending' || requestData.assignedDriverId) {
            return false; // Too late, someone else took it
        }

        // Lock the ride and store driver details
        transaction.update(requestRef, {
            status: 'assigned',
            assignedDriverId: driverId,
            assignedAt: new Date(),
            // Store driver details for easy access
            driverName: driverData.name,
            driverPhone: driverData.phone,
            vehicleType: driverData.vehicleType,
            rating: driverData.rating
        });

        // Mark driver as busy
        transaction.update(driverRef, {
            status: 'busy'
        });

        return true; // Success
    });
};

/**
 * Find the most recent pending request that was broadcast to a driver
 */
export const findPendingRequestForDriver = async (driverPhone: string): Promise<TaxiRequest | null> => {
    // First find the driver
    const driver = await findDriverByPhone(driverPhone);
    if (!driver) return null;

    // Find pending requests where this driver was in the broadcast list
    const snapshot = await db.collection(REQUESTS_COLLECTION)
        .where('status', '==', 'pending')
        .where('broadcastSentTo', 'array-contains', driver.id)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as TaxiRequest;
};

/**
 * Get taxi request by ID
 */
export const getTaxiRequest = async (requestId: string): Promise<TaxiRequest | null> => {
    const doc = await db.collection(REQUESTS_COLLECTION).doc(requestId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as TaxiRequest;
};

/**
 * Update taxi driver status
 */
export const updateDriverStatus = async (driverId: string, status: 'available' | 'busy' | 'offline'): Promise<void> => {
    await db.collection(DRIVERS_COLLECTION).doc(driverId).update({ status });
};

/**
 * Mark request as expired
 */
export const markRequestExpired = async (requestId: string): Promise<void> => {
    await db.collection(REQUESTS_COLLECTION).doc(requestId).update({
        status: 'expired'
    });
};
