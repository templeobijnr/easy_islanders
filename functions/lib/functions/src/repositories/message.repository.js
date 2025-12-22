"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRepository = void 0;
const firebase_1 = require("../config/firebase");
exports.messageRepository = {
    list: async (listingId, limit = 50) => {
        const snap = await firebase_1.db.collection('listings').doc(listingId).collection('messages')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        return snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
    },
    create: async (listingId, msg) => {
        const payload = Object.assign(Object.assign({}, msg), { createdAt: new Date().toISOString(), read: false });
        const docRef = await firebase_1.db.collection('listings').doc(listingId).collection('messages').add(payload);
        return Object.assign({ id: docRef.id }, payload);
    }
};
//# sourceMappingURL=message.repository.js.map