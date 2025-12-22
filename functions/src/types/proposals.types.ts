
import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// PROPOSAL TYPES
// ============================================

export type ProposalKind =
    | 'business_profile_patch'
    | 'catalog_upsert'
    | 'availability_model_set';

export type ProposalStatus = 'proposed' | 'rejected' | 'applied';

/**
 * Proposal document: businesses/{businessId}/proposals/{proposalId}
 * 
 * Represents a structured change request that must be approved by the business owner.
 */
export interface Proposal {
    id: string;
    businessId: string;
    threadId: string;

    // Idempotency & Tracing
    sourceMessageId: string;     // inbound messageSid
    createdByActorId: string;

    kind: ProposalKind;
    status: ProposalStatus;

    // The actual change
    patch: Record<string, any>;

    // Human readable description for the chat
    summary: string;

    createdAt: Timestamp;
    decidedAt?: Timestamp;
    appliedAt?: Timestamp;
}
