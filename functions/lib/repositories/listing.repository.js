"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingRepository = void 0;
const firebase_1 = require("../config/firebase");
exports.listingRepository = {
    // Used by AI Search and reindex
    getAllActive: async (filters) => {
        try {
            let ref = firebase_1.db.collection('listings');
            if (filters === null || filters === void 0 ? void 0 : filters.businessId) {
                ref = ref.where('businessId', '==', filters.businessId);
            }
            if (filters === null || filters === void 0 ? void 0 : filters.ownerUid) {
                ref = ref.where('ownerUid', '==', filters.ownerUid);
            }
            if (filters === null || filters === void 0 ? void 0 : filters.domain) {
                ref = ref.where('domain', '==', filters.domain);
            }
            const snapshot = await ref.get();
            if (snapshot.empty) {
                console.warn("[ListingRepo] No listings found with filters:", filters || {});
                return [];
            }
            const docs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            console.log(`[ListingRepo] Retrieved ${docs.length} listings`, filters || {});
            return docs;
        }
        catch (error) {
            console.error("Repo Error getAllActive:", error);
            return [];
        }
    },
    // Used by Booking Tool (Validation)
    getById: async (id) => {
        try {
            const doc = await firebase_1.db.collection('listings').doc(id).get();
            if (!doc.exists)
                return null;
            return Object.assign({ id: doc.id }, doc.data());
        }
        catch (error) {
            console.error("Repo Error getById:", error);
            return null;
        }
    }
};
//# sourceMappingURL=listing.repository.js.map