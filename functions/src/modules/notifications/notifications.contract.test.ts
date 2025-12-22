/**
 * ═══════════════════════════════════════════════════════════════════════════
 * NOTIFICATIONS MODULE — CONTRACT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Contract tests that define the module's expectations.
 * Tests schema validation, service contract, controller contract, and invariants.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Notifications Schema", () => {
    it("validates NotificationRecord with required fields", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationRecordSchema } = require("./notifications.schema");

        const valid = {
            id: "notif123",
            idempotencyKey: "notif:user123:job_dispatched:job456:12345",
            userId: "user123",
            type: "job_dispatched",
            title: "New Job",
            body: "You have a new job request",
            status: "pending",
            channelDeliveries: [],
            createdAt: new Date().toISOString(),
        };

        const result = NotificationRecordSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("rejects NotificationRecord without userId", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationRecordSchema } = require("./notifications.schema");

        const invalid = {
            id: "notif123",
            idempotencyKey: "key123",
            type: "job_dispatched",
            title: "New Job",
            body: "You have a new job request",
            status: "pending",
            channelDeliveries: [],
            createdAt: new Date().toISOString(),
        };

        const result = NotificationRecordSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it("validates all NotificationType values", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationTypeSchema } = require("./notifications.schema");

        expect(NotificationTypeSchema.safeParse("job_dispatched").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("job_confirmed").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("booking_confirmed").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("booking_cancelled").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("booking_requested").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("booking_host_reply").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("provider_reply").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("taxi_assigned").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("system_alert").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("general").success).toBe(true);
        expect(NotificationTypeSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates all NotificationChannel values", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationChannelSchema } = require("./notifications.schema");

        expect(NotificationChannelSchema.safeParse("in_app").success).toBe(true);
        expect(NotificationChannelSchema.safeParse("whatsapp").success).toBe(true);
        expect(NotificationChannelSchema.safeParse("push").success).toBe(true);
        expect(NotificationChannelSchema.safeParse("email").success).toBe(true);
        expect(NotificationChannelSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates ChannelDeliveryRecord", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ChannelDeliveryRecordSchema } = require("./notifications.schema");

        const valid = {
            channel: "whatsapp",
            status: "sent",
            attemptedAt: new Date().toISOString(),
            messageId: "SM123456789",
        };

        expect(ChannelDeliveryRecordSchema.safeParse(valid).success).toBe(true);
    });

    it("validates CreateNotificationInput", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { CreateNotificationInputSchema } = require("./notifications.schema");

        const valid = {
            userId: "user123",
            type: "job_dispatched",
            title: "New Job",
            body: "You have a new job request",
        };

        expect(CreateNotificationInputSchema.safeParse(valid).success).toBe(true);

        const missingUserId = {
            type: "job_dispatched",
            title: "New Job",
            body: "You have a new job request",
        };
        expect(CreateNotificationInputSchema.safeParse(missingUserId).success).toBe(false);

        const missingTitle = {
            userId: "user123",
            type: "job_dispatched",
            body: "You have a new job request",
        };
        expect(CreateNotificationInputSchema.safeParse(missingTitle).success).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Notifications Helpers", () => {
    it("derives deterministic idempotency key", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { deriveNotificationIdempotencyKey } = require("./notifications.schema");

        const key1 = deriveNotificationIdempotencyKey("user123", "job_dispatched", "job456");
        const key2 = deriveNotificationIdempotencyKey("user123", "job_dispatched", "job456");

        // Same inputs produce same key
        expect(key1).toBe(key2);

        // Different inputs produce different keys
        const key3 = deriveNotificationIdempotencyKey("user123", "job_confirmed", "job456");
        expect(key1).not.toBe(key3);
    });

    it("returns default channel priority", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getDefaultChannelPriority } = require("./notifications.schema");

        const priority = getDefaultChannelPriority();
        expect(priority).toContain("push");
        expect(priority).toContain("whatsapp");
        expect(priority).toContain("in_app");
        // Push should come first
        expect(priority.indexOf("push")).toBeLessThan(priority.indexOf("whatsapp"));
    });

    it("identifies high priority notification types", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { isHighPriorityType } = require("./notifications.schema");

        expect(isHighPriorityType("job_dispatched")).toBe(true);
        expect(isHighPriorityType("taxi_assigned")).toBe(true);
        expect(isHighPriorityType("system_alert")).toBe(true);
        expect(isHighPriorityType("general")).toBe(false);
        expect(isHighPriorityType("booking_confirmed")).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("NotificationsService Contract", () => {
    it("exposes idempotency methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationsService } = require("./notifications.service");

        expect(typeof NotificationsService.reserveIdempotency).toBe("function");
        expect(typeof NotificationsService.completeIdempotency).toBe("function");
        expect(typeof NotificationsService.getNotificationByIdempotency).toBe("function");
    });

    it("exposes CRUD methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationsService } = require("./notifications.service");

        expect(typeof NotificationsService.createNotification).toBe("function");
        expect(typeof NotificationsService.getNotification).toBe("function");
        expect(typeof NotificationsService.updateNotificationStatus).toBe("function");
        expect(typeof NotificationsService.addChannelDelivery).toBe("function");
        expect(typeof NotificationsService.markAsRead).toBe("function");
        expect(typeof NotificationsService.getNotificationsForUser).toBe("function");
        expect(typeof NotificationsService.getUnreadCount).toBe("function");
    });

    it("does NOT expose forbidden writes", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationsService } = require("./notifications.service");

        expect((NotificationsService as any).createUser).toBeUndefined();
        expect((NotificationsService as any).updateUser).toBeUndefined();
        expect((NotificationsService as any).createBooking).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("NotificationsController Contract", () => {
    it("exposes createAndSend method", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationsController } = require("./notifications.controller");

        expect(typeof NotificationsController.createAndSend).toBe("function");
    });

    it("exposes user query methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { NotificationsController } = require("./notifications.controller");

        expect(typeof NotificationsController.getMyNotifications).toBe("function");
        expect(typeof NotificationsController.markAsRead).toBe("function");
        expect(typeof NotificationsController.getUnreadCount).toBe("function");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONS EXPORT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Notifications Functions Exports", () => {
    it("exports getMyNotifications", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fn = require("./notifications.functions");
        expect(fn.getMyNotifications).toBeDefined();
    });

    it("exports markNotificationRead", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fn = require("./notifications.functions");
        expect(fn.markNotificationRead).toBeDefined();
    });

    it("exports getUnreadNotificationCount", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fn = require("./notifications.functions");
        expect(fn.getUnreadNotificationCount).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE BOUNDARY TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Notifications Module Boundaries", () => {
    it("does NOT export Firestore directly", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require("./notifications.service");
        expect((module as any).db).toBeUndefined();
        expect((module as any).firestore).toBeUndefined();
    });

    it("schema has NO Firebase imports", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const schemaSource = require("./notifications.schema");

        expect(schemaSource.NotificationRecordSchema).toBeDefined();
        expect((schemaSource as any).Timestamp).toBeUndefined();
        expect((schemaSource as any).FieldValue).toBeUndefined();
    });
});
