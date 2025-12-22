/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS MODULE — INTEGRATION TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Integration tests that require Firebase emulator.
 * Run with: pnpm test:emulator
 *
 * Skipped automatically when FIRESTORE_EMULATOR_HOST is not set.
 */

const hasEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

const describeIfEmulator = hasEmulator ? describe : describe.skip;

describeIfEmulator("Notifications Integration Tests", () => {
    // ─────────────────────────────────────────────────────────────────────────
    // SETUP
    // ─────────────────────────────────────────────────────────────────────────

    beforeAll(async () => {
        // Initialize Firebase Admin for emulator
        const { initializeApp, getApps } = await import("firebase-admin/app");
        if (getApps().length === 0) {
            initializeApp({ projectId: "demo-project" });
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // IDEMPOTENCY TESTS
    // ─────────────────────────────────────────────────────────────────────────

    it("reserves notification idempotency key", async () => {
        const { NotificationsService } = await import("./notifications.service");

        const key = `notif:idem:${Date.now()}`;

        const result1 = await NotificationsService.reserveIdempotency(key);
        expect(result1.reserved).toBe(true);

        const result2 = await NotificationsService.reserveIdempotency(key);
        expect(result2.reserved).toBe(false);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATION CRUD TESTS
    // ─────────────────────────────────────────────────────────────────────────

    it("creates and retrieves notification", async () => {
        const { NotificationsService } = await import("./notifications.service");

        const notification = {
            id: `notif_${Date.now()}`,
            idempotencyKey: `notif:key:${Date.now()}`,
            userId: "user123",
            type: "job_dispatched" as const,
            title: "New Job",
            body: "You have a new job request",
            priority: "high" as const,
            status: "pending" as const,
            channelDeliveries: [],
            createdAt: new Date().toISOString(),
        };

        await NotificationsService.createNotification(notification);

        const retrieved = await NotificationsService.getNotification(notification.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.title).toBe("New Job");
    });

    it("updates notification status", async () => {
        const { NotificationsService } = await import("./notifications.service");

        const id = `notif_status_${Date.now()}`;

        await NotificationsService.createNotification({
            id,
            idempotencyKey: `notif:status:${Date.now()}`,
            userId: "user456",
            type: "booking_confirmed" as const,
            title: "Booking Confirmed",
            body: "Your booking is confirmed",
            priority: "normal" as const,
            status: "pending" as const,
            channelDeliveries: [],
            createdAt: new Date().toISOString(),
        });

        await NotificationsService.updateNotificationStatus(id, "completed");

        const updated = await NotificationsService.getNotification(id);
        expect(updated?.status).toBe("completed");
    });

    it("marks notification as read", async () => {
        const { NotificationsService } = await import("./notifications.service");

        const id = `notif_read_${Date.now()}`;

        await NotificationsService.createNotification({
            id,
            idempotencyKey: `notif:read:${Date.now()}`,
            userId: "user789",
            type: "general" as const,
            title: "General Notification",
            body: "Just a message",
            priority: "normal" as const,
            status: "completed" as const,
            channelDeliveries: [],
            createdAt: new Date().toISOString(),
        });

        await NotificationsService.markAsRead(id);

        const notification = await NotificationsService.getNotification(id);
        expect(notification?.readAt).toBeDefined();
    });
});
