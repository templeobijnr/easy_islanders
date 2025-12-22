"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listingDataRepository = void 0;
const firebase_1 = require("../config/firebase");
exports.listingDataRepository = {
    async listItems(listingId, kind) {
        const snap = await firebase_1.db.collection('listings').doc(listingId).collection(kind).get();
        const items = snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.name || '').localeCompare(b.name || ''));
        return items;
    }
};
//# sourceMappingURL=listing-data.repository.js.map