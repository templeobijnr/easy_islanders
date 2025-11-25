import { db } from '../config/firebase';
import { UserLiteContext } from '../types/user';

/**
 * Returns a trimmed user context for the chat agent:
 * - facts: confirmed attributes (confidence > 0.6)
 * - missing: missingData array
 */
export const getLiteContext = async (uid: string): Promise<UserLiteContext> => {
    const userSnap = await db.collection('users').doc(uid).get();
    const userData: any = userSnap.data() || {};
    const name = userData.displayName || userData.name || 'Guest';
    const role = userData.type || 'user';

    const docRef = db.collection('users').doc(uid).collection('system').doc('intelligence');
    const snap = await docRef.get();
    // Ensure document exists
    if (!snap.exists) {
        const empty = { attributes: {}, segments: [], missingData: [] };
        await docRef.set(empty, { merge: true });
    }
    const data: any = snap.exists ? (snap.data() || {}) : { attributes: {}, segments: [], missingData: [] };
    const attrs = data.attributes || {};
    const facts: string[] = Object.entries(attrs)
        .filter(([_, val]: any) => val && val.confidence > 0.6)
        .map(([key, val]: any) => `${key}: ${val.value}`);
    const missing: string[] = Array.isArray(data.missingData) ? data.missingData.slice(0, 3) : [];

    return {
        name,
        role,
        confirmed_interests: facts.filter(f => f.toLowerCase().includes('interest') === false),
        missing_info_probe: missing.length ? missing[0] : null,
        facts,
        missing
    };
};
