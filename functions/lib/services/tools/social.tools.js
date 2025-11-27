"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialTools = void 0;
const firebase_1 = require("../../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
const now = firestore_1.FieldValue.serverTimestamp;
exports.socialTools = {
    // --- Tribes ---
    createTribe: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const id = firebase_1.db.collection('tribes').doc().id;
            const payload = { id, name: args.name, description: args.description || '', tags: args.tags || [], ownerId: userId, createdAt: now() };
            await firebase_1.db.collection('tribes').doc(id).set(payload);
            return { success: true, tribe: payload };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    joinTribe: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            await firebase_1.db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).set({ joinedAt: now() });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    leaveTribe: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            await firebase_1.db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).delete();
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    postToTribe: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const postId = firebase_1.db.collection('tribes').doc(args.tribeId).collection('posts').doc().id;
            const payload = { id: postId, content: args.content, mediaUrl: args.mediaUrl || null, userId, createdAt: now() };
            await firebase_1.db.collection('tribes').doc(args.tribeId).collection('posts').doc(postId).set(payload);
            return { success: true, post: payload };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    listTribeMessages: async (args) => {
        try {
            const snap = await firebase_1.db.collection('tribes').doc(args.tribeId).collection('posts').orderBy('createdAt', 'desc').limit(args.limit || 20).get();
            return { success: true, messages: snap.docs.map(d => d.data()) };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    getTribeInfo: async (args) => {
        try {
            const snap = await firebase_1.db.collection('tribes').doc(args.tribeId).get();
            return { success: true, tribe: snap.exists ? snap.data() : null };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    listTrendingTribes: async (args) => {
        try {
            // Approximate trending by recent posts count
            const snap = await firebase_1.db.collection('tribes').orderBy('createdAt', 'desc').limit(50).get();
            return { success: true, tribes: snap.docs.slice(0, args.limit || 10).map(d => d.data()) };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    // --- Waves ---
    waveUser: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const waveId = firebase_1.db.collection('waves').doc().id;
            const payload = { id: waveId, from: userId, to: args.targetUserId, status: 'pending', createdAt: now() };
            await firebase_1.db.collection('waves').doc(waveId).set(payload);
            return { success: true, waveId };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    acceptWave: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            await firebase_1.db.collection('waves').doc(args.waveId).set({ status: 'accepted', respondedAt: now() }, { merge: true });
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    // --- Check-ins & Discovery ---
    listNearbyUsers: async (_args) => {
        try {
            // Approximate nearby users using recent check-ins (no geo radius yet)
            const snap = await firebase_1.db.collection('checkIns').orderBy('createdAt', 'desc').limit(50).get();
            const seen = new Set();
            const users = [];
            snap.forEach(doc => {
                const data = doc.data();
                if (data.userId && !seen.has(data.userId)) {
                    seen.add(data.userId);
                    users.push({ userId: data.userId, placeId: data.placeId, placeName: data.placeName, location: data.location });
                }
            });
            return { success: true, users };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    checkInToPlace: async (args, userId) => {
        if (!userId)
            return { success: false, error: "Unauthorized: User ID required" };
        try {
            const checkInId = firebase_1.db.collection('checkIns').doc().id;
            const payload = { id: checkInId, userId, placeId: args.placeId, placeName: args.placeName, location: args.location || null, createdAt: now() };
            await firebase_1.db.collection('checkIns').doc(checkInId).set(payload);
            return { success: true, checkInId };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    getCheckInsForPlace: async (args) => {
        try {
            const snap = await firebase_1.db.collection('checkIns').where('placeId', '==', args.placeId).orderBy('createdAt', 'desc').limit(args.limit || 20).get();
            return { success: true, checkIns: snap.docs.map(d => d.data()) };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    fetchVibeMapData: async (args) => {
        console.log("Fetching vibe map data for", args.area);
        return { success: true, area: args.area, hotspots: [] };
    }
};
//# sourceMappingURL=social.tools.js.map