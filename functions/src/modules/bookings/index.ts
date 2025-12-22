/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOOKINGS MODULE — INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports for the Bookings module.
 * No wildcard exports.
 */

// Schemas & Types
export {
    BookingSchema,
    BookingStatusSchema,
    BookingTypeSchema,
    CreateBookingInputSchema,
    CancelBookingInputSchema,
    BookingQuerySchema,
    isValidBookingStatusTransition,
} from "./bookings.schema";

export type {
    Booking,
    BookingStatus,
    BookingType,
    CreateBookingInput,
    CancelBookingInput,
    BookingQuery,
} from "./bookings.schema";

// Service (internal use)
export { BookingsService } from "./bookings.service";

// Controller (internal use)
export { BookingsController } from "./bookings.controller";

// Cloud Functions (exported to index.ts)
export {
    createBooking,
    getBooking,
    getMyBookings,
    confirmBooking,
    completeBooking,
    cancelBooking,
} from "./bookings.functions";
