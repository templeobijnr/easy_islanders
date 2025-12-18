import * as logger from "firebase-functions/logger";
import { db } from "../config/firebase";
import { UnifiedItem } from "../types/marketplace";

export const listingRepository = {
  // Used by AI Search and reindex
  getAllActive: async (filters?: {
    businessId?: string;
    ownerUid?: string;
    domain?: string;
  }): Promise<UnifiedItem[]> => {
    try {
      let ref: FirebaseFirestore.Query = db.collection("listings");

      if (filters?.businessId) {
        ref = ref.where("businessId", "==", filters.businessId);
      }
      if (filters?.ownerUid) {
        ref = ref.where("ownerUid", "==", filters.ownerUid);
      }
      if (filters?.domain) {
        ref = ref.where("domain", "==", filters.domain);
      }

      const snapshot = await ref.get();

      if (snapshot.empty) {
        console.warn(
          "[ListingRepo] No listings found with filters:",
          filters || {},
        );
        return [];
      }

      const docs = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as UnifiedItem,
      );

      logger.debug(
        `[ListingRepo] Retrieved ${docs.length} listings`,
        filters || {},
      );
      return docs;
    } catch (error) {
      console.error("Repo Error getAllActive:", error);
      return [];
    }
  },

  // Used by Booking Tool (Validation)
  getById: async (id: string): Promise<UnifiedItem | null> => {
    try {
      const doc = await db.collection("listings").doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as UnifiedItem;
    } catch (error) {
      console.error("Repo Error getById:", error);
      return null;
    }
  },
};
