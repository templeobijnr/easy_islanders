import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { asToolContext, UserIdOrToolContext } from './toolContext';
import { getErrorMessage } from '../../utils/errors';

const now = FieldValue.serverTimestamp;

// ─────────────────────────────────────────────────────────────────────────────
// Typed Arguments
// ─────────────────────────────────────────────────────────────────────────────

interface CreateItineraryArgs {
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
}

interface AddToItineraryArgs {
    itineraryId: string;
    itemId: string;
    title: string;
    day?: number | null;
}

interface ItineraryItemArgs {
    itineraryId: string;
    itemId: string;
}

interface ItineraryIdArgs {
    itineraryId: string;
}

interface SaveItineraryArgs {
    itineraryId?: string;
}

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Itinerary Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const itineraryTools = {
    createItinerary: async (args: CreateItineraryArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const id = db.collection('itineraries').doc().id;
            const payload = { id, title: args.title, userId, items: [], createdAt: now() };
            await db.collection('itineraries').doc(id).set(payload);
            return { success: true, itineraryId: id };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    addToItinerary: async (args: AddToItineraryArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const ref = db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
            await ref.set({ itemId: args.itemId, title: args.title, day: args.day || null, addedAt: now() });
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    removeFromItinerary: async (args: ItineraryItemArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const ref = db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
            await ref.delete();
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    getItinerary: async (args: ItineraryIdArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const base = await db.collection('itineraries').doc(args.itineraryId).get();
            const itemsSnap = await db.collection('itineraries').doc(args.itineraryId).collection('items').get();
            return { success: true, ...base.data(), items: itemsSnap.docs.map(d => d.data()) };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    saveItinerary: async (_args: SaveItineraryArgs, _userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        return { success: true };
    }
};
