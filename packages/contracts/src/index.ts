/**
 * @askmerve/contracts
 *
 * Shared transport-safe DTO schemas for AskMerve web and mobile apps.
 *
 * These contracts define the shape of data transferred between:
 * - Mobile app ↔ Backend API
 * - Web app ↔ Backend API
 *
 * All date/time fields use ISO 8601 strings for JSON transport.
 * For Firestore entity handling with Timestamps, see backend modules.
 *
 * Usage:
 * ```typescript
 * import { CheckInDTO, CheckInDTOSchema, UserClaims } from '@askmerve/contracts';
 *
 * // Validate API response
 * const result = CheckInDTOSchema.safeParse(apiResponse);
 * if (result.success) {
 *   const checkIn: CheckInDTO = result.data;
 * }
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONNECT MODULE
// ─────────────────────────────────────────────────────────────────────────────

export {
    // Enums
    PinTypeSchema,
    ActivityTypeSchema,
    JoinStatusSchema,
    type PinType,
    type ActivityType,
    type JoinStatus,

    // Base types
    CoordinatesSchema,
    type Coordinates,

    // DTOs
    CheckInDTOSchema,
    JoinDTOSchema,
    FeedItemSchema,
    LiveVenueDTOSchema,
    type CheckInDTO,
    type JoinDTO,
    type FeedItem,
    type LiveVenueDTO,

    // Input schemas
    CheckInInputSchema,
    JoinEventInputSchema,
    LeaveEventInputSchema,
    FeedQuerySchema,
    type CheckInInput,
    type JoinEventInput,
    type LeaveEventInput,
    type FeedQuery,

    // Constants
    CHECKIN_EXPIRY_HOURS,
} from './connect';

// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY MODULE
// ─────────────────────────────────────────────────────────────────────────────

export {
    // Enums
    UserRoleSchema,
    UserTypeSchema,
    type UserRole,
    type UserType,

    // Auth types
    UserClaimsSchema,
    AuthContextSchema,
    type UserClaims,
    type AuthContext,

    // Profile types
    UserProfileDTOSchema,
    SessionInfoSchema,
    type UserProfileDTO,
    type SessionInfo,
} from './identity';
