import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const now = FieldValue.serverTimestamp;

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: any;
}

export const businessTools = {
    updateBusinessInfo: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).set({
                name: args.name,
                description: args.description,
                phone: args.phone,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    updateBusinessAvailability: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).set({
                availability: args.availability,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    updateBusinessHours: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).set({
                hours: args.hours,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    uploadBusinessMedia: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const mediaId = db.collection('businesses').doc(args.businessId).collection('media').doc().id;
            await db.collection('businesses').doc(args.businessId).collection('media').doc(mediaId).set({
                mediaUrl: args.mediaUrl,
                uploadedAt: now()
            });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    listBusinessLeads: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const snap = await db.collection('businesses').doc(args.businessId).collection('leads').orderBy('createdAt', 'desc').limit(20).get();
            return { success: true, leads: snap.docs.map(d => d.data()) };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    respondToLead: async (args: any, userId: string): Promise<ToolResult> => {
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).collection('leads').doc(args.leadId).set({
                response: args.message,
                respondedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
};
