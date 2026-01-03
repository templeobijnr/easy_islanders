/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS MODULE — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validation + orchestration. NO direct Firestore access.
 * Wraps existing NotificationService from services/notification/ for fan-out.
 */

import * as logger from "firebase-functions/logger";
import { NotificationsService } from "./notifications.service";
import {
    CreateNotificationInputSchema,
    NotificationQuerySchema,
    deriveNotificationIdempotencyKey,
    getDefaultChannelPriority,
    isHighPriorityType,
} from "./notifications.schema";
import type {
    CreateNotificationInput,
    NotificationRecord,
    NotificationQuery,
    ChannelDeliveryRecord,
    NotificationChannel,
} from "./notifications.schema";
import { AppError } from "../../utils/errors";
import type { AuthContext } from "../identity/identity.schema";
import { DispatchService } from "../../services/domains/dispatch/dispatch.service";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function generateId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

function nowIsoString(): string {
    return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// CHANNEL DISPATCHERS
// ─────────────────────────────────────────────────────────────────────────────

async function dispatchToWhatsApp(
    userId: string,
    title: string,
    body: string
): Promise<ChannelDeliveryRecord> {
    try {
        // Look up user phone
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return {
                channel: "whatsapp",
                status: "skipped",
                attemptedAt: nowIsoString(),
                error: "User not found",
            };
        }

        const userData = userDoc.data()!;
        const phone = userData.phone || userData.phoneE164;

        if (!phone) {
            return {
                channel: "whatsapp",
                status: "skipped",
                attemptedAt: nowIsoString(),
                error: "No phone number",
            };
        }

        // Canonical provider boundary: write-before-send via DispatchService.
        const dispatch = await DispatchService.sendWhatsApp({
            kind: "user_notification",
            toE164: phone,
            body: `*${title}*\n\n${body}`,
            correlationId: `notif:user:${userId}`,
            idempotencyKey: `notif_whatsapp:${userId}:${title}:${body}`.slice(0, 200),
            traceId: `notif-${Date.now()}`,
        });

        return {
            channel: "whatsapp",
            status: "sent",
            attemptedAt: nowIsoString(),
            messageId: dispatch.providerMessageId,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("[Notifications] WhatsApp dispatch failed", { error: errorMessage });
        return {
            channel: "whatsapp",
            status: "failed",
            attemptedAt: nowIsoString(),
            error: errorMessage,
        };
    }
}

async function dispatchToPush(
    userId: string,
    title: string,
    body: string
): Promise<ChannelDeliveryRecord> {
    try {
        // Look up user FCM tokens
        const { getFirestore } = await import("firebase-admin/firestore");
        const db = getFirestore();
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
            return {
                channel: "push",
                status: "skipped",
                attemptedAt: nowIsoString(),
                error: "User not found",
            };
        }

        const userData = userDoc.data()!;
        const fcmTokens: string[] = userData.fcmTokens || [];

        if (fcmTokens.length === 0) {
            return {
                channel: "push",
                status: "skipped",
                attemptedAt: nowIsoString(),
                error: "No FCM tokens",
            };
        }

        // Send via FCM
        const { getMessaging } = await import("firebase-admin/messaging");
        const messaging = getMessaging();

        const results = await Promise.allSettled(
            fcmTokens.map((token) =>
                messaging.send({
                    token,
                    notification: { title, body },
                })
            )
        );

        const successCount = results.filter((r) => r.status === "fulfilled").length;

        if (successCount > 0) {
            return {
                channel: "push",
                status: "sent",
                attemptedAt: nowIsoString(),
            };
        } else {
            return {
                channel: "push",
                status: "failed",
                attemptedAt: nowIsoString(),
                error: "All FCM sends failed",
            };
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("[Notifications] Push dispatch failed", { error: errorMessage });
        return {
            channel: "push",
            status: "failed",
            attemptedAt: nowIsoString(),
            error: errorMessage,
        };
    }
}

async function dispatchToInApp(
    notificationId: string
): Promise<ChannelDeliveryRecord> {
    // In-app is just the notification record itself - always succeeds
    return {
        channel: "in_app",
        status: "delivered",
        attemptedAt: nowIsoString(),
        deliveredAt: nowIsoString(),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationsController = {
    /**
     * Create and send notification (idempotent).
     */
    async createAndSend(input: CreateNotificationInput): Promise<NotificationRecord> {
        // 1. Validate input
        const parseResult = CreateNotificationInputSchema.safeParse(input);
        if (!parseResult.success) {
            throw new AppError("INVALID_INPUT", parseResult.error.message);
        }

        const data = parseResult.data;

        // 2. Derive idempotency key
        const idempotencyKey = data.idempotencyKey || deriveNotificationIdempotencyKey(
            data.userId,
            data.type,
            data.correlationId
        );

        // 3. Reserve/check idempotency
        const { reserved, existingNotificationId } = await NotificationsService.reserveIdempotency(
            idempotencyKey
        );

        if (!reserved && existingNotificationId) {
            const existing = await NotificationsService.getNotification(existingNotificationId);
            if (existing) {
                logger.debug("[Notifications] Returning existing notification", {
                    idempotencyKey,
                    notificationId: existing.id,
                });
                return existing;
            }
        }

        // 4. Create notification record
        const notificationId = generateId();
        const now = nowIsoString();
        const priority = data.priority || (isHighPriorityType(data.type) ? "high" : "normal");

        const notification: NotificationRecord = {
            id: notificationId,
            idempotencyKey,
            userId: data.userId,
            businessId: data.businessId,
            type: data.type,
            title: data.title,
            body: data.body,
            priority,
            correlationId: data.correlationId,
            metadata: data.metadata,
            status: "pending",
            channelDeliveries: [],
            createdAt: now,
        };

        await NotificationsService.createNotification(notification);
        await NotificationsService.completeIdempotency(idempotencyKey, notificationId);

        // 5. Update status to processing
        await NotificationsService.updateNotificationStatus(notificationId, "processing");

        // 6. Fan out to channels
        const channels = data.channels || getDefaultChannelPriority();
        const deliveries: ChannelDeliveryRecord[] = [];
        let anySuccess = false;

        for (const channel of channels) {
            let delivery: ChannelDeliveryRecord;

            switch (channel) {
                case "push":
                    delivery = await dispatchToPush(data.userId, data.title, data.body);
                    break;
                case "whatsapp":
                    delivery = await dispatchToWhatsApp(data.userId, data.title, data.body);
                    break;
                case "in_app":
                    delivery = await dispatchToInApp(notificationId);
                    break;
                default:
                    delivery = {
                        channel,
                        status: "skipped",
                        attemptedAt: now,
                        error: "Channel not implemented",
                    };
            }

            await NotificationsService.addChannelDelivery(notificationId, delivery);
            deliveries.push(delivery);

            if (delivery.status === "sent" || delivery.status === "delivered") {
                anySuccess = true;
            }
        }

        // 7. Update final status
        const finalStatus = anySuccess ? "completed" : "failed";
        await NotificationsService.updateNotificationStatus(notificationId, finalStatus, now);

        logger.info("[Notifications] Notification sent", {
            notificationId,
            userId: data.userId,
            type: data.type,
            status: finalStatus,
        });

        return {
            ...notification,
            status: finalStatus,
            channelDeliveries: deliveries,
            processedAt: now,
        };
    },

    /**
     * Get notifications for current user.
     */
    async getMyNotifications(
        ctx: AuthContext,
        query?: NotificationQuery
    ): Promise<NotificationRecord[]> {
        if (query) {
            const parseResult = NotificationQuerySchema.safeParse(query);
            if (!parseResult.success) {
                throw new AppError("INVALID_INPUT", parseResult.error.message);
            }
            return NotificationsService.getNotificationsForUser(ctx.uid, parseResult.data);
        }
        return NotificationsService.getNotificationsForUser(ctx.uid);
    },

    /**
     * Mark notification as read.
     */
    async markAsRead(ctx: AuthContext, notificationId: string): Promise<void> {
        const notification = await NotificationsService.getNotification(notificationId);

        if (!notification) {
            throw new AppError("NOT_FOUND", "Notification not found");
        }

        // Permission check
        if (notification.userId !== ctx.uid) {
            throw new AppError("PERMISSION_DENIED", "Cannot mark this notification as read");
        }

        await NotificationsService.markAsRead(notificationId);
    },

    /**
     * Get unread count for current user.
     */
    async getUnreadCount(ctx: AuthContext): Promise<number> {
        return NotificationsService.getUnreadCount(ctx.uid);
    },
};
