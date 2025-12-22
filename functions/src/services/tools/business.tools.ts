import { db } from '../../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { asToolContext, UserIdOrToolContext } from './toolContext';
import { getErrorMessage } from '../../utils/errors';

const now = FieldValue.serverTimestamp;

// ─────────────────────────────────────────────────────────────────────────────
// Typed Arguments
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateBusinessInfoArgs {
    businessId: string;
    name?: string;
    description?: string;
    phone?: string;
}

interface UpdateBusinessAvailabilityArgs {
    businessId: string;
    availability: Record<string, boolean | string>;
}

interface UpdateBusinessHoursArgs {
    businessId: string;
    hours: Record<string, { open: string; close: string }>;
}

interface UploadBusinessMediaArgs {
    businessId: string;
    mediaUrl: string;
}

interface BusinessIdArgs {
    businessId: string;
}

interface RespondToLeadArgs {
    businessId: string;
    leadId: string;
    message: string;
}

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Business Tools Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const businessTools = {
    updateBusinessInfo: async (args: UpdateBusinessInfoArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).set({
                name: args.name,
                description: args.description,
                phone: args.phone,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    updateBusinessAvailability: async (args: UpdateBusinessAvailabilityArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).set({
                availability: args.availability,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    updateBusinessHours: async (args: UpdateBusinessHoursArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).set({
                hours: args.hours,
                updatedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    uploadBusinessMedia: async (args: UploadBusinessMediaArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const mediaId = db.collection('businesses').doc(args.businessId).collection('media').doc().id;
            await db.collection('businesses').doc(args.businessId).collection('media').doc(mediaId).set({
                mediaUrl: args.mediaUrl,
                uploadedAt: now()
            });
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    listBusinessLeads: async (args: BusinessIdArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            const snap = await db.collection('businesses').doc(args.businessId).collection('leads').orderBy('createdAt', 'desc').limit(20).get();
            return { success: true, leads: snap.docs.map(d => d.data()) };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    respondToLead: async (args: RespondToLeadArgs, userIdOrContext: UserIdOrToolContext): Promise<ToolResult> => {
        const userId = asToolContext(userIdOrContext).userId;
        if (!userId) return { success: false, error: "Unauthorized: User ID required" };

        try {
            await db.collection('businesses').doc(args.businessId).collection('leads').doc(args.leadId).set({
                response: args.message,
                respondedAt: now()
            }, { merge: true });
            return { success: true };
        } catch (err: unknown) {
            return { success: false, error: getErrorMessage(err) };
        }
    }
};
