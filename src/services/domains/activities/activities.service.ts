/**
 * Activities Service
 *
 * DOMAIN: Activities (Bounded Context)
 * COLLECTION: activities
 *
 * PURPOSE:
 * Manages scheduled/recurring activities (yoga classes, group tours, workshops).
 * Activities have fixed schedules and can recur. Users join scheduled sessions.
 *
 * SEPARATION RATIONALE:
 * Activities have distinct lifecycle from Events (one-time) and Experiences (bookable tours).
 * - Activities: scheduled, recurring, session-based
 * - Events: one-time, date-specific
 * - Experiences: on-demand, host-led tours
 *
 * ANTI-PATTERN WARNING:
 * Do NOT merge this collection into a unified 'listings' collection.
 * Do NOT introduce a polymorphic 'type' field to collapse domains.
 * Similar code patterns ≠ same domain.
 *
 * FUTURE EVOLUTION:
 * If unification is ever considered, it requires explicit re-architecture approval
 * and must be driven by business requirements, not code convenience.
 */

import {
  collection,
  getDocs,
  query,
  where,
  limit,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { FirestoreActivity } from '../../../types/catalog';

const COLLECTION = 'activities';

// Helper: remove undefined values so Firestore doesn't receive them
const removeUndefined = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: any = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      cleaned[key] = value;
    } else if (
      value &&
      typeof value === 'object' &&
      !(value instanceof Timestamp) &&
      !(value instanceof Date)
    ) {
      cleaned[key] = removeUndefined(value as any);
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

export const ActivitiesService = {
  getActivities: async (region?: string): Promise<FirestoreActivity[]> => {
    try {
      let q = query(collection(db, COLLECTION), limit(50));
      if (region && region !== 'All') {
        q = query(q, where('region', '==', region));
      }
      const snap = await getDocs(q);
      return snap.docs.map(
        d =>
        ({
          id: d.id,
          ...(d.data() as any),
        } as FirestoreActivity),
      );
    } catch (err) {
      console.error('Error fetching activities', err);
      return [];
    }
  },

  createActivity: async (
    data: Partial<FirestoreActivity> & { title: string; cityId?: string; region?: string },
  ) => {
    const payload: Omit<FirestoreActivity, 'id'> = {
      type: 'activity',
      title: data.title,
      description: data.description,
      category: data.category || 'activity',
      region: data.region || 'Kyrenia',
      cityId: data.cityId || 'north-cyprus',
      coordinates: data.coordinates,
      address: data.address,
      images: data.images || [],
      actions:
        data.actions || { allowBooking: true, allowJoin: true, allowWave: true, allowTaxi: true },
      price: data.price,
      currency: data.currency || 'GBP',
      pricing: data.pricing,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      startTime: data.startTime,
      endTime: data.endTime,
      approved: data.approved ?? true,
    };

    const cleanedPayload = removeUndefined(payload);

    // Uses unified db - permissions are enforced by Firestore security rules
    // which check the user's custom claims (isAdmin)
    const docRef = await addDoc(collection(db, COLLECTION), cleanedPayload as any);

    return { ...(cleanedPayload as FirestoreActivity), id: docRef.id };
  },

  updateActivity: async (id: string, data: Partial<FirestoreActivity>) => {
    const ref = doc(db, COLLECTION, id);
    const payload = removeUndefined({
      ...data,
      updatedAt: Timestamp.now(),
    } as any);

    try {
      await updateDoc(ref, payload);
    } catch (err) {
      console.error('Update activity failed:', err);
      throw err;
    }
  },
};
