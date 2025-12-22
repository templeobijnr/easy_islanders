/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOOKINGS MODULE — SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Source of truth for Booking data shape.
 * NO Firebase imports. NO business logic.
 *
 * STATUS LIFECYCLE (explicit):
 *   pending → confirmed → completed
 *   pending → cancelled
 *   confirmed → cancelled
 *
 * No other transitions are allowed.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const BookingStatusSchema = z.enum([
    "pending",
    "confirmed",
    "completed",
    "cancelled",
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingTypeSchema = z.enum([
    "reservation",
    "order",
    "viewing",
    "booking",
]);
export type BookingType = z.infer<typeof BookingTypeSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING (Core Entity)
// ─────────────────────────────────────────────────────────────────────────────

export const BookingSchema = z.object({
    // Identity
    id: z.string(),

    // Ownership
    userId: z.string(),

    // References (optional links)
    listingId: z.string().optional(),
    requestId: z.string().optional(),

    // Type & Status
    type: BookingTypeSchema,
    status: BookingStatusSchema,

    // Denormalized info
    itemTitle: z.string().min(1),
    region: z.string().optional(),

    // Scheduling
    scheduledDate: z.date().optional(),
    partySize: z.number().optional(),

    // Pricing
    totalAmount: z.number().optional(),
    currency: z.string().default("GBP"),

    // Notes
    notes: z.string().optional(),

    // Timestamps
    createdAt: z.date(),
    updatedAt: z.date(),
    confirmedAt: z.date().optional(),
    completedAt: z.date().optional(),
    cancelledAt: z.date().optional(),
    cancelledBy: z.string().optional(),
    cancellationReason: z.string().optional(),
});

export type Booking = z.infer<typeof BookingSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const CreateBookingInputSchema = z.object({
    // Type (required)
    type: BookingTypeSchema,

    // Denormalized info (required)
    itemTitle: z.string().min(1),

    // References (optional)
    listingId: z.string().optional(),
    requestId: z.string().optional(),

    // Scheduling (optional)
    scheduledDate: z.date().optional(),
    partySize: z.number().optional(),

    // Pricing (optional)
    totalAmount: z.number().optional(),
    currency: z.string().optional(),

    // Location (optional)
    region: z.string().optional(),

    // Notes (optional)
    notes: z.string().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>;

export const CancelBookingInputSchema = z.object({
    reason: z.string().optional(),
});

export type CancelBookingInput = z.infer<typeof CancelBookingInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// QUERY SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const BookingQuerySchema = z.object({
    status: BookingStatusSchema.optional(),
    type: BookingTypeSchema.optional(),
    limit: z.number().min(1).max(100).optional(),
});

export type BookingQuery = z.infer<typeof BookingQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITION VALIDATION (explicit, no magic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates if a booking status transition is allowed.
 *
 * Valid transitions:
 *   pending → confirmed
 *   pending → cancelled
 *   confirmed → completed
 *   confirmed → cancelled
 *
 * All other transitions are invalid.
 */
export function isValidBookingStatusTransition(
    currentStatus: BookingStatus,
    newStatus: BookingStatus
): boolean {
    // pending → confirmed
    if (currentStatus === "pending" && newStatus === "confirmed") {
        return true;
    }

    // pending → cancelled
    if (currentStatus === "pending" && newStatus === "cancelled") {
        return true;
    }

    // confirmed → completed
    if (currentStatus === "confirmed" && newStatus === "completed") {
        return true;
    }

    // confirmed → cancelled
    if (currentStatus === "confirmed" && newStatus === "cancelled") {
        return true;
    }

    // All other transitions are invalid
    return false;
}
