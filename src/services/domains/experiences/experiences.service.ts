/**
 * Experiences Service
 *
 * DOMAIN: Experiences (Bounded Context)
 * COLLECTION: experiences
 *
 * PURPOSE:
 * Manages bookable experiences (guided tours, cooking classes, adventure activities).
 * Experiences are led by hosts, have durations, include specific items/services.
 *
 * SEPARATION RATIONALE:
 * Experiences have distinct lifecycle from Activities and Events.
 * - Experiences: on-demand booking, host-led, duration-based
 * - Activities: scheduled sessions, recurring
 * - Events: one-time, date-specific
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

import { collection, getDocs, query, where, limit, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { FirestoreExperience } from '../../../types/catalog';

const COLLECTION = 'experiences';

export const ExperiencesService = {
  getExperiences: async (region?: string): Promise<FirestoreExperience[]> => {
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
        } as FirestoreExperience),
      );
    } catch (err) {
      console.error('Error fetching experiences', err);
      return [];
    }
  },

  createExperience: async (
    data: Partial<FirestoreExperience> & { title: string; cityId?: string; region?: string },
  ) => {
    const payload: Omit<FirestoreExperience, 'id'> = {
      type: 'experience',
      title: data.title,
      description: data.description,
      category: data.category || 'experience',
      region: data.region || 'Kyrenia',
      cityId: data.cityId || 'north-cyprus',
      coordinates: data.coordinates,
      address: data.address,
      images: data.images || [],
      actions: data.actions || { allowBooking: true },
      price: data.price,
      currency: data.currency || 'GBP',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      duration: data.duration,
      included: data.included,
      requirements: data.requirements,
    };

    const docRef = await addDoc(collection(db, COLLECTION), payload as any);
    return { ...(payload as FirestoreExperience), id: docRef.id };
  },
};
