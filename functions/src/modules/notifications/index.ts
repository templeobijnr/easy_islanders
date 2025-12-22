/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS MODULE — INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports for the Notifications module.
 * No wildcard exports.
 */

// Schemas & Types
export {
    NotificationTypeSchema,
    NotificationChannelSchema,
    ChannelDeliveryStatusSchema,
    NotificationStatusSchema,
    NotificationPrioritySchema,
    ChannelDeliveryRecordSchema,
    NotificationRecordSchema,
    CreateNotificationInputSchema,
    NotificationQuerySchema,
    deriveNotificationIdempotencyKey,
    getDefaultChannelPriority,
    isHighPriorityType,
} from "./notifications.schema";

export type {
    NotificationType,
    NotificationChannel,
    ChannelDeliveryStatus,
    NotificationStatus,
    NotificationPriority,
    ChannelDeliveryRecord,
    NotificationRecord,
    CreateNotificationInput,
    NotificationQuery,
} from "./notifications.schema";

// Service (internal use)
export { NotificationsService } from "./notifications.service";

// Controller (internal use)
export { NotificationsController } from "./notifications.controller";

// Cloud Functions (exported to index.ts)
export {
    getMyNotifications,
    markNotificationRead,
    getUnreadNotificationCount,
} from "./notifications.functions";
