import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const now = FieldValue.serverTimestamp;

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: any;
}

export const itineraryTools = {
    createItinerary: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const id = db.collection('itineraries').doc().id;
            const payload = { id, title: args.title, userId, items: [], createdAt: now() };
            await db.collection('itineraries').doc(id).set(payload);
            return { success: true, itineraryId: id };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    addToItinerary: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const ref = db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
            await ref.set({ itemId: args.itemId, title: args.title, day: args.day || null, addedAt: now() });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    removeFromItinerary: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const ref = db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
            await ref.delete();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    getItinerary: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const base = await db.collection('itineraries').doc(args.itineraryId).get();
            const itemsSnap = await db.collection('itineraries').doc(args.itineraryId).collection('items').get();
            return { success: true, ...base.data(), items: itemsSnap.docs.map(d => d.data()) };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    saveItinerary: async (_args: any, _userId: string): Promise<ToolResult> => {
        return { success: true };
    }
};
