/**
 * Job Schema for AskMerve V1
 * 
 * A Job represents a user request for action (order, booking, inquiry, etc.)
 * that goes through a lifecycle: collecting → confirming → dispatched → confirmed/cancelled
 */

import { z } from 'zod';
import { ActionDataSchema, ActionTypeSchema } from './action.schema';

// =============================================================================
// JOB STATUS & STATE MACHINE
// =============================================================================

/**
 * Job status values in lifecycle order.
 * 
 * State Machine:
 * ```
 * collecting ──► confirming ──► dispatched ──► confirmed
 *     │              │              │              │
 *     └─► cancelled ◄┴──────────────┴──► cancelled
 * ```
 */
export const JobStatusSchema = z.enum([
    'collecting',  // User is providing details, job not yet ready
    'confirming',  // User confirmed, awaiting merchant
    'dispatched',  // Sent to merchant (WhatsApp/webview)
    'confirmed',   // Merchant accepted
    'cancelled',   // User or merchant cancelled
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

/**
 * Valid state transitions.
 * Key = current status, Value = allowed next statuses
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
    collecting: ['confirming', 'cancelled'],
    confirming: ['dispatched', 'cancelled'],
    dispatched: ['confirmed', 'cancelled'],
    confirmed: ['cancelled'], // Only cancellation after confirmation (policy)
    cancelled: [], // Terminal state
};

/**
 * Validates if a status transition is allowed.
 */
export function isValidJobTransition(from: JobStatus, to: JobStatus): boolean {
    return JOB_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// =============================================================================
// MERCHANT TARGET
// =============================================================================

/**
 * Listed merchant target - references an existing listing in the catalog.
 * Merchant will receive job via `/m` webview.
 */
export const ListedMerchantTargetSchema = z.object({
    type: z.literal('listing'),
    /** Reference to listings/{listingId} */
    listingId: z.string().min(1),
});

export type ListedMerchantTarget = z.infer<typeof ListedMerchantTargetSchema>;

/**
 * Unlisted merchant target - direct WhatsApp dispatch.
 * Used for merchants not in the catalog.
 */
export const UnlistedMerchantTargetSchema = z.object({
    type: z.literal('unlisted'),
    /** Merchant name (optional) */
    name: z.string().optional(),
    /** WhatsApp phone number in E.164 format - REQUIRED */
    phone: z.string().regex(/^\+\d{10,15}$/, 'Phone must be E.164 format'),
    /** Additional notes about the merchant */
    notes: z.string().optional(),
});

export type UnlistedMerchantTarget = z.infer<typeof UnlistedMerchantTargetSchema>;

/**
 * Merchant target union.
 * 
 * - `listing`: Merchant uses `/m` webview for accept/decline
 * - `unlisted`: Merchant receives WhatsApp and replies YES/NO
 */
export const MerchantTargetSchema = z.discriminatedUnion('type', [
    ListedMerchantTargetSchema,
    UnlistedMerchantTargetSchema,
]);

export type MerchantTarget = z.infer<typeof MerchantTargetSchema>;

// =============================================================================
// MESSAGE SOURCE
// =============================================================================

/**
 * Source of a message in a conversation.
 */
export const MessageSourceSchema = z.enum([
    'user',      // End user (customer)
    'assistant', // AI agent response
    'system',    // System-generated (status updates, confirmations)
    'tool',      // Tool execution result
]);

export type MessageSource = z.infer<typeof MessageSourceSchema>;

// =============================================================================
// JOB SCHEMA
// =============================================================================

/**
 * Base job fields (always present)
 */
const JobBaseSchema = z.object({
    /** Firestore document ID */
    id: z.string().min(1),

    /** Owner user (Firebase Auth UID) - REQUIRED */
    ownerUserId: z.string().min(1),

    /** Reference to conversation where job was created */
    conversationId: z.string().optional(),

    /** Action type - determines actionData shape */
    actionType: ActionTypeSchema,

    /** Action-specific data (validated based on actionType) */
    actionData: ActionDataSchema,

    /** Merchant to dispatch to (optional until dispatch) */
    merchantTarget: MerchantTargetSchema.optional(),

    /** Current job status */
    status: JobStatusSchema,

    /** Short code for user reference (e.g., "ABC123") */
    jobCode: z.string().optional(),

    /** User's preferred language for communications */
    language: z.enum(['en', 'tr', 'ru']).default('en'),

    // === Timestamps (server-set only) ===

    /** When job was created */
    createdAt: z.string(), // ISO 8601

    /** Last update */
    updatedAt: z.string(), // ISO 8601

    /** When user confirmed (collecting → confirming) */
    confirmedByUserAt: z.string().optional(),

    /** When dispatched to merchant */
    dispatchedAt: z.string().optional(),

    /** When merchant confirmed */
    confirmedByMerchantAt: z.string().optional(),

    /** When cancelled */
    cancelledAt: z.string().optional(),

    /** Who cancelled (user, merchant, system) */
    cancelledBy: z.enum(['user', 'merchant', 'system']).optional(),

    /** Cancellation reason */
    cancellationReason: z.string().optional(),

    // === Dispatch tracking ===

    /** WhatsApp message ID for dispatch (idempotency) */
    dispatchMessageId: z.string().optional(),

    /** Number of dispatch attempts */
    dispatchAttempts: z.number().int().nonnegative().default(0),
});

/**
 * Full Job schema with dispatch validation.
 * 
 * RULE: Jobs in `dispatched` or later status MUST have `merchantTarget`.
 */
export const JobSchema = JobBaseSchema.refine(
    (job) => {
        const requiresTarget: JobStatus[] = ['dispatched', 'confirmed'];
        if (requiresTarget.includes(job.status)) {
            return job.merchantTarget !== undefined;
        }
        return true;
    },
    {
        message: 'Jobs in dispatched or confirmed status must have merchantTarget',
        path: ['merchantTarget'],
    }
);

export type Job = z.infer<typeof JobSchema>;

/**
 * Schema for creating a new job (subset of fields).
 * Server sets: id, status, timestamps, jobCode
 */
export const CreateJobInputSchema = z.object({
    ownerUserId: z.string().min(1),
    conversationId: z.string().optional(),
    actionType: ActionTypeSchema,
    actionData: ActionDataSchema,
    merchantTarget: MerchantTargetSchema.optional(),
    language: z.enum(['en', 'tr', 'ru']).optional(),
});

export type CreateJobInput = z.infer<typeof CreateJobInputSchema>;

// =============================================================================
// JOB VALIDATION HELPERS
// =============================================================================

/**
 * Validates that a job is ready for dispatch.
 * Returns error message or null if valid.
 */
export function validateJobForDispatch(job: Job): string | null {
    if (job.status !== 'confirming') {
        return `Job must be in 'confirming' status to dispatch. Current: ${job.status}`;
    }
    if (!job.merchantTarget) {
        return 'Job must have merchantTarget before dispatch';
    }
    return null;
}

/**
 * Generates a short job code for user reference.
 * Format: 6 alphanumeric characters (e.g., "ABC123")
 */
export function generateJobCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusable chars (I/1, O/0)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
