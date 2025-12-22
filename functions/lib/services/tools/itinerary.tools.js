"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.itineraryTools = void 0;
const firebase_1 = require("../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const toolContext_1 = require("./toolContext");
const now = firestore_1.FieldValue.serverTimestamp;
exports.itineraryTools = {
    createItinerary: async (args, userIdOrContext) => {
        const userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const id = firebase_1.db.collection('itineraries').doc().id;
            const payload = { id, title: args.title, userId, items: [], createdAt: now() };
            await firebase_1.db.collection('itineraries').doc(id).set(payload);
            return { success: true, itineraryId: id };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    addToItinerary: async (args, userIdOrContext) => {
        const userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const ref = firebase_1.db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
            await ref.set({ itemId: args.itemId, title: args.title, day: args.day || null, addedAt: now() });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    removeFromItinerary: async (args, userIdOrContext) => {
        const userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const ref = firebase_1.db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
            await ref.delete();
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    getItinerary: async (args, userIdOrContext) => {
        const userId = (0, toolContext_1.asToolContext)(userIdOrContext).userId;
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const base = await firebase_1.db.collection('itineraries').doc(args.itineraryId).get();
            const itemsSnap = await firebase_1.db.collection('itineraries').doc(args.itineraryId).collection('items').get();
            return Object.assign(Object.assign({ success: true }, base.data()), { items: itemsSnap.docs.map(d => d.data()) });
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    saveItinerary: async (_args, _userIdOrContext) => {
        return { success: true };
    }
};
//# sourceMappingURL=itinerary.tools.js.map