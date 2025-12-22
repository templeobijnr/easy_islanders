import { db } from '../../config/firebase';

export type LiteContext = {
    role?: string | null;
};

/**
 * Lightweight context used for persona hints (keep it cheap and stable).
 * This should not load large documents or do any heavy aggregation.
 */
export async function getLiteContext(userId: string): Promise<LiteContext> {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        const data = userDoc.data() || {};

        return {
            role: data.role || data.type || null,
        };
    } catch {
        return { role: null };
    }
}

