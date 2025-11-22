"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingRepository = void 0;
const firebase_1 = require("../config/firebase");
exports.listingRepository = {
    // Used by AI Search
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
                if ((filters === null || filters === void 0 ? void 0 : filters.businessId) || (filters === null || filters === void 0 ? void 0 : filters.ownerUid) || (filters === null || filters === void 0 ? void 0 : filters.domain)) {
                    return [];
                }
                console.log("⚠️ [Repo] No listings found in DB, returning MOCK data.");
                return [
                    {
                        id: "prop_1",
                        title: "Bellapais Abbey View Villa",
                        domain: "Real Estate",
                        category: "Villa",
                        subCategory: "short-term",
                        location: "Kyrenia",
                        price: 250,
                        currency: "GBP",
                        amenities: ["Infinity Pool", "Mountain View", "BBQ", "Wifi", "AC"],
                        description: "A serene and luxurious villa with breathtaking views.",
                        status: "active"
                    },
                    {
                        id: "prop_2",
                        title: "Kyrenia Harbour Penthouse",
                        domain: "Real Estate",
                        category: "Apartment",
                        subCategory: "short-term",
                        location: "Kyrenia",
                        price: 150,
                        currency: "GBP",
                        amenities: ["Terrace", "Jacuzzi", "Walk to Harbour", "Wifi"],
                        description: "Charming penthouse right in the heart of the city.",
                        status: "active"
                    },
                    {
                        id: "car_6",
                        title: "Hyundai i10",
                        domain: "Cars",
                        category: "Compact",
                        subCategory: "rental",
                        location: "Kyrenia",
                        price: 20,
                        currency: "GBP",
                        amenities: ["AC", "Compact"],
                        status: "active"
                    }
                ];
            }
            return snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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