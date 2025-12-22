/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONNECT MODULE — SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Source of truth for Connect data shapes.
 * NO Firebase imports. NO business logic.
 *
 * Connect provides:
 *   - Check-ins to pins (place/activity/event) with 4-hour expiry
 *   - Event participation (join/leave)
 *   - Activity feed (recent activity items)
 *   - Live venues (active check-ins aggregation)
 *   - Curation (admin-managed curated items)
 *
 * OWNS: checkins, joins, userActivities, connectCuration
 * MAY READ: users, listings (for denormalization only)
 * MUST NOT WRITE: users, listings, requests, bookings
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const PinTypeSchema = z.enum(["place", "activity", "event"]);
export type PinType = z.infer<typeof PinTypeSchema>;

export const ActivityTypeSchema = z.enum(["checkin", "join", "leave"]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export const JoinStatusSchema = z.enum(["joined", "left"]);
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
// CHECK-IN (Core Entity)
// ─────────────────────────────────────────────────────────────────────────────

export const CheckInSchema = z.object({
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

    // Expiry (default 4 hours from creation)
    expiresAt: z.date(),

    // Timestamps
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type CheckIn = z.infer<typeof CheckInSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// JOIN (Event Participation)
// ─────────────────────────────────────────────────────────────────────────────

export const JoinSchema = z.object({
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

    // Timestamps
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type Join = z.infer<typeof JoinSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// USER ACTIVITY (Feed Item)
// ─────────────────────────────────────────────────────────────────────────────

export const UserActivitySchema = z.object({
    // Identity
    id: z.string(),

    // Activity type
    type: ActivityTypeSchema,

    // User
    userId: z.string(),
    userName: z.string().optional(),
    userPhotoURL: z.string().optional(),

    // Pin reference (optional)
    pinId: z.string().optional(),
    pinType: PinTypeSchema.optional(),
    pinTitle: z.string().optional(),
    region: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),

    // Reference to source (checkin.id or join.id)
    refId: z.string().optional(),

    // Expiry (for checkin activities)
    expiresAt: z.date().optional(),

    // Timestamps
    createdAt: z.date(),
});

export type UserActivity = z.infer<typeof UserActivitySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CURATION ITEM (Admin-managed)
// ─────────────────────────────────────────────────────────────────────────────

export const ConnectCurationItemSchema = z.object({
    // Identity
    id: z.string(),

    // Pin reference
    pinId: z.string(),
    pinType: PinTypeSchema,
    title: z.string().optional(),
    region: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),

    // Display
    priority: z.number().default(0),
    active: z.boolean().default(true),

    // Time window (optional)
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),

    // Audit
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type ConnectCurationItem = z.infer<typeof ConnectCurationItemSchema>;

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

export const LiveVenuesQuerySchema = z.object({
    region: z.string().optional(),
    limit: z.number().min(1).max(100).optional(),
});

export type LiveVenuesQuery = z.infer<typeof LiveVenuesQuerySchema>;

export const UpsertCurationInputSchema = z.object({
    pinId: z.string().min(1),
    pinType: PinTypeSchema,
    priority: z.number().optional(),
    active: z.boolean().optional(),
    startsAt: z.date().optional(),
    endsAt: z.date().optional(),
});

export type UpsertCurationInput = z.infer<typeof UpsertCurationInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LIVE VENUE (Aggregated Result)
// ─────────────────────────────────────────────────────────────────────────────

export const LiveVenueSchema = z.object({
    pinId: z.string(),
    pinType: PinTypeSchema,
    pinTitle: z.string().optional(),
    region: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),
    activeCount: z.number(),
});

export type LiveVenue = z.infer<typeof LiveVenueSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const CHECKIN_EXPIRY_HOURS = 4;
