"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.opsService = void 0;
const proposals_repository_1 = require("./proposals.repository");
const thread_repository_1 = require("../conversations/thread.repository");
const catalog_parser_1 = require("./catalog.parser");
const draftCatalog_repository_1 = require("./draftCatalog.repository");
const firestore_1 = require("firebase-admin/firestore");
// ============================================
// INTENT MATCHERS
// ============================================
function isYes(text) {
    const data = text.toLowerCase().trim();
    return ['yes', 'y', 'confirm', 'ok', 'okay', 'sure'].some(w => data === w || data.startsWith(w + ' '));
}
function isNo(text) {
    const data = text.toLowerCase().trim();
    return ['no', 'n', 'cancel', 'reject'].some(w => data === w || data.startsWith(w + ' '));
}
function isDone(text) {
    const data = text.toLowerCase().trim();
    const exactMatches = ['done', 'finish', 'finished', 'thats all', "that's all", 'no more', 'all set', 'ok done', 'okay done'];
    return exactMatches.some(w => data === w || data.startsWith(w));
}
function isSkip(text) {
    const data = text.toLowerCase().trim();
    return ['skip', 'skip this', 'no catalog', 'no items'].some(w => data === w || data.startsWith(w));
}
// ============================================
// CONSTANTS
// ============================================
const MAX_DRAFT_ITEMS = 50;
// ============================================
// OPS SERVICE
// ============================================
exports.opsService = {
    /**
     * Process message for a business ops thread.
     * Operates as a Finite State Machine rooted in thread.onboardingState.
     */
    processOpsMessage: async (thread, message) => {
        // 1. Initialize State if missing
        let state = thread.onboardingState;
        if (!state) {
            state = {
                step: 'profile_required',
                updatedAt: message.createdAt,
            };
            // Persist init
            await (0, thread_repository_1.updateThreadState)(thread.id, { onboardingState: state });
        }
        const businessId = state.businessId || thread.businessId;
        const actorId = thread.actorId;
        const messageSid = message.id;
        // 2. Handle Pending Proposal
        if (state.pendingProposalId) {
            if (isYes(message.text || '')) {
                // Confirm
                const result = await proposals_repository_1.proposalsRepository.approveAndApply(businessId, state.pendingProposalId);
                if (result.success) {
                    const newState = Object.assign({}, state);
                    // FSM Transitions on Success
                    if (state.step === 'profile_required')
                        newState.step = 'catalog_required';
                    else if (state.step === 'catalog_required') {
                        newState.step = 'availability_required';
                        // Clear draft count after catalog apply
                        newState.draftCatalogCount = undefined;
                        newState.lastDraftUpdatedAt = undefined;
                    }
                    else if (state.step === 'availability_required')
                        newState.step = 'review_and_publish';
                    else if (state.step === 'review_and_publish')
                        newState.step = 'live_ops';
                    newState.pendingProposalId = undefined;
                    newState.lastAppliedProposalId = state.pendingProposalId;
                    await (0, thread_repository_1.updateThreadState)(thread.id, { onboardingState: newState });
                    // Clear draft catalog after successful apply
                    if (state.step === 'catalog_required') {
                        await draftCatalog_repository_1.draftCatalogRepository.clearAll(thread.id);
                    }
                    return `✅ Approved! Moving to next step: ${newState.step.replace(/_/g, ' ')}.`;
                }
                else {
                    return `❌ Failed to apply: ${result.error}`;
                }
            }
            else if (isNo(message.text || '')) {
                // Reject
                await proposals_repository_1.proposalsRepository.reject(businessId, state.pendingProposalId);
                await (0, thread_repository_1.updateThreadState)(thread.id, {
                    onboardingState: Object.assign(Object.assign({}, state), { pendingProposalId: undefined })
                });
                // Preserve draft for catalog step so user can edit and re-send DONE
                return "❌ Rejected. Let's try again. What should we change?";
            }
            else {
                return "Please reply YES to confirm or NO to reject/edit.";
            }
        }
        // 3. FSM Switch
        switch (state.step) {
            case 'profile_required': {
                if (!message.text)
                    return "Please send your business name.";
                const patch = { name: message.text, tier: 'prospect' };
                const kind = 'business_profile_patch';
                return await createAndPropose({
                    businessId, threadId: thread.id, messageSid, actorId, kind, patch,
                    summary: `Set business name to: ${message.text}`,
                    threadState: state
                });
            }
            case 'catalog_required': {
                const text = (message.text || '').trim();
                const currentCount = state.draftCatalogCount || 0;
                // Check for DONE intent
                if (isDone(text)) {
                    if (currentCount === 0) {
                        return "You haven't added any items yet. Send item names and prices (e.g., 'Burger €12'), or say SKIP.";
                    }
                    // Fetch all draft items and create batch proposal
                    const draftItems = await draftCatalog_repository_1.draftCatalogRepository.getAll(thread.id);
                    const kind = 'catalog_upsert';
                    const patch = { items: draftItems };
                    const summary = `Add ${draftItems.length} items:\n${draftItems.map(i => `• ${i.name} ${i.currency || '€'}${i.price || '?'}`).join('\n')}`;
                    return await createAndPropose({
                        businessId, threadId: thread.id, messageSid, actorId, kind, patch,
                        summary,
                        threadState: state
                    });
                }
                // Check for SKIP intent
                if (isSkip(text)) {
                    // Clear any drafts and advance
                    await draftCatalog_repository_1.draftCatalogRepository.clearAll(thread.id);
                    const newState = Object.assign(Object.assign({}, state), { step: 'availability_required', draftCatalogCount: undefined, lastDraftUpdatedAt: undefined, updatedAt: firestore_1.Timestamp.now() });
                    await (0, thread_repository_1.updateThreadState)(thread.id, { onboardingState: newState });
                    return "Skipping catalog. You can add items later.\n\nNow let's set availability. Reply OK to use 'Request Based' mode.";
                }
                // Check max capacity
                if (currentCount >= MAX_DRAFT_ITEMS) {
                    return `You've reached the maximum of ${MAX_DRAFT_ITEMS} items. Say DONE to confirm or SKIP to move on.`;
                }
                // Parse items from text
                const parsed = (0, catalog_parser_1.parseItemsFromText)(text);
                // Handle media (stub for now)
                const mediaItems = (message.mediaUrls || []).map(url => ({
                    name: 'Menu Photo',
                    mediaUrl: url,
                    needsReview: true,
                    sourceMessageId: messageSid,
                }));
                const allNewItems = [
                    ...parsed.map(p => ({
                        name: p.name,
                        price: p.price,
                        currency: p.currency,
                        sourceMessageId: messageSid,
                    })),
                    ...mediaItems,
                ];
                if (allNewItems.length === 0) {
                    return "I couldn't parse any items. Try:\n• `Burger €12`\n• `Pizza 15 EUR`\n• Or send a photo of your menu.";
                }
                // Add to subcollection
                const newCount = await draftCatalog_repository_1.draftCatalogRepository.addItems(thread.id, allNewItems);
                // Update thread pointer
                await (0, thread_repository_1.updateThreadState)(thread.id, {
                    onboardingState: Object.assign(Object.assign({}, state), { draftCatalogCount: Math.min(newCount, MAX_DRAFT_ITEMS), lastDraftUpdatedAt: firestore_1.Timestamp.now() })
                });
                const itemsDesc = allNewItems.map(i => 'mediaUrl' in i ? '📷 Menu photo' : `${i.name} ${i.currency}${i.price}`).join(', ');
                return `Added: ${itemsDesc}\nTotal: ${newCount} item(s).\n\nSend more or say DONE to confirm.`;
            }
            case 'availability_required': {
                const text = (message.text || '').toLowerCase().trim();
                // Check for mode selection
                let mode = null;
                if (text.includes('always') || text.includes('open') || text === '1') {
                    mode = 'always_open';
                }
                else if (text.includes('request') || text.includes('confirm') || text === '2') {
                    mode = 'request_based';
                }
                else if (text.includes('schedule') || text.includes('hours') || text === '3') {
                    mode = 'scheduled';
                }
                if (!mode) {
                    // Present options
                    return `How should I handle bookings?\n\n1️⃣ **Always Open** — Auto-confirm all requests\n2️⃣ **Request Based** — I'll ask you before confirming\n3️⃣ **Scheduled** — Set specific hours (coming soon)\n\nReply 1, 2, or 3.`;
                }
                const modeDescriptions = {
                    'always_open': 'Always Open (auto-confirm)',
                    'request_based': 'Request Based (manual approval)',
                    'scheduled': 'Scheduled Hours (coming soon)',
                };
                const kind = 'availability_model_set';
                const patch = { availability: { mode } };
                return await createAndPropose({
                    businessId, threadId: thread.id, messageSid, actorId, kind, patch,
                    summary: `Set availability mode to: ${modeDescriptions[mode]}`,
                    threadState: state
                });
            }
            case 'review_and_publish': {
                // Build summary from business doc (if needed, could fetch here)
                // For now, show a simple confirmation prompt
                const kind = 'business_profile_patch';
                const patch = { status: 'active' };
                const summary = [
                    '🏪 **Ready to Go Live?**',
                    '',
                    'Your business is set up and ready for customers.',
                    '',
                    '✅ Profile configured',
                    '✅ Catalog added',
                    '✅ Availability set',
                    '',
                    'Reply **YES** to activate your listing.',
                ].join('\n');
                return await createAndPropose({
                    businessId, threadId: thread.id, messageSid, actorId, kind, patch,
                    summary,
                    threadState: state
                });
            }
            case 'live_ops': {
                return "You are live! Send updates here to change price/stock.";
            }
            default:
                return "Unknown state.";
        }
    }
};
async function createAndPropose(params) {
    const { threadState } = params, input = __rest(params, ["threadState"]);
    // Create Proposal
    const proposal = await proposals_repository_1.proposalsRepository.createIfAbsent(input);
    // Update Thread Pointer
    if (threadState.pendingProposalId !== proposal.id) {
        await (0, thread_repository_1.updateThreadState)(input.threadId, {
            onboardingState: Object.assign(Object.assign({}, threadState), { pendingProposalId: proposal.id })
        });
    }
    return `📋 **Proposal:**\n${input.summary}\n\nReply **YES** to apply.`;
}
//# sourceMappingURL=ops.service.js.map