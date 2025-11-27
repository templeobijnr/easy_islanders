import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const now = FieldValue.serverTimestamp;

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: any;
}

export const socialTools = {
    // --- Tribes ---

    createTribe: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const id = db.collection('tribes').doc().id;
            const payload = { id, name: args.name, description: args.description || '', tags: args.tags || [], ownerId: userId, createdAt: now() };
            await db.collection('tribes').doc(id).set(payload);
            return { success: true, tribe: payload };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    joinTribe: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).set({ joinedAt: now() });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    leaveTribe: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).delete();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    postToTribe: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const postId = db.collection('tribes').doc(args.tribeId).collection('posts').doc().id;
            const payload = { id: postId, content: args.content, mediaUrl: args.mediaUrl || null, userId, createdAt: now() };
            await db.collection('tribes').doc(args.tribeId).collection('posts').doc(postId).set(payload);
            return { success: true, post: payload };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    listTribeMessages: async (args: any): Promise<ToolResult> => {
        try {
            const snap = await db.collection('tribes').doc(args.tribeId).collection('posts').orderBy('createdAt', 'desc').limit(args.limit || 20).get();
            return { success: true, messages: snap.docs.map(d => d.data()) };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    getTribeInfo: async (args: any): Promise<ToolResult> => {
        try {
            const snap = await db.collection('tribes').doc(args.tribeId).get();
            return { success: true, tribe: snap.exists ? snap.data() : null };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    listTrendingTribes: async (args: any): Promise<ToolResult> => {
        try {
            // Approximate trending by recent posts count
            const snap = await db.collection('tribes').orderBy('createdAt', 'desc').limit(50).get();
            return { success: true, tribes: snap.docs.slice(0, args.limit || 10).map(d => d.data()) };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // --- Waves ---

    waveUser: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const waveId = db.collection('waves').doc().id;
            const payload = { id: waveId, from: userId, to: args.targetUserId, status: 'pending', createdAt: now() };
            await db.collection('waves').doc(waveId).set(payload);
            return { success: true, waveId };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    acceptWave: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('waves').doc(args.waveId).set({ status: 'accepted', respondedAt: now() }, { merge: true });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    // --- Check-ins & Discovery ---

    listNearbyUsers: async (_args: any): Promise<ToolResult> => {
        try {
            // Approximate nearby users using recent check-ins (no geo radius yet)
            const snap = await db.collection('checkIns').orderBy('createdAt', 'desc').limit(50).get();
            const seen = new Set<string>();
            const users: any[] = [];
            snap.forEach(doc => {
                const data = doc.data();
                if (data.userId && !seen.has(data.userId)) {
                    seen.add(data.userId);
                    users.push({ userId: data.userId, placeId: data.placeId, placeName: data.placeName, location: data.location });
                }
            });
            return { success: true, users };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    checkInToPlace: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const checkInId = db.collection('checkIns').doc().id;
            const payload = { id: checkInId, userId, placeId: args.placeId, placeName: args.placeName, location: args.location || null, createdAt: now() };
            await db.collection('checkIns').doc(checkInId).set(payload);
            return { success: true, checkInId };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    getCheckInsForPlace: async (args: any): Promise<ToolResult> => {
        try {
            const snap = await db.collection('checkIns').where('placeId', '==', args.placeId).orderBy('createdAt', 'desc').limit(args.limit || 20).get();
            return { success: true, checkIns: snap.docs.map(d => d.data()) };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    fetchVibeMapData: async (args: any): Promise<ToolResult> => {
        console.log("Fetching vibe map data for", args.area);
        return { success: true, area: args.area, hotspots: [] };
    }
};
