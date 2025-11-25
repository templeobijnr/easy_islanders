import { db } from '../config/firebase';

export interface ListingMessage {
  id?: string;
  fromUid?: string;
  fromName?: string;
  contact?: string;
  message: string;
  createdAt?: any;
  read?: boolean;
}

export const messageRepository = {
  list: async (listingId: string, limit = 50): Promise<ListingMessage[]> => {
    const snap = await db.collection('listings').doc(listingId).collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ListingMessage));
  },

  create: async (listingId: string, msg: ListingMessage) => {
    const payload = {
      ...msg,
      createdAt: new Date().toISOString(),
      read: false
    };
    const docRef = await db.collection('listings').doc(listingId).collection('messages').add(payload);
    return { id: docRef.id, ...payload };
  }
};
