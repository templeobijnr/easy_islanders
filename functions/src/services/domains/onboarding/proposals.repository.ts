import { getErrorMessage } from '../../../utils/errors';

import { Timestamp } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import * as logger from 'firebase-functions/logger';
import { Proposal, ProposalKind } from '../../../types/proposals.types';
import { db } from '../../../config/firebase';

// ============================================
// HELPERS
// ============================================

const getProposalsPath = (businessId: string) =>
    `businesses/${businessId}/proposals`;

const getCatalogPath = (businessId: string) =>
    `businesses/${businessId}/catalog`;

/**
 * Generate a deterministic Proposal ID based on messageSid and kind.
 * ID = sha256(messageSid:kind) (hex)
 */
export function computeProposalId(messageSid: string, kind: ProposalKind): string {
    return createHash('sha256')
        .update(`${messageSid}:${kind}`)
        .digest('hex');
}

export type CreateProposalInput = {
    businessId: string;
    threadId: string;
    messageSid: string;
    actorId: string;
    kind: ProposalKind;
    patch: Record<string, any>;
    summary: string;
};

export type ApproveResult = {
    success: boolean;
    error?: string;
    proposal?: Proposal;
};

// ============================================
// REPOSITORY
// ============================================

export const proposalsRepository = {

    /**
     * Create a proposal idempotently.
     * If a proposal with the derived ID already exists, return it.
     */
    createIfAbsent: async (input: CreateProposalInput): Promise<Proposal> => {
        const { businessId, messageSid, kind } = input;
        const proposalId = computeProposalId(messageSid, kind);
        const proposalRef = db.collection(getProposalsPath(businessId)).doc(proposalId);

        const now = Timestamp.now();

        // 1. Try to get existing
        const doc = await proposalRef.get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() } as Proposal;
        }

        // 2. Create new
        const proposal: Proposal = {
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
    get: async (businessId: string, proposalId: string): Promise<Proposal | null> => {
        const doc = await db.collection(getProposalsPath(businessId)).doc(proposalId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Proposal;
    },

    /**
     * Reject a proposal.
     */
    reject: async (businessId: string, proposalId: string): Promise<void> => {
        const ref = db.collection(getProposalsPath(businessId)).doc(proposalId);
        await ref.update({
            status: 'rejected',
            decidedAt: Timestamp.now(),
        });
    },

    /**
     * Approve and apply a proposal transactionally.
     * - Verifies proposal is 'proposed'
     * - Writes to authoritative collections based on kind
     * - Updates proposal to 'applied'
     */
    approveAndApply: async (businessId: string, proposalId: string): Promise<ApproveResult> => {
        const proposalRef = db.collection(getProposalsPath(businessId)).doc(proposalId);
        const businessRef = db.collection('businesses').doc(businessId);

        try {
            await db.runTransaction(async (t) => {
                const proposalDoc = await t.get(proposalRef);
                if (!proposalDoc.exists) {
                    throw new Error('Proposal not found');
                }

                const proposal = proposalDoc.data() as Proposal;

                // Idempotency / Guard
                if (proposal.status === 'applied') {
                    logger.info(`[Proposals] Proposal ${proposalId} already applied`);
                    return; // Success, already done
                }

                if (proposal.status !== 'proposed') {
                    throw new Error(`Cannot apply proposal in status ${proposal.status}`);
                }

                const now = Timestamp.now();

                // Apply Logic based on Kind
                switch (proposal.kind) {
                    case 'business_profile_patch': {
                        // Patch the business document
                        t.set(businessRef, {
                            ...proposal.patch,
                            updatedAt: now,
                        }, { merge: true });
                        break;
                    }

                    case 'catalog_upsert': {
                        // Patch one or more catalog items
                        // Expect patch to be { items: CatalogDraftItem[] }
                        const items = proposal.patch.items as Array<any>;
                        if (Array.isArray(items)) {
                            for (const item of items) {
                                // Generate deterministic ID: sha256(normalize(name)|currency|price).slice(0,12)
                                const normName = (item.name || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z0-9\s]/g, '');
                                const currency = item.currency || 'EUR';
                                const price = item.price !== undefined ? String(item.price) : '';
                                const idSource = `${normName}|${currency}|${price}`;
                                const itemId = createHash('sha256').update(idSource).digest('hex').slice(0, 12);

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
            const updated = await proposalsRepository.get(businessId, proposalId);
            return { success: true, proposal: updated! };

        } catch (error: unknown) {
            logger.error(`[Proposals] Apply failed for ${proposalId}`, error);
            const current = await proposalsRepository.get(businessId, proposalId);

            // If it was actually applied (race condition handled), return success
            if (current?.status === 'applied') {
                return { success: true, proposal: current };
            }

            return { success: false, error: getErrorMessage(error) };
        }
    }
};
