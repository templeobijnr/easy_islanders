/**
 * Events Service
 *
 * DOMAIN: Events (Bounded Context)
 * COLLECTION: events
 *
 * PURPOSE:
 * Manages one-time events (concerts, festivals, pop-up markets, parties).
 * Events have specific start/end times and are not recurring.
 *
 * SEPARATION RATIONALE:
 * Events have distinct lifecycle from Activities and Experiences.
 * - Events: one-time, date-specific, public gatherings
 * - Activities: scheduled sessions, recurring
 * - Experiences: on-demand booking, host-led
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
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { FirestoreEvent } from '../../../types/catalog';

const COLLECTION = 'events';

export const EventsService = {
  getEvents: async (region?: string): Promise<FirestoreEvent[]> => {
    try {
      let q = query(collection(db, COLLECTION), orderBy('startTime', 'asc'), limit(50));
      if (region && region !== 'All') {
        q = query(q, where('region', '==', region));
      }
      const snap = await getDocs(q);
      return snap.docs.map(
        d =>
        ({
          id: d.id,
          ...(d.data() as any),
        } as FirestoreEvent),
      );
    } catch (err) {
      console.error('Error fetching events', err);
      return [];
    }
  },

  createEvent: async (data: Partial<FirestoreEvent> & { title: string; startTime: any }) => {
    const payload: Omit<FirestoreEvent, 'id'> = {
      type: 'event',
      title: data.title,
      description: data.description,
      category: data.category || 'event',
      region: data.region || 'Kyrenia',
      cityId: data.cityId || 'north-cyprus',
      coordinates: data.coordinates,
      address: data.address,
      images: data.images || [],
      actions:
        data.actions || { allowJoin: true, allowCheckIn: true, allowWave: true, allowTaxi: true },
      price: data.price,
      currency: data.currency || 'GBP',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      startTime: data.startTime,
      endTime: data.endTime,
      isPublic: data.isPublic ?? true,
      approved: data.approved ?? true,
    };

    const docRef = await addDoc(collection(db, COLLECTION), payload as any);

    return { ...(payload as FirestoreEvent), id: docRef.id };
  },
};
