"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityRepository = void 0;
const firebase_1 = require("../config/firebase");
exports.availabilityRepository = {
    list: async (listingId, start, end) => {
        let ref = firebase_1.db.collection('listings').doc(listingId).collection('availability');
        if (start) {
            ref = ref.where('endDate', '>=', start);
        }
        if (end) {
            ref = ref.where('startDate', '<=', end);
        }
        const snap = await ref.orderBy('startDate', 'asc').get();
        return snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
    },
    upsert: async (listingId, slotId, slot) => {
        const id = slotId || firebase_1.db.collection('noop').doc().id;
        const payload = Object.assign(Object.assign({}, slot), { createdAt: slot.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
        await firebase_1.db.collection('listings').doc(listingId).collection('availability').doc(id).set(payload, { merge: true });
        return Object.assign({ id }, payload);
    }
};
//# sourceMappingURL=availability.repository.js.map