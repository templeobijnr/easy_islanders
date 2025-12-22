"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiteContext = void 0;
const firebase_1 = require("../../../config/firebase");
/**
 * Returns a trimmed user context for the chat agent:
 * - facts: confirmed attributes (confidence > 0.6)
 * - missing: missingData array
 */
const getLiteContext = async (uid) => {
    const userSnap = await firebase_1.db.collection('users').doc(uid).get();
    const userData = userSnap.data() || {};
    const name = userData.displayName || userData.name || 'Guest';
    const role = userData.type || 'user';
    const docRef = firebase_1.db.collection('users').doc(uid).collection('system').doc('intelligence');
    const snap = await docRef.get();
    // Ensure document exists
    if (!snap.exists) {
        const empty = { attributes: {}, segments: [], missingData: [] };
        await docRef.set(empty, { merge: true });
    }
    const data = snap.exists ? (snap.data() || {}) : { attributes: {}, segments: [], missingData: [] };
    const attrs = data.attributes || {};
    const facts = Object.entries(attrs)
        .filter(([_, val]) => val && val.confidence > 0.6)
        .map(([key, val]) => `${key}: ${val.value}`);
    const missing = Array.isArray(data.missingData) ? data.missingData.slice(0, 3) : [];
    return {
        name,
        role,
        confirmed_interests: facts.filter(f => f.toLowerCase().includes('interest') === false),
        missing_info_probe: missing.length ? missing[0] : null,
        facts,
        missing
    };
};
exports.getLiteContext = getLiteContext;
//# sourceMappingURL=user.service.js.map