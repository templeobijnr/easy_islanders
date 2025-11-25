import { db } from '../config/firebase';

export interface AvailabilitySlot {
  id?: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  status: 'available' | 'blocked' | 'booked';
  source?: 'manual' | 'booking';
  createdAt?: any;
  updatedAt?: any;
}

export const availabilityRepository = {
  list: async (listingId: string, start?: string, end?: string): Promise<AvailabilitySlot[]> => {
    let ref = db.collection('listings').doc(listingId).collection('availability') as FirebaseFirestore.Query;
    if (start) {
      ref = ref.where('endDate', '>=', start);
    }
    if (end) {
      ref = ref.where('startDate', '<=', end);
    }
    const snap = await ref.orderBy('startDate', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AvailabilitySlot));
  },

  upsert: async (listingId: string, slotId: string | undefined, slot: AvailabilitySlot) => {
    const id = slotId || db.collection('noop').doc().id;
    const payload = {
      ...slot,
      createdAt: slot.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.collection('listings').doc(listingId).collection('availability').doc(id).set(payload, { merge: true });
    return { id, ...payload };
  }
};
