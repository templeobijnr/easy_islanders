import { ActionType, ListingDoc, MerveAction, MerveIntegration } from '../types/merve';
import { db } from '../config/firebase';

const LEGACY_ACTIONS_BY_TOOLTYPE: Record<NonNullable<MerveIntegration['toolType']>, ActionType[]> = {
    restaurant: ['order_food', 'reserve_table', 'inquire'],
    provider: ['book_service', 'request_service', 'inquire'],
    activity: ['book_activity', 'inquire'],
    stay: ['book_stay', 'inquire'],
};

function normalizeMerve(merve: any): MerveIntegration | null {
    if (!merve || typeof merve !== 'object') return null;
    const enabled = Boolean(merve.enabled);
    if (!enabled) return { enabled: false, actions: [] };

    const actionsRaw: any[] = Array.isArray(merve.actions) ? merve.actions : [];
    const actions: MerveAction[] = actionsRaw
        .filter(a => a && typeof a === 'object')
        .map(a => ({
            id: String(a.id || ''),
            actionType: a.actionType as ActionType,
            enabled: Boolean(a.enabled),
            dispatch: {
                channel: 'whatsapp' as const,
                toE164: typeof a.dispatch?.toE164 === 'string' ? a.dispatch.toE164 : undefined,
                template: typeof a.dispatch?.template === 'string' ? a.dispatch.template : undefined,
            },
            data: a.data && typeof a.data === 'object' ? {
                kind: a.data.kind,
                required: Boolean(a.data.required),
            } : undefined,
            tags: Array.isArray(a.tags) ? a.tags.filter((t: any) => typeof t === 'string') : undefined,
            notes: typeof a.notes === 'string' ? a.notes : undefined,
        }))
        .filter(a => Boolean(a.actionType));

    // Legacy fallback: derive actions from toolType/dispatchTemplate
    if (actions.length === 0 && typeof merve.toolType === 'string') {
        const toolType = merve.toolType as MerveIntegration['toolType'];
        const legacyTypes = toolType ? LEGACY_ACTIONS_BY_TOOLTYPE[toolType] : undefined;
        const dispatchTemplate = typeof merve.dispatchTemplate === 'string' ? merve.dispatchTemplate : undefined;
        if (legacyTypes?.length) {
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
                        channel: 'whatsapp' as const,
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

function listingTitle(listing: ListingDoc): string {
    return (listing.title || listing.name || '').trim();
}

function matchText(haystack: string, needle?: string): boolean {
    if (!needle?.trim()) return true;
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchAnyTag(tags: string[], query?: string): boolean {
    if (!query?.trim()) return true;
    const q = query.toLowerCase();
    return tags.some(t => t.toLowerCase().includes(q));
}

export const merveListingsRepository = {
    async findById(listingId: string): Promise<(ListingDoc & { merve?: MerveIntegration | null }) | null> {
        const snap = await db.collection('listings').doc(listingId).get();
        if (!snap.exists) return null;
        const data = snap.data() as any;
        return {
            id: snap.id,
            ...data,
            merve: normalizeMerve(data?.merve),
        } as any;
    },

    async searchByAction(args: {
        actionType: ActionType;
        name?: string;
        area?: string;
        tag?: string;
        marketId?: string;
        limit?: number;
    }): Promise<Array<ListingDoc & { merve: MerveIntegration }>> {
        const limit = Math.min(Math.max(args.limit || 20, 1), 50);

        // Prefer derived index if present; fallback to broader scan.
        const indexedQuery: FirebaseFirestore.Query = db.collection('listings')
            .where('merve.enabled', '==', true)
            .where('merve.actionTypesEnabled', 'array-contains', args.actionType)
            .limit(limit);

        const fallbackQuery = async () => {
            return db.collection('listings')
                .where('merve.enabled', '==', true)
                .limit(200)
                .get();
        };

        let snap: FirebaseFirestore.QuerySnapshot;
        try {
            snap = await indexedQuery.get();
            // If the derived index is missing from older docs, this query can return empty.
            // Fall back to a broader scan and filter in memory.
            if (snap.empty) {
                snap = await fallbackQuery();
            }
        } catch {
            snap = await fallbackQuery();
        }

        const results: Array<ListingDoc & { merve: MerveIntegration }> = [];

        for (const docSnap of snap.docs) {
            const raw = docSnap.data() as any;
            const merve = normalizeMerve(raw?.merve);
            if (!merve?.enabled) continue;

            const enabled = merve.actions.some(a => a.enabled && a.actionType === args.actionType);
            if (!enabled) continue;

            // Optional: market/city scoping
            if (args.marketId && typeof raw.cityId === 'string' && raw.cityId !== args.marketId) {
                // Keep permissive; only apply if cityId field is present.
            }

            // Optional filters
            if (!matchText(listingTitle({ id: docSnap.id, ...raw }), args.name)) continue;

            const coverage = Array.isArray(merve.coverageAreas) ? merve.coverageAreas : [];
            if (args.area && coverage.length && !matchAnyTag(coverage, args.area)) continue;

            const tags = [
                ...(Array.isArray(merve.tags) ? merve.tags : []),
                ...(Array.isArray(raw.tags) ? raw.tags : []),
            ];
            if (!matchAnyTag(tags, args.tag)) continue;

            results.push({
                id: docSnap.id,
                ...raw,
                merve,
            });
        }

        return results.slice(0, limit);
    },

    getEnabledAction(merve: MerveIntegration | null | undefined, actionType: ActionType): MerveAction | null {
        if (!merve?.enabled) return null;
        const action = merve.actions.find(a => a.enabled && a.actionType === actionType) || null;
        return action;
    },

    getWhatsAppTarget(merve: MerveIntegration, action: MerveAction): string | null {
        const perAction = action.dispatch?.toE164?.trim();
        if (perAction) return perAction;
        const fallback = merve.whatsappE164?.trim();
        if (fallback) return fallback;
        return null;
    },
};
