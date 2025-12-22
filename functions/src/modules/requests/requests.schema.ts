/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUESTS MODULE — SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Source of truth for Request data shape.
 * NO Firebase imports. NO business logic.
 *
 * STATUS LIFECYCLE (explicit):
 *   pending → assigned → in_progress → completed
 *   pending → cancelled
 *   assigned → cancelled
 *
 * No other transitions are allowed.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const RequestStatusSchema = z.enum([
    "pending",
    "assigned",
    "in_progress",
    "completed",
    "cancelled",
]);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const RequestTypeSchema = z.enum([
    "booking",
    "inquiry",
    "order",
    "service",
    "viewing",
    "other",
]);
export type RequestType = z.infer<typeof RequestTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST (Core Entity)
// ─────────────────────────────────────────────────────────────────────────────

export const RequestSchema = z.object({
    // Identity
    id: z.string(),

    // Ownership
    userId: z.string(),
    userName: z.string().optional(),
    userPhone: z.string().optional(),
    userEmail: z.string().email().optional(),

    // Reference (optional link to listing)
    listingId: z.string().optional(),
    listingTitle: z.string().optional(),

    // Reference (optional link to proposal from agent)
    proposalId: z.string().optional(),

    // Type & Description
    type: RequestTypeSchema,
    title: z.string().min(1),
    description: z.string().optional(),

    // Scheduling
    scheduledDate: z.date().optional(),
    scheduledTime: z.string().optional(),

    // Assignment
    assignedTo: z.string().optional(),
    assignedToName: z.string().optional(),
    assignedAt: z.date().optional(),

    // Status
    status: RequestStatusSchema,

    // Metadata
    metadata: z.record(z.unknown()).optional(),
    notes: z.string().optional(),

    // Timestamps
    createdAt: z.date(),
    updatedAt: z.date(),
    completedAt: z.date().optional(),
    cancelledAt: z.date().optional(),
    cancelledBy: z.string().optional(),
    cancellationReason: z.string().optional(),
});

export type Request = z.infer<typeof RequestSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const CreateRequestInputSchema = z.object({
    // Reference (optional)
    listingId: z.string().optional(),
    listingTitle: z.string().optional(),
    proposalId: z.string().optional(),

    // Type & Description
    type: RequestTypeSchema,
    title: z.string().min(1),
    description: z.string().optional(),

    // Scheduling
    scheduledDate: z.date().optional(),
    scheduledTime: z.string().optional(),

    // Metadata
    metadata: z.record(z.unknown()).optional(),
    notes: z.string().optional(),
});

export type CreateRequestInput = z.infer<typeof CreateRequestInputSchema>;

export const UpdateRequestStatusInputSchema = z.object({
    status: RequestStatusSchema,
    notes: z.string().optional(),
});

export type UpdateRequestStatusInput = z.infer<typeof UpdateRequestStatusInputSchema>;

export const AssignRequestInputSchema = z.object({
    assignedTo: z.string(),
    assignedToName: z.string().optional(),
});

export type AssignRequestInput = z.infer<typeof AssignRequestInputSchema>;

export const CancelRequestInputSchema = z.object({
    reason: z.string().optional(),
});

export type CancelRequestInput = z.infer<typeof CancelRequestInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// QUERY SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const RequestQuerySchema = z.object({
    userId: z.string().optional(),
    assignedTo: z.string().optional(),
    status: RequestStatusSchema.optional(),
    type: RequestTypeSchema.optional(),
    listingId: z.string().optional(),
    limit: z.number().min(1).max(100).optional(),
});

export type RequestQuery = z.infer<typeof RequestQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITION VALIDATION (explicit, no magic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates if a status transition is allowed.
 *
 * Valid transitions:
 *   pending → assigned
 *   pending → cancelled
 *   assigned → in_progress
 *   assigned → cancelled
 *   in_progress → completed
 *
 * All other transitions are invalid.
 */
export function isValidStatusTransition(
    currentStatus: RequestStatus,
    newStatus: RequestStatus
): boolean {
    // pending → assigned
    if (currentStatus === "pending" && newStatus === "assigned") {
        return true;
    }

    // pending → cancelled
    if (currentStatus === "pending" && newStatus === "cancelled") {
        return true;
    }

    // assigned → in_progress
    if (currentStatus === "assigned" && newStatus === "in_progress") {
        return true;
    }

    // assigned → cancelled
    if (currentStatus === "assigned" && newStatus === "cancelled") {
        return true;
    }

    // in_progress → completed
    if (currentStatus === "in_progress" && newStatus === "completed") {
        return true;
    }

    // All other transitions are invalid
    return false;
}
