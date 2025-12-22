/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS MODULE — SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Firestore CRUD operations only.
 * NO auth decisions. NO channel sends. NO HTTP.
 *
 * OWNS: notifications, notificationIdempotency
 * MAY READ: (none for now)
 * MUST NOT WRITE: users, bookings, listings
 */

import { FieldValue } from "firebase-admin/firestore";
import { db as firestoreDb } from "../../config/firebase";
import type {
    NotificationRecord,
    ChannelDeliveryRecord,
    NotificationStatus,
    NotificationQuery,
} from "./notifications.schema";

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE REFERENCES (LAZY INIT)
// ─────────────────────────────────────────────────────────────────────────────

function db(): FirebaseFirestore.Firestore {
    return firestoreDb;
}

const NOTIFICATIONS_COLLECTION = "notifications";
const IDEMPOTENCY_COLLECTION = "notificationIdempotency";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function nowIsoString(): string {
    return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reserve notification idempotency key.
 * Returns null if key is fresh, or existing notification ID if already reserved.
 */
async function reserveIdempotency(
    idempotencyKey: string
): Promise<{ reserved: boolean; existingNotificationId?: string }> {
    const ref = db().collection(IDEMPOTENCY_COLLECTION).doc(idempotencyKey);

    return db().runTransaction(async (tx) => {
        const doc = await tx.get(ref);

        if (doc.exists) {
            const data = doc.data()!;
            return {
                reserved: false,
                existingNotificationId: data.notificationId,
            };
        }

        tx.set(ref, {
            reservedAt: nowIsoString(),
            state: "reserved",
        });

        return { reserved: true };
    });
}

/**
 * Complete idempotency reservation with notification ID.
 */
async function completeIdempotency(
    idempotencyKey: string,
    notificationId: string
): Promise<void> {
    await db().collection(IDEMPOTENCY_COLLECTION).doc(idempotencyKey).update({
        notificationId,
        state: "completed",
        completedAt: nowIsoString(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create notification record in pending state.
 */
async function createNotification(notification: NotificationRecord): Promise<void> {
    await db().collection(NOTIFICATIONS_COLLECTION).doc(notification.id).set(notification);
}

/**
 * Get notification by ID.
 */
async function getNotification(notificationId: string): Promise<NotificationRecord | null> {
    const doc = await db().collection(NOTIFICATIONS_COLLECTION).doc(notificationId).get();
    if (!doc.exists) return null;
    return doc.data() as NotificationRecord;
}

/**
 * Get notification by idempotency key.
 */
async function getNotificationByIdempotency(
    idempotencyKey: string
): Promise<NotificationRecord | null> {
    const idempDoc = await db().collection(IDEMPOTENCY_COLLECTION).doc(idempotencyKey).get();
    if (!idempDoc.exists) return null;

    const data = idempDoc.data()!;
    if (!data.notificationId) return null;

    return getNotification(data.notificationId);
}

/**
 * Update notification status.
 */
async function updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    processedAt?: string
): Promise<void> {
    const update: Record<string, unknown> = { status };
    if (processedAt) {
        update.processedAt = processedAt;
    }
    await db().collection(NOTIFICATIONS_COLLECTION).doc(notificationId).update(update);
}

/**
 * Add channel delivery record.
 */
async function addChannelDelivery(
    notificationId: string,
    delivery: ChannelDeliveryRecord
): Promise<void> {
    await db().collection(NOTIFICATIONS_COLLECTION).doc(notificationId).update({
        channelDeliveries: FieldValue.arrayUnion(delivery),
    });
}

/**
 * Mark notification as read.
 */
async function markAsRead(notificationId: string): Promise<void> {
    await db().collection(NOTIFICATIONS_COLLECTION).doc(notificationId).update({
        readAt: nowIsoString(),
    });
}

/**
 * Get notifications for a user.
 */
async function getNotificationsForUser(
    userId: string,
    query?: NotificationQuery
): Promise<NotificationRecord[]> {
    let ref: FirebaseFirestore.Query = db()
        .collection(NOTIFICATIONS_COLLECTION)
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc");

    if (query?.type !== undefined) {
        ref = ref.where("type", "==", query.type);
    }
    if (query?.status !== undefined) {
        ref = ref.where("status", "==", query.status);
    }
    if (query?.unreadOnly === true) {
        ref = ref.where("readAt", "==", null);
    }

    const limit = query?.limit || 50;
    ref = ref.limit(limit);

    const snap = await ref.get();
    return snap.docs.map((doc) => doc.data() as NotificationRecord);
}

/**
 * Get unread count for user.
 */
async function getUnreadCount(userId: string): Promise<number> {
    const snap = await db()
        .collection(NOTIFICATIONS_COLLECTION)
        .where("userId", "==", userId)
        .where("readAt", "==", null)
        .count()
        .get();

    return snap.data().count;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const NotificationsService = {
    // Idempotency
    reserveIdempotency,
    completeIdempotency,
    getNotificationByIdempotency,

    // CRUD
    createNotification,
    getNotification,
    updateNotificationStatus,
    addChannelDelivery,
    markAsRead,
    getNotificationsForUser,
    getUnreadCount,
};
