/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONNECT MODULE — INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports for the Connect module.
 * No wildcard exports.
 */

// Schemas & Types
export {
    CheckInSchema,
    JoinSchema,
    UserActivitySchema,
    ConnectCurationItemSchema,
    LiveVenueSchema,
    PinTypeSchema,
    ActivityTypeSchema,
    JoinStatusSchema,
    CoordinatesSchema,
    CheckInInputSchema,
    JoinEventInputSchema,
    LeaveEventInputSchema,
    FeedQuerySchema,
    LiveVenuesQuerySchema,
    UpsertCurationInputSchema,
    CHECKIN_EXPIRY_HOURS,
} from "./connect.schema";

export type {
    CheckIn,
    Join,
    UserActivity,
    ConnectCurationItem,
    LiveVenue,
    PinType,
    ActivityType,
    JoinStatus,
    Coordinates,
    CheckInInput,
    JoinEventInput,
    LeaveEventInput,
    FeedQuery,
    LiveVenuesQuery,
    UpsertCurationInput,
} from "./connect.schema";

// Service (internal use)
export { ConnectService } from "./connect.service";

// Controller (internal use)
export { ConnectController } from "./connect.controller";

// Cloud Functions (exported to index.ts)
export {
    checkIn,
    joinEvent,
    leaveEvent,
    getActiveFeed,
    getLiveVenues,
    getCurationItems,
    upsertCurationItem,
} from "./connect.functions";
