/**
 * Activities Repository
 * Manages events and activities with approval workflow
 */
import { db } from '../config/firebase';
import { Activity, ActivityCategory } from '../types/v1';

const COLLECTION = 'activities';

export const activitiesRepository = {
  /**
   * Create a new activity (starts as pending)
   */
  async create(activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Activity> {
    const now = new Date().toISOString();
    const docRef = await db.collection(COLLECTION).add({
      ...activity,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: docRef.id,
      ...activity,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
  },

  /**
   * Get activity by ID
   */
  async getById(activityId: string): Promise<Activity | null> {
    const doc = await db.collection(COLLECTION).doc(activityId).get();

    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Activity;
  },

  /**
   * Get approved activities in a city
   */
  async getApproved(cityId: string): Promise<Activity[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('status', '==', 'approved')
      .orderBy('startsAt', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Activity));
  },

  /**
   * Get upcoming approved activities
   */
  async getUpcoming(cityId: string): Promise<Activity[]> {
    const now = new Date().toISOString();
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('status', '==', 'approved')
      .where('startsAt', '>=', now)
      .orderBy('startsAt', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Activity));
  },

  /**
   * Get activities by category
   */
  async getByCategory(cityId: string, category: ActivityCategory): Promise<Activity[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('category', '==', category)
      .where('status', '==', 'approved')
      .orderBy('startsAt', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Activity));
  },

  /**
   * Get activities by date range
   */
  async getByDateRange(
    cityId: string,
    startDate: string,
    endDate: string
  ): Promise<Activity[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('cityId', '==', cityId)
      .where('status', '==', 'approved')
      .where('startsAt', '>=', startDate)
      .where('startsAt', '<=', endDate)
      .orderBy('startsAt', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Activity));
  },

  /**
   * Get pending activities (for admin approval)
   */
  async getPending(cityId?: string): Promise<Activity[]> {
    let query = db.collection(COLLECTION).where('status', '==', 'pending');

    if (cityId) {
      query = query.where('cityId', '==', cityId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Activity));
  },

  /**
   * Get activities at a specific place
   */
  async getByPlace(placeId: string): Promise<Activity[]> {
    const snapshot = await db
      .collection(COLLECTION)
      .where('placeId', '==', placeId)
      .where('status', '==', 'approved')
      .orderBy('startsAt', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Activity));
  },

  /**
   * Approve activity
   */
  async approve(activityId: string): Promise<void> {
    await db.collection(COLLECTION).doc(activityId).set(
      {
        status: 'approved',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Reject activity
   */
  async reject(activityId: string): Promise<void> {
    await db.collection(COLLECTION).doc(activityId).set(
      {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Update activity
   */
  async update(activityId: string, updates: Partial<Activity>): Promise<void> {
    await db.collection(COLLECTION).doc(activityId).set(
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Delete activity
   */
  async delete(activityId: string): Promise<void> {
    await db.collection(COLLECTION).doc(activityId).delete();
  },
};
