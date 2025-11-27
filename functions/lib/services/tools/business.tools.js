"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessTools = void 0;
const firebase_1 = require("../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const now = firestore_1.FieldValue.serverTimestamp;
exports.businessTools = {
    updateBusinessInfo: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            await firebase_1.db.collection('businesses').doc(args.businessId).set({
                name: args.name,
                description: args.description,
                phone: args.phone,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    updateBusinessAvailability: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            await firebase_1.db.collection('businesses').doc(args.businessId).set({
                availability: args.availability,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    updateBusinessHours: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            await firebase_1.db.collection('businesses').doc(args.businessId).set({
                hours: args.hours,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    uploadBusinessMedia: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const mediaId = firebase_1.db.collection('businesses').doc(args.businessId).collection('media').doc().id;
            await firebase_1.db.collection('businesses').doc(args.businessId).collection('media').doc(mediaId).set({
                mediaUrl: args.mediaUrl,
                uploadedAt: now()
            });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    listBusinessLeads: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const snap = await firebase_1.db.collection('businesses').doc(args.businessId).collection('leads').orderBy('createdAt', 'desc').limit(20).get();
            return { success: true, leads: snap.docs.map(d => d.data()) };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    respondToLead: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            await firebase_1.db.collection('businesses').doc(args.businessId).collection('leads').doc(args.leadId).set({
                response: args.message,
                respondedAt: now()
            }, { merge: true });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
};
//# sourceMappingURL=business.tools.js.map