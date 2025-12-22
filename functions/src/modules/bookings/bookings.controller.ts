/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOOKINGS MODULE — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validation + Permission checks.
 * NO direct Firestore access.
 */

import { BookingsService } from "./bookings.service";
import type {
    Booking,
    CreateBookingInput,
    CancelBookingInput,
    BookingQuery,
} from "./bookings.schema";
import {
    CreateBookingInputSchema,
    CancelBookingInputSchema,
    BookingQuerySchema,
    isValidBookingStatusTransition,
} from "./bookings.schema";
import { AppError } from "../../utils/errors";
import type { AuthContext } from "../identity/identity.schema";

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION HELPERS (explicit, boring)
// ─────────────────────────────────────────────────────────────────────────────

function isAdmin(ctx: AuthContext): boolean {
    if (ctx.isAdmin === true) {
        return true;
    }
    if (ctx.role === "admin") {
        return true;
    }
    if (ctx.role === "superadmin") {
        return true;
    }
    return false;
}

function isOwner(ctx: AuthContext, booking: Booking): boolean {
    return booking.userId === ctx.uid;
}

function canReadBooking(ctx: AuthContext, booking: Booking): boolean {
    // Admin can read any booking
    if (isAdmin(ctx)) {
        return true;
    }
    // Owner can read their own booking
    if (isOwner(ctx, booking)) {
        return true;
    }
    return false;
}

function canUpdateBooking(ctx: AuthContext, booking: Booking): boolean {
    // Admin can update any booking
    if (isAdmin(ctx)) {
        return true;
    }
    // Owner can update their own booking
    if (isOwner(ctx, booking)) {
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export const BookingsController = {
    /**
     * Get a booking by ID
     * - Owner can read their own booking
     * - Admin can read any booking
     */
    async getBooking(ctx: AuthContext, bookingId: string): Promise<Booking | null> {
        const booking = await BookingsService.getBooking(bookingId);

        if (booking === null) {
            return null;
        }

        // Permission check
        if (!canReadBooking(ctx, booking)) {
            throw new AppError("PERMISSION_DENIED", "You cannot view this booking");
        }

        return booking;
    },

    /**
     * Create a new booking
     * - Any authenticated user can create a booking
     * - userId is always set to ctx.uid (ignore any provided userId)
     */
    async createBooking(ctx: AuthContext, input: CreateBookingInput): Promise<string> {
        // Validate input
        const validationResult = CreateBookingInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        // Create the booking (userId is always ctx.uid)
        const bookingId = await BookingsService.createBooking(ctx.uid, validationResult.data);

        return bookingId;
    },

    /**
     * Get user's own bookings
     */
    async getMyBookings(ctx: AuthContext, query?: BookingQuery): Promise<Booking[]> {
        // Validate query if provided
        if (query) {
            const validationResult = BookingQuerySchema.safeParse(query);
            if (!validationResult.success) {
                throw new AppError("INVALID_INPUT", validationResult.error.message);
            }
            return BookingsService.getBookingsForUser(ctx.uid, validationResult.data);
        }

        return BookingsService.getBookingsForUser(ctx.uid);
    },

    /**
     * Confirm a booking
     * - Owner can confirm their own booking
     * - Admin can confirm any booking
     * - Only pending bookings can be confirmed
     */
    async confirmBooking(ctx: AuthContext, bookingId: string): Promise<Booking | null> {
        // Get current booking
        const booking = await BookingsService.getBooking(bookingId);
        if (booking === null) {
            throw new AppError("NOT_FOUND", "Booking not found");
        }

        // Permission check
        if (!canUpdateBooking(ctx, booking)) {
            throw new AppError("PERMISSION_DENIED", "You cannot confirm this booking");
        }

        // Validate status transition
        const isValid = isValidBookingStatusTransition(booking.status, "confirmed");
        if (!isValid) {
            throw new AppError(
                "INVALID_INPUT",
                `Cannot confirm a ${booking.status} booking`
            );
        }

        const now = new Date();
        return BookingsService.updateBookingStatus(bookingId, "confirmed", {
            confirmedAt: now,
        });
    },

    /**
     * Complete a booking
     * - Owner can complete their own booking
     * - Admin can complete any booking
     * - Only confirmed bookings can be completed
     */
    async completeBooking(ctx: AuthContext, bookingId: string): Promise<Booking | null> {
        // Get current booking
        const booking = await BookingsService.getBooking(bookingId);
        if (booking === null) {
            throw new AppError("NOT_FOUND", "Booking not found");
        }

        // Permission check
        if (!canUpdateBooking(ctx, booking)) {
            throw new AppError("PERMISSION_DENIED", "You cannot complete this booking");
        }

        // Validate status transition
        const isValid = isValidBookingStatusTransition(booking.status, "completed");
        if (!isValid) {
            throw new AppError(
                "INVALID_INPUT",
                `Cannot complete a ${booking.status} booking`
            );
        }

        const now = new Date();
        return BookingsService.updateBookingStatus(bookingId, "completed", {
            completedAt: now,
        });
    },

    /**
     * Cancel a booking
     * - Owner can cancel their own booking
     * - Admin can cancel any booking
     * - Only pending or confirmed bookings can be cancelled
     */
    async cancelBooking(
        ctx: AuthContext,
        bookingId: string,
        input: CancelBookingInput
    ): Promise<Booking | null> {
        // Validate input
        const validationResult = CancelBookingInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const { reason } = validationResult.data;

        // Get current booking
        const booking = await BookingsService.getBooking(bookingId);
        if (booking === null) {
            throw new AppError("NOT_FOUND", "Booking not found");
        }

        // Permission check
        if (!canUpdateBooking(ctx, booking)) {
            throw new AppError("PERMISSION_DENIED", "You cannot cancel this booking");
        }

        // Validate status transition
        const isValid = isValidBookingStatusTransition(booking.status, "cancelled");
        if (!isValid) {
            throw new AppError(
                "INVALID_INPUT",
                `Cannot cancel a ${booking.status} booking`
            );
        }

        const now = new Date();
        return BookingsService.updateBookingStatus(bookingId, "cancelled", {
            cancelledAt: now,
            cancelledBy: ctx.uid,
            cancellationReason: reason,
        });
    },
};
