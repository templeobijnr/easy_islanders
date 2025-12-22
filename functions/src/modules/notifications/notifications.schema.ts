/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS MODULE — SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Source of truth for Notification data shapes.
 * NO Firebase imports. NO business logic.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONTRACT SURFACE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * CAPABILITIES:
 *   - Create and store notification records
 *   - Fan out notifications across channels (in-app, whatsapp, push)
 *   - Track delivery status per channel
 *   - Query user notifications
 *
 * OWNS (WRITES):
 *   - notifications/{id}              (notification records)
 *   - notificationIdempotency/{key}   (dedupe for fan-out)
 *
 * ALLOWED READS:
 *   - users/{userId}                  (fcmTokens, phone)
 *   - businesses/{id}                 (for business notifications)
 *
 * FORBIDDEN WRITES:
 *   - users/{userId}
 *   - bookings/{id}
 *   - listings/{id}
 *
 * NOTIFICATION TYPES (from existing usage):
 *   - job_dispatched      (merchant receives new job)
 *   - job_confirmed       (customer receives confirmation)
 *   - booking_confirmed   (guest receives confirmation)
 *   - booking_cancelled   (guest receives cancellation)
 *   - booking_requested   (host receives request)
 *   - booking_host_reply  (guest receives host decision)
 *   - provider_reply      (customer receives vendor response)
 *   - taxi_assigned       (customer receives driver assignment)
 *   - system_alert        (admin receives system alert)
 *
 * CHANNEL PRIORITY (default):
 *   1. Push (if user has app + FCM tokens)
 *   2. WhatsApp (if user has phone)
 *   3. In-app (always stored)
 *
 * IDEMPOTENCY STRATEGY:
 *   Key: hash(userId:notificationType:correlationId:hourBucket)
 *
 * CONTRACT ISSUE #2: Notification priority rules not fully documented.
 * RESOLUTION: Derived from NotificationService in services/notification/.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Notification types.
 */
export const NotificationTypeSchema = z.enum([
    "job_dispatched",
    "job_confirmed",
    "booking_confirmed",
    "booking_cancelled",
    "booking_requested",
    "booking_host_reply",
    "provider_reply",
    "taxi_assigned",
    "system_alert",
    "general",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/**
 * Notification delivery channels.
 */
export const NotificationChannelSchema = z.enum([
    "in_app",
    "whatsapp",
    "push",
    "email",
]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

/**
 * Delivery status per channel.
 */
export const ChannelDeliveryStatusSchema = z.enum([
    "pending",
    "sent",
    "delivered",
    "failed",
    "skipped",      // Channel not available for user
]);
export type ChannelDeliveryStatus = z.infer<typeof ChannelDeliveryStatusSchema>;

/**
 * Overall notification status.
 */
export const NotificationStatusSchema = z.enum([
    "pending",      // Created, not yet processed
    "processing",   // Fan-out in progress
    "completed",    // At least one channel succeeded
    "failed",       // All channels failed
]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

/**
 * Priority levels.
 */
export const NotificationPrioritySchema = z.enum([
    "normal",
    "high",
    "urgent",
]);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL DELIVERY RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const ChannelDeliveryRecordSchema = z.object({
    channel: NotificationChannelSchema,
    status: ChannelDeliveryStatusSchema,
    attemptedAt: z.string().optional(),
    deliveredAt: z.string().optional(),
    failedAt: z.string().optional(),
    messageId: z.string().optional(),       // Twilio SID, FCM message ID, etc.
    error: z.string().optional(),
});
export type ChannelDeliveryRecord = z.infer<typeof ChannelDeliveryRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION RECORD (stored in notifications/{id})
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationRecordSchema = z.object({
    id: z.string().min(1),
    idempotencyKey: z.string().min(1),

    // Target
    userId: z.string().min(1),
    businessId: z.string().optional(),

    // Content
    type: NotificationTypeSchema,
    title: z.string().min(1),
    body: z.string().min(1),
    priority: NotificationPrioritySchema.default("normal"),

    // Correlation
    correlationId: z.string().optional(),   // jobId, bookingId, requestId, etc.
    metadata: z.record(z.unknown()).optional(),

    // Status
    status: NotificationStatusSchema,
    channelDeliveries: z.array(ChannelDeliveryRecordSchema).default([]),

    // Timestamps (ISO strings)
    createdAt: z.string(),
    processedAt: z.string().optional(),
    readAt: z.string().optional(),
});
export type NotificationRecord = z.infer<typeof NotificationRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const CreateNotificationInputSchema = z.object({
    userId: z.string().min(1),
    businessId: z.string().optional(),
    type: NotificationTypeSchema,
    title: z.string().min(1),
    body: z.string().min(1),
    priority: NotificationPrioritySchema.optional(),
    correlationId: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    channels: z.array(NotificationChannelSchema).optional(), // If not specified, use defaults
    idempotencyKey: z.string().optional(),
});
export type CreateNotificationInput = z.infer<typeof CreateNotificationInputSchema>;

export const NotificationQuerySchema = z.object({
    type: NotificationTypeSchema.optional(),
    status: NotificationStatusSchema.optional(),
    unreadOnly: z.boolean().optional(),
    limit: z.number().min(1).max(100).optional(),
});
export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Derive idempotency key for notifications.
 */
export function deriveNotificationIdempotencyKey(
    userId: string,
    type: NotificationType,
    correlationId?: string
): string {
    const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60)); // 1-hour buckets
    const parts = [
        "notif",
        userId.replace(/\+/g, ""),
        type,
        correlationId || "general",
        String(hourBucket),
    ];
    return parts.join(":");
}

/**
 * Get default channel priority order.
 */
export function getDefaultChannelPriority(): NotificationChannel[] {
    return ["push", "whatsapp", "in_app"];
}

/**
 * Check if notification type is high priority by default.
 */
export function isHighPriorityType(type: NotificationType): boolean {
    const highPriority: NotificationType[] = [
        "job_dispatched",
        "taxi_assigned",
        "system_alert",
    ];
    return highPriority.includes(type);
}
