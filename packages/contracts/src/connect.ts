/**
 * @askmerve/contracts - Connect Module DTOs
 *
 * Transport-safe data transfer objects for Connect module.
 * All dates are ISO strings for JSON transport.
 *
 * IMPORTANT: These are DTOs only - no business logic.
 * For Firestore entity handling, see functions/src/modules/connect/
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const PinTypeSchema = z.enum(['place', 'activity', 'event']);
export type PinType = z.infer<typeof PinTypeSchema>;

export const ActivityTypeSchema = z.enum(['checkin', 'join', 'leave']);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const JoinStatusSchema = z.enum(['joined', 'left']);
export type JoinStatus = z.infer<typeof JoinStatusSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATES
// ─────────────────────────────────────────────────────────────────────────────

export const CoordinatesSchema = z.object({
    lat: z.number(),
    lng: z.number(),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN DTO (Transport Format)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check-in data transfer object.
 * Represents a user's check-in at a place, activity, or event.
 * All timestamps are ISO 8601 strings for transport.
 */
export const CheckInDTOSchema = z.object({
    // Identity
    id: z.string(),

    // User
    userId: z.string(),
    userName: z.string().optional(),
    userPhotoURL: z.string().optional(),

    // Pin reference
    pinId: z.string(),
    pinType: PinTypeSchema,
    pinTitle: z.string().optional(),
    region: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),

    // Expiry (ISO string)
    expiresAt: z.string(),

    // Timestamps (ISO strings)
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type CheckInDTO = z.infer<typeof CheckInDTOSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// JOIN DTO (Transport Format)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Event join/participation data transfer object.
 * Represents a user's participation in an event.
 */
export const JoinDTOSchema = z.object({
    // Identity
    id: z.string(),

    // User
    userId: z.string(),
    userName: z.string().optional(),
    userPhotoURL: z.string().optional(),

    // Event reference
    eventId: z.string(),
    eventTitle: z.string().optional(),
    region: z.string().optional(),

    // Status
    status: JoinStatusSchema,

    // Timestamps (ISO strings)
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type JoinDTO = z.infer<typeof JoinDTOSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// FEED ITEM DTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified feed item for the Connect activity feed.
 * Can represent a check-in, join, or leave activity.
 */
export const FeedItemSchema = z.object({
    // Identity
    id: z.string(),

    // Activity type
    type: ActivityTypeSchema,

    // User
    userId: z.string(),
    userName: z.string().optional(),
    userPhotoURL: z.string().optional(),

    // Pin reference (optional for some activity types)
    pinId: z.string().optional(),
    pinType: PinTypeSchema.optional(),
    pinTitle: z.string().optional(),
    region: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),

    // Reference to source (checkin.id or join.id)
    refId: z.string().optional(),

    // Expiry (optional, for checkin activities)
    expiresAt: z.string().optional(),

    // Timestamps
    createdAt: z.string(),
});

export type FeedItem = z.infer<typeof FeedItemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LIVE VENUE DTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Live venue aggregation showing active check-in counts.
 */
export const LiveVenueDTOSchema = z.object({
    pinId: z.string(),
    pinType: PinTypeSchema,
    pinTitle: z.string().optional(),
    region: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),
    activeCount: z.number(),
});

export type LiveVenueDTO = z.infer<typeof LiveVenueDTOSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const CheckInInputSchema = z.object({
    pinId: z.string().min(1),
    pinType: PinTypeSchema,
});

export type CheckInInput = z.infer<typeof CheckInInputSchema>;

export const JoinEventInputSchema = z.object({
    eventId: z.string().min(1),
});

export type JoinEventInput = z.infer<typeof JoinEventInputSchema>;

export const LeaveEventInputSchema = z.object({
    eventId: z.string().min(1),
});

export type LeaveEventInput = z.infer<typeof LeaveEventInputSchema>;

export const FeedQuerySchema = z.object({
    region: z.string().optional(),
    limit: z.number().min(1).max(100).optional(),
});

export type FeedQuery = z.infer<typeof FeedQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Default expiry time for check-ins in hours */
export const CHECKIN_EXPIRY_HOURS = 4;
