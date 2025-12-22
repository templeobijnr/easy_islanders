/**
 * Thread ID Service
 * 
 * Computes deterministic thread IDs so that:
 * - Same actor + channel combination always resolves to same thread
 * - WhatsApp/App/Discover all land in the same thread when intended
 * - No duplicates, no race conditions
 */

import * as crypto from 'crypto';
import { ThreadType } from '../../../types/thread.types';

// ============================================
// THREAD ID COMPUTATION
// ============================================

/**
 * Thread ID prefixes for human readability in Firestore console.
 */
const THREAD_PREFIXES: Record<ThreadType, string> = {
    general: 'gen',
    business_public: 'bpub',
    business_ops: 'bops',
    dispatch: 'disp',
};

/**
 * Compute a deterministic thread ID.
 * 
 * Rules:
 * - General thread: hash("general:" + actorId)
 * - Business public (consumer ↔ business): hash("bizpub:" + businessId + ":" + actorId)
 * - Business ops (staff ↔ business): hash("bizops:" + businessId + ":" + actorId)
 * - Dispatch (driver ↔ fleet): hash("dispatch:" + (businessId ?? "global") + ":" + actorId)
 * 
 * @returns A stable, collision-resistant thread ID like "gen_a1b2c3d4"
 */
export function computeThreadId(params: {
    threadType: ThreadType;
    actorId: string;
    businessId?: string;
}): string {
    const { threadType, actorId, businessId } = params;

    // Validate required businessId for certain thread types
    if (threadType === 'business_public' || threadType === 'business_ops') {
        if (!businessId) {
            throw new Error(`businessId is required for threadType '${threadType}'`);
        }
    }

    // Build the canonical key for hashing
    let key: string;
    switch (threadType) {
        case 'general':
            key = `general:${actorId}`;
            break;
        case 'business_public':
            key = `bizpub:${businessId}:${actorId}`;
            break;
        case 'business_ops':
            key = `bizops:${businessId}:${actorId}`;
            break;
        case 'dispatch':
            key = `dispatch:${businessId ?? 'global'}:${actorId}`;
            break;
        default:
            throw new Error(`Unknown threadType: ${threadType}`);
    }

    // Create a short, stable hash
    const hash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
    const prefix = THREAD_PREFIXES[threadType];

    return `${prefix}_${hash}`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a unique message ID.
 * This is NOT deterministic - each call produces a new ID.
 */
export function generateMessageId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `msg_${timestamp}_${random}`;
}
