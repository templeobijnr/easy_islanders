"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLiteContext = getLiteContext;
const firebase_1 = require("../../config/firebase");
/**
 * Lightweight context used for persona hints (keep it cheap and stable).
 * This should not load large documents or do any heavy aggregation.
 */
async function getLiteContext(userId) {
    try {
        const userDoc = await firebase_1.db.collection('users').doc(userId).get();
        const data = userDoc.data() || {};
        return {
            role: data.role || data.type || null,
        };
    }
    catch (_a) {
        return { role: null };
    }
}
//# sourceMappingURL=liteContext.service.js.map