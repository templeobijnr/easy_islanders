
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, setDoc, updateDoc, getDoc, query, where, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { UnifiedItem } from '../../types';
import { ALL_MOCK_ITEMS } from '../../constants';
import { sanitizeData } from './utils';

const COLLECTION = 'listings';

export const ListingsStorage = {
  getListings: async (filters?: { businessId?: string; ownerUid?: string }): Promise<UnifiedItem[]> => {
    try {
      let q: any = collection(db, COLLECTION);
      if (filters?.businessId || filters?.ownerUid) {
        const conditions = [];
        if (filters.businessId) {
          conditions.push(where('businessId', '==', filters.businessId));
        }
        if (filters.ownerUid) {
          conditions.push(where('ownerUid', '==', filters.ownerUid));
        }
        // Firestore limits composite where; fallback to simple query or filtered results
        if (conditions.length === 1) {
          q = query(q, conditions[0]);
        } else if (conditions.length === 2) {
          q = query(q, conditions[0], conditions[1]);
        }
      } else {
        q = query(q, orderBy('updatedAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        console.warn("[ListingsStorage] No listings found in Firestore, falling back to mock data.");
        return ALL_MOCK_ITEMS as any as UnifiedItem[];
      }
      const docs = querySnapshot.docs.map(doc => doc.data() as UnifiedItem);
      console.log(`[ListingsStorage] Fetched ${docs.length} listings from Firestore`);
      return docs;
    } catch (error) {
      console.error("Error fetching listings:", error);
      console.warn("[ListingsStorage] Falling back to mock listings.");
      return ALL_MOCK_ITEMS as any as UnifiedItem[];
    }
  },

  saveListing: async (listing: UnifiedItem): Promise<UnifiedItem> => {
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, COLLECTION, listing.id), {
        ...sanitizeData(listing),
        updatedAt: now,
        createdAt: (listing as any).createdAt || now,
      }, { merge: true });
      return listing;
    } catch (error) {
      console.error("Error saving listing:", error);
      throw error;
    }
  },

  deleteListing: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
      console.error("Error deleting listing:", error);
      throw error;
    }
  },

  toggleBoost: async (id: string): Promise<UnifiedItem[]> => {
    try {
      const ref = doc(db, COLLECTION, id);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        const current = snapshot.data();
        await updateDoc(ref, { isBoosted: !current.isBoosted });
      }
      return await ListingsStorage.getListings();
    } catch (error) {
      console.error("Error toggling boost:", error);
      return [];
    }
  }
};
