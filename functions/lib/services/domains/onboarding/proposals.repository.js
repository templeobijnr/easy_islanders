"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposalsRepository = void 0;
exports.computeProposalId = computeProposalId;
const firestore_1 = require("firebase-admin/firestore");
const crypto_1 = require("crypto");
const logger = __importStar(require("firebase-functions/logger"));
const db = (0, firestore_1.getFirestore)();
// ============================================
// HELPERS
// ============================================
const getProposalsPath = (businessId) => `businesses/${businessId}/proposals`;
const getCatalogPath = (businessId) => `businesses/${businessId}/catalog`;
/**
 * Generate a deterministic Proposal ID based on messageSid and kind.
 * ID = sha256(messageSid:kind) (hex)
 */
function computeProposalId(messageSid, kind) {
    return (0, crypto_1.createHash)('sha256')
        .update(`${messageSid}:${kind}`)
        .digest('hex');
}
// ============================================
// REPOSITORY
// ============================================
exports.proposalsRepository = {
    /**
     * Create a proposal idempotently.
     * If a proposal with the derived ID already exists, return it.
     */
    createIfAbsent: async (input) => {
        const { businessId, messageSid, kind } = input;
        const proposalId = computeProposalId(messageSid, kind);
        const proposalRef = db.collection(getProposalsPath(businessId)).doc(proposalId);
        const now = firestore_1.Timestamp.now();
        // 1. Try to get existing
        const doc = await proposalRef.get();
        if (doc.exists) {
            return Object.assign({ id: doc.id }, doc.data());
        }
        // 2. Create new
        const proposal = {
            id: proposalId,
            businessId: input.businessId,
            threadId: input.threadId,
            sourceMessageId: input.messageSid,
            createdByActorId: input.actorId,
            kind: input.kind,
            status: 'proposed',
            patch: input.patch,
            summary: input.summary,
            createdAt: now,
        };
        await proposalRef.set(proposal);
        logger.info(`[Proposals] Created proposal ${proposalId} for business ${businessId}`);
        return proposal;
    },
    /**
     * Get a proposal by ID.
     */
    get: async (businessId, proposalId) => {
        const doc = await db.collection(getProposalsPath(businessId)).doc(proposalId).get();
        if (!doc.exists)
            return null;
        return Object.assign({ id: doc.id }, doc.data());
    },
    /**
     * Reject a proposal.
     */
    reject: async (businessId, proposalId) => {
        const ref = db.collection(getProposalsPath(businessId)).doc(proposalId);
        await ref.update({
            status: 'rejected',
            decidedAt: firestore_1.Timestamp.now(),
        });
    },
    /**
     * Approve and apply a proposal transactionally.
     * - Verifies proposal is 'proposed'
     * - Writes to authoritative collections based on kind
     * - Updates proposal to 'applied'
     */
    approveAndApply: async (businessId, proposalId) => {
        const proposalRef = db.collection(getProposalsPath(businessId)).doc(proposalId);
        const businessRef = db.collection('businesses').doc(businessId);
        try {
            await db.runTransaction(async (t) => {
                const proposalDoc = await t.get(proposalRef);
                if (!proposalDoc.exists) {
                    throw new Error('Proposal not found');
                }
                const proposal = proposalDoc.data();
                // Idempotency / Guard
                if (proposal.status === 'applied') {
                    logger.info(`[Proposals] Proposal ${proposalId} already applied`);
                    return; // Success, already done
                }
                if (proposal.status !== 'proposed') {
                    throw new Error(`Cannot apply proposal in status ${proposal.status}`);
                }
                const now = firestore_1.Timestamp.now();
                // Apply Logic based on Kind
                switch (proposal.kind) {
                    case 'business_profile_patch': {
                        // Patch the business document
                        t.set(businessRef, Object.assign(Object.assign({}, proposal.patch), { updatedAt: now }), { merge: true });
                        break;
                    }
                    case 'catalog_upsert': {
                        // Patch one or more catalog items
                        // Expect patch to be { items: CatalogDraftItem[] }
                        const items = proposal.patch.items;
                        if (Array.isArray(items)) {
                            for (const item of items) {
                                // Generate deterministic ID: sha256(normalize(name)|currency|price).slice(0,12)
                                const normName = (item.name || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9\s]/g, '');
                                const currency = item.currency || 'EUR';
                                const price = item.price !== undefined ? String(item.price) : '';
                                const idSource = `${normName}|${currency}|${price}`;
                                const itemId = (0, crypto_1.createHash)('sha256').update(idSource).digest('hex').slice(0, 12);
                                const itemRef = db.collection(getCatalogPath(businessId)).doc(itemId);
                                t.set(itemRef, {
                                    id: itemId,
                                    name: item.name,
                                    price: item.price,
                                    currency: currency,
                                    mediaUrl: item.mediaUrl,
                                    needsReview: item.needsReview || false,
                                    status: 'active',
                                    // Provenance
                                    sourceProposalId: proposal.id,
                                    sourceMessageSid: proposal.sourceMessageId,
                                    createdFrom: 'whatsapp_onboarding',
                                    createdAt: now,
                                    updatedAt: now,
                                }, { merge: true });
                            }
                        }
                        break;
                    }
                    case 'availability_model_set': {
                        // Set availability model on business doc
                        // patch: { availability: { mode: '...', ... } }
                        t.set(businessRef, {
                            availability: proposal.patch.availability,
                            updatedAt: now,
                        }, { merge: true });
                        break;
                    }
                    default:
                        // Unknown kind - do nothing to authoritative state but mark applied? 
                        // Safer to throw.
                        throw new Error(`Unknown proposal kind: ${proposal.kind}`);
                }
                // Update Proposal Status
                t.update(proposalRef, {
                    status: 'applied',
                    appliedAt: now,
                    decidedAt: now,
                });
            });
            // Re-fetch to return latest state
            const updated = await exports.proposalsRepository.get(businessId, proposalId);
            return { success: true, proposal: updated };
        }
        catch (error) {
            logger.error(`[Proposals] Apply failed for ${proposalId}`, error);
            const current = await exports.proposalsRepository.get(businessId, proposalId);
            // If it was actually applied (race condition handled), return success
            if ((current === null || current === void 0 ? void 0 : current.status) === 'applied') {
                return { success: true, proposal: current };
            }
            return { success: false, error: error.message };
        }
    }
};
//# sourceMappingURL=proposals.repository.js.map