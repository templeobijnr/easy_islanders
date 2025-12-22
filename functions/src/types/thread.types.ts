/**
 * Thread Types
 * 
 * Canonical conversation model for all channels (App, WhatsApp, Discover).
 * Threads are the durable "conversation spine" that replaces per-controller sessions.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// THREAD TYPES
// ============================================

export type ThreadType = 'general' | 'business_public' | 'business_ops' | 'dispatch';
export type ChannelType = 'app' | 'web' | 'whatsapp';
export type ThreadStatus = 'active' | 'closed';
export type ThreadState = 'idle' | 'awaiting_confirmation' | 'executing';

export interface PendingAction {
    kind: 'confirm_transaction' | 'ops_proposal' | 'dispatch_accept';
    refId: string;              // txId / proposalId / rideId
    expiresAt: Timestamp;
    summary: string;
}

/**
 * Thread document: threads/{threadId}
 * 
 * The canonical conversation container that all channels attach to.
 */
export interface Thread {
    id: string;
    threadType: ThreadType;

    actorId: string;            // who the thread belongs to
    businessId?: string;        // required for business_public/business_ops/dispatch

    channels: ChannelType[];    // channels seen on this thread
    status: ThreadStatus;
    state: ThreadState;

    onboardingState?: ThreadOnboardingState;
    pendingAction?: PendingAction;

    lastMessageAt: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// ONBOARDING TYPES
// ============================================

export type OnboardingStep =
    | 'profile_required'
    | 'catalog_required'
    | 'availability_required'
    | 'review_and_publish'
    | 'live_ops';

/**
 * Draft catalog item stored in subcollection:
 * threads/{threadId}/draftCatalog/{tempId}
 */
export interface CatalogDraftItem {
    tempId: string;
    name: string;
    price?: number;
    currency?: string;
    mediaUrl?: string;
    needsReview?: boolean;
    sourceMessageId: string;
    createdAt: Timestamp;
}

export interface ThreadOnboardingState {
    step: OnboardingStep;
    businessId?: string;          // set once created/linked
    pendingProposalId?: string;   // proposal currently awaiting YES/NO
    lastAppliedProposalId?: string;
    draftCatalogCount?: number;   // count of items in subcollection (lightweight pointer)
    lastDraftUpdatedAt?: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// MESSAGE TYPES
// ============================================

export type MessageDirection = 'inbound' | 'outbound';
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * ThreadMessage document: threads/{threadId}/messages/{messageId}
 * 
 * Immutable message log entry.
 */
export interface ThreadMessage {
    id: string;
    threadId: string;

    direction: MessageDirection;
    role: MessageRole;

    actorId: string;                // who sent it
    channel: ChannelType;
    channelMessageId?: string;      // Twilio MessageSid or app message id (for idempotency)

    text?: string;
    mediaUrls?: string[];

    // Linking to execution truth
    linkedTxId?: string;
    linkedEventId?: string;

    createdAt: Timestamp;
}

// ============================================
// INPUT TYPES
// ============================================

export interface CreateThreadInput {
    threadType: ThreadType;
    actorId: string;
    businessId?: string;
    channel: ChannelType;
}

export interface AppendMessageInput {
    threadId: string;
    direction: MessageDirection;
    role: MessageRole;
    actorId: string;
    channel: ChannelType;
    channelMessageId?: string;
    text?: string;
    mediaUrls?: string[];
    location?: {
        lat: number;
        lng: number;
        address?: string;
        name?: string;
    };
    metadata?: Record<string, any>;
    linkedTxId?: string;
    linkedEventId?: string;
}

export interface UpdateThreadStateInput {
    state?: ThreadState;
    pendingAction?: PendingAction | null;
    onboardingState?: ThreadOnboardingState;
    lastMessageAt?: Timestamp;
    status?: ThreadStatus;
}
