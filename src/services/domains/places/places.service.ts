/**
 * Domain Service: Places
 *
 * Responsibility:
 * - CRUD operations for places (restaurants, shops, services)
 *
 * Firestore Collections:
 * - places
 *
 * Layer: Domain Service
 *
 * Dependencies:
 * - firebaseConfig (infrastructure)
 *
 * Notes:
 * - Does NOT perform cross-domain orchestration
 * - Safe to modify in isolation
 *
 * Stability: Core
 */

// ⚠ DUPLICATED HELPER: removeUndefined also exists in activities.service, stays.service, unifiedListingsService

import {
  collection,
  query,
  where,
  getDocs,
  limit,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { FirestorePlace } from '../../../types/catalog';

const COLLECTION = 'places';

// Helper: remove undefined values so Firestore doesn't receive them
const removeUndefined = <T extends Record<string, any>>(obj: T): T => {
  const cleaned: any = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      cleaned[key] = value;
    } else if (value && typeof value === 'object' && !(value instanceof Timestamp) && !(value instanceof Date)) {
      cleaned[key] = removeUndefined(value as any);
    } else {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

export const PlacesService = {
  getPlaces: async (category?: string): Promise<FirestorePlace[]> => {
    try {
      let q = query(collection(db, COLLECTION), limit(50));

      if (category && category !== 'All') {
        q = query(q, where('category', '==', category.toLowerCase()));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(
        doc =>
        ({
          id: doc.id,
          ...(doc.data() as any),
        } as FirestorePlace),
      );
    } catch (error) {
      console.error('Error fetching places:', error);
      return [];
    }
  },

  seedPlaces: async () => {
    // Implementation for seeding if needed
  },

  createPlace: async (
    data: Partial<FirestorePlace> & {
      title: string;
      coordinates: { lat: number; lng: number };
      cityId?: string;
      region?: string;
    },
  ) => {
    const payload: Omit<FirestorePlace, 'id'> = {
      type: 'place',
      title: data.title,
      description: data.description,
      category: (data.category as string) || 'place',
      region: data.region || 'Kyrenia',
      cityId: data.cityId || 'north-cyprus',
      coordinates: data.coordinates,
      address: data.address,
      images: data.images || [],
      actions:
        data.actions ||
        ({
          allowCheckIn: true,
          allowWave: true,
          allowTaxi: true,
          allowJoin: data.actions?.allowJoin,
          allowBooking: data.actions?.allowBooking,
        } as any),
      price: data.price,
      currency: data.currency || 'GBP',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const cleanedPayload = removeUndefined(payload);

    const docRef = await addDoc(collection(db, COLLECTION), cleanedPayload as any);
    return { ...(cleanedPayload as FirestorePlace), id: docRef.id };
  },
};
