"use strict";
/**
 * Job Schema for AskMerve V1
 *
 * A Job represents a user request for action (order, booking, inquiry, etc.)
 * that goes through a lifecycle: collecting → confirming → dispatched → confirmed/cancelled
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateJobInputSchema = exports.JobSchema = exports.MessageSourceSchema = exports.MerchantTargetSchema = exports.UnlistedMerchantTargetSchema = exports.ListedMerchantTargetSchema = exports.JOB_STATUS_TRANSITIONS = exports.JobStatusSchema = void 0;
exports.isValidJobTransition = isValidJobTransition;
exports.validateJobForDispatch = validateJobForDispatch;
exports.generateJobCode = generateJobCode;
const zod_1 = require("zod");
const action_schema_1 = require("./action.schema");
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
exports.JobStatusSchema = zod_1.z.enum([
    'collecting', // User is providing details, job not yet ready
    'confirming', // User confirmed, awaiting merchant
    'dispatched', // Sent to merchant (WhatsApp/webview)
    'confirmed', // Merchant accepted
    'cancelled', // User or merchant cancelled
]);
/**
 * Valid state transitions.
 * Key = current status, Value = allowed next statuses
 */
exports.JOB_STATUS_TRANSITIONS = {
    collecting: ['confirming', 'cancelled'],
    confirming: ['dispatched', 'cancelled'],
    dispatched: ['confirmed', 'cancelled'],
    confirmed: ['cancelled'], // Only cancellation after confirmation (policy)
    cancelled: [], // Terminal state
};
/**
 * Validates if a status transition is allowed.
 */
function isValidJobTransition(from, to) {
    var _a, _b;
    return (_b = (_a = exports.JOB_STATUS_TRANSITIONS[from]) === null || _a === void 0 ? void 0 : _a.includes(to)) !== null && _b !== void 0 ? _b : false;
}
// =============================================================================
// MERCHANT TARGET
// =============================================================================
/**
 * Listed merchant target - references an existing listing in the catalog.
 * Merchant will receive job via `/m` webview.
 */
exports.ListedMerchantTargetSchema = zod_1.z.object({
    type: zod_1.z.literal('listing'),
    /** Reference to listings/{listingId} */
    listingId: zod_1.z.string().min(1),
});
/**
 * Unlisted merchant target - direct WhatsApp dispatch.
 * Used for merchants not in the catalog.
 */
exports.UnlistedMerchantTargetSchema = zod_1.z.object({
    type: zod_1.z.literal('unlisted'),
    /** Merchant name (optional) */
    name: zod_1.z.string().optional(),
    /** WhatsApp phone number in E.164 format - REQUIRED */
    phone: zod_1.z.string().regex(/^\+\d{10,15}$/, 'Phone must be E.164 format'),
    /** Additional notes about the merchant */
    notes: zod_1.z.string().optional(),
});
/**
 * Merchant target union.
 *
 * - `listing`: Merchant uses `/m` webview for accept/decline
 * - `unlisted`: Merchant receives WhatsApp and replies YES/NO
 */
exports.MerchantTargetSchema = zod_1.z.discriminatedUnion('type', [
    exports.ListedMerchantTargetSchema,
    exports.UnlistedMerchantTargetSchema,
]);
// =============================================================================
// MESSAGE SOURCE
// =============================================================================
/**
 * Source of a message in a conversation.
 */
exports.MessageSourceSchema = zod_1.z.enum([
    'user', // End user (customer)
    'assistant', // AI agent response
    'system', // System-generated (status updates, confirmations)
    'tool', // Tool execution result
]);
// =============================================================================
// JOB SCHEMA
// =============================================================================
/**
 * Base job fields (always present)
 */
const JobBaseSchema = zod_1.z.object({
    /** Firestore document ID */
    id: zod_1.z.string().min(1),
    /** Owner user (Firebase Auth UID) - REQUIRED */
    ownerUserId: zod_1.z.string().min(1),
    /** Reference to conversation where job was created */
    conversationId: zod_1.z.string().optional(),
    /** Action type - determines actionData shape */
    actionType: action_schema_1.ActionTypeSchema,
    /** Action-specific data (validated based on actionType) */
    actionData: action_schema_1.ActionDataSchema,
    /** Merchant to dispatch to (optional until dispatch) */
    merchantTarget: exports.MerchantTargetSchema.optional(),
    /** Current job status */
    status: exports.JobStatusSchema,
    /** Short code for user reference (e.g., "ABC123") */
    jobCode: zod_1.z.string().optional(),
    /** User's preferred language for communications */
    language: zod_1.z.enum(['en', 'tr', 'ru']).default('en'),
    // === Timestamps (server-set only) ===
    /** When job was created */
    createdAt: zod_1.z.string(), // ISO 8601
    /** Last update */
    updatedAt: zod_1.z.string(), // ISO 8601
    /** When user confirmed (collecting → confirming) */
    confirmedByUserAt: zod_1.z.string().optional(),
    /** When dispatched to merchant */
    dispatchedAt: zod_1.z.string().optional(),
    /** When merchant confirmed */
    confirmedByMerchantAt: zod_1.z.string().optional(),
    /** When cancelled */
    cancelledAt: zod_1.z.string().optional(),
    /** Who cancelled (user, merchant, system) */
    cancelledBy: zod_1.z.enum(['user', 'merchant', 'system']).optional(),
    /** Cancellation reason */
    cancellationReason: zod_1.z.string().optional(),
    // === Dispatch tracking ===
    /** WhatsApp message ID for dispatch (idempotency) */
    dispatchMessageId: zod_1.z.string().optional(),
    /** Number of dispatch attempts */
    dispatchAttempts: zod_1.z.number().int().nonnegative().default(0),
});
/**
 * Full Job schema with dispatch validation.
 *
 * RULE: Jobs in `dispatched` or later status MUST have `merchantTarget`.
 */
exports.JobSchema = JobBaseSchema.refine((job) => {
    const requiresTarget = ['dispatched', 'confirmed'];
    if (requiresTarget.includes(job.status)) {
        return job.merchantTarget !== undefined;
    }
    return true;
}, {
    message: 'Jobs in dispatched or confirmed status must have merchantTarget',
    path: ['merchantTarget'],
});
/**
 * Schema for creating a new job (subset of fields).
 * Server sets: id, status, timestamps, jobCode
 */
exports.CreateJobInputSchema = zod_1.z.object({
    ownerUserId: zod_1.z.string().min(1),
    conversationId: zod_1.z.string().optional(),
    actionType: action_schema_1.ActionTypeSchema,
    actionData: action_schema_1.ActionDataSchema,
    merchantTarget: exports.MerchantTargetSchema.optional(),
    language: zod_1.z.enum(['en', 'tr', 'ru']).optional(),
});
// =============================================================================
// JOB VALIDATION HELPERS
// =============================================================================
/**
 * Validates that a job is ready for dispatch.
 * Returns error message or null if valid.
 */
function validateJobForDispatch(job) {
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
function generateJobCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusable chars (I/1, O/0)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
//# sourceMappingURL=job.schema.js.map