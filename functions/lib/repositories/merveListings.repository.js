"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.merveListingsRepository = void 0;
const firebase_1 = require("../config/firebase");
const LEGACY_ACTIONS_BY_TOOLTYPE = {
    restaurant: ['order_food', 'reserve_table', 'inquire'],
    provider: ['book_service', 'request_service', 'inquire'],
    activity: ['book_activity', 'inquire'],
    stay: ['book_stay', 'inquire'],
};
function normalizeMerve(merve) {
    if (!merve || typeof merve !== 'object')
        return null;
    const enabled = Boolean(merve.enabled);
    if (!enabled)
        return { enabled: false, actions: [] };
    const actionsRaw = Array.isArray(merve.actions) ? merve.actions : [];
    const actions = actionsRaw
        .filter(a => a && typeof a === 'object')
        .map(a => {
        var _a, _b;
        return ({
            id: String(a.id || ''),
            actionType: a.actionType,
            enabled: Boolean(a.enabled),
            dispatch: {
                channel: 'whatsapp',
                toE164: typeof ((_a = a.dispatch) === null || _a === void 0 ? void 0 : _a.toE164) === 'string' ? a.dispatch.toE164 : undefined,
                template: typeof ((_b = a.dispatch) === null || _b === void 0 ? void 0 : _b.template) === 'string' ? a.dispatch.template : undefined,
            },
            data: a.data && typeof a.data === 'object' ? {
                kind: a.data.kind,
                required: Boolean(a.data.required),
            } : undefined,
            tags: Array.isArray(a.tags) ? a.tags.filter((t) => typeof t === 'string') : undefined,
            notes: typeof a.notes === 'string' ? a.notes : undefined,
        });
    })
        .filter(a => Boolean(a.actionType));
    // Legacy fallback: derive actions from toolType/dispatchTemplate
    if (actions.length === 0 && typeof merve.toolType === 'string') {
        const toolType = merve.toolType;
        const legacyTypes = toolType ? LEGACY_ACTIONS_BY_TOOLTYPE[toolType] : undefined;
        const dispatchTemplate = typeof merve.dispatchTemplate === 'string' ? merve.dispatchTemplate : undefined;
        if (legacyTypes === null || legacyTypes === void 0 ? void 0 : legacyTypes.length) {
            return {
                enabled: true,
                whatsappE164: typeof merve.whatsappE164 === 'string' ? merve.whatsappE164 : undefined,
                geo: merve.geo,
                coverageAreas: Array.isArray(merve.coverageAreas) ? merve.coverageAreas : undefined,
                tags: Array.isArray(merve.tags) ? merve.tags : undefined,
                toolType,
                dispatchTemplate,
                actions: legacyTypes.map((actionType) => ({
                    id: `legacy_${toolType}_${actionType}`,
                    actionType,
                    enabled: true,
                    dispatch: {
                        channel: 'whatsapp',
                        template: dispatchTemplate,
                    },
                })),
            };
        }
    }
    return {
        enabled: true,
        whatsappE164: typeof merve.whatsappE164 === 'string' ? merve.whatsappE164 : undefined,
        geo: merve.geo,
        coverageAreas: Array.isArray(merve.coverageAreas) ? merve.coverageAreas : undefined,
        tags: Array.isArray(merve.tags) ? merve.tags : undefined,
        actionTypesEnabled: Array.isArray(merve.actionTypesEnabled) ? merve.actionTypesEnabled : undefined,
        actions,
    };
}
function listingTitle(listing) {
    return (listing.title || listing.name || '').trim();
}
function matchText(haystack, needle) {
    if (!(needle === null || needle === void 0 ? void 0 : needle.trim()))
        return true;
    return haystack.toLowerCase().includes(needle.toLowerCase());
}
function matchAnyTag(tags, query) {
    if (!(query === null || query === void 0 ? void 0 : query.trim()))
        return true;
    const q = query.toLowerCase();
    return tags.some(t => t.toLowerCase().includes(q));
}
exports.merveListingsRepository = {
    async findById(listingId) {
        const snap = await firebase_1.db.collection('listings').doc(listingId).get();
        if (!snap.exists)
            return null;
        const data = snap.data();
        return Object.assign(Object.assign({ id: snap.id }, data), { merve: normalizeMerve(data === null || data === void 0 ? void 0 : data.merve) });
    },
    async searchByAction(args) {
        const limit = Math.min(Math.max(args.limit || 20, 1), 50);
        // Prefer derived index if present; fallback to broader scan.
        const indexedQuery = firebase_1.db.collection('listings')
            .where('merve.enabled', '==', true)
            .where('merve.actionTypesEnabled', 'array-contains', args.actionType)
            .limit(limit);
        const fallbackQuery = async () => {
            return firebase_1.db.collection('listings')
                .where('merve.enabled', '==', true)
                .limit(200)
                .get();
        };
        let snap;
        try {
            snap = await indexedQuery.get();
            // If the derived index is missing from older docs, this query can return empty.
            // Fall back to a broader scan and filter in memory.
            if (snap.empty) {
                snap = await fallbackQuery();
            }
        }
        catch (_a) {
            snap = await fallbackQuery();
        }
        const results = [];
        for (const docSnap of snap.docs) {
            const raw = docSnap.data();
            const merve = normalizeMerve(raw === null || raw === void 0 ? void 0 : raw.merve);
            if (!(merve === null || merve === void 0 ? void 0 : merve.enabled))
                continue;
            const enabled = merve.actions.some(a => a.enabled && a.actionType === args.actionType);
            if (!enabled)
                continue;
            // Optional: market/city scoping
            if (args.marketId && typeof raw.cityId === 'string' && raw.cityId !== args.marketId) {
                // Keep permissive; only apply if cityId field is present.
            }
            // Optional filters
            if (!matchText(listingTitle(Object.assign({ id: docSnap.id }, raw)), args.name))
                continue;
            const coverage = Array.isArray(merve.coverageAreas) ? merve.coverageAreas : [];
            if (args.area && coverage.length && !matchAnyTag(coverage, args.area))
                continue;
            const tags = [
                ...(Array.isArray(merve.tags) ? merve.tags : []),
                ...(Array.isArray(raw.tags) ? raw.tags : []),
            ];
            if (!matchAnyTag(tags, args.tag))
                continue;
            results.push(Object.assign(Object.assign({ id: docSnap.id }, raw), { merve }));
        }
        return results.slice(0, limit);
    },
    getEnabledAction(merve, actionType) {
        if (!(merve === null || merve === void 0 ? void 0 : merve.enabled))
            return null;
        const action = merve.actions.find(a => a.enabled && a.actionType === actionType) || null;
        return action;
    },
    getWhatsAppTarget(merve, action) {
        var _a, _b, _c;
        const perAction = (_b = (_a = action.dispatch) === null || _a === void 0 ? void 0 : _a.toE164) === null || _b === void 0 ? void 0 : _b.trim();
        if (perAction)
            return perAction;
        const fallback = (_c = merve.whatsappE164) === null || _c === void 0 ? void 0 : _c.trim();
        if (fallback)
            return fallback;
        return null;
    },
};
//# sourceMappingURL=merveListings.repository.js.map