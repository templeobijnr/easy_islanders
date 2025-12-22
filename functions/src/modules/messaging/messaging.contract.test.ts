/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGING MODULE — CONTRACT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Contract tests that define the module's expectations.
 * Tests schema validation, service contract, controller contract, and invariants.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Messaging Schema", () => {
    it("validates InboundReceipt with required fields", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { InboundReceiptSchema } = require("./messaging.schema");

        const valid = {
            messageSid: "SM123456789",
            fromE164: "+1234567890",
            body: "Hello",
            receivedAt: new Date().toISOString(),
            status: "queued",
            attempts: 0,
        };

        const result = InboundReceiptSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("rejects InboundReceipt without messageSid", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { InboundReceiptSchema } = require("./messaging.schema");

        const invalid = {
            fromE164: "+1234567890",
            body: "Hello",
            receivedAt: new Date().toISOString(),
            status: "queued",
            attempts: 0,
        };

        const result = InboundReceiptSchema.safeParse(invalid);
        expect(result.success).toBe(false);
    });

    it("validates OutboundMessage with required fields", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { OutboundMessageSchema } = require("./messaging.schema");

        const valid = {
            id: "msg123",
            idempotencyKey: "wa:123:thread:freeform:12345",
            channel: "whatsapp",
            fromE164: "+1111111111",
            toE164: "+2222222222",
            body: "Hello",
            status: "pending",
            createdAt: new Date().toISOString(),
        };

        const result = OutboundMessageSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("validates all InboundStatus values", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { InboundStatusSchema } = require("./messaging.schema");

        expect(InboundStatusSchema.safeParse("queued").success).toBe(true);
        expect(InboundStatusSchema.safeParse("processing").success).toBe(true);
        expect(InboundStatusSchema.safeParse("processed").success).toBe(true);
        expect(InboundStatusSchema.safeParse("failed").success).toBe(true);
        expect(InboundStatusSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates all DeliveryStatus values", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { DeliveryStatusSchema } = require("./messaging.schema");

        expect(DeliveryStatusSchema.safeParse("pending").success).toBe(true);
        expect(DeliveryStatusSchema.safeParse("queued").success).toBe(true);
        expect(DeliveryStatusSchema.safeParse("sending").success).toBe(true);
        expect(DeliveryStatusSchema.safeParse("sent").success).toBe(true);
        expect(DeliveryStatusSchema.safeParse("delivered").success).toBe(true);
        expect(DeliveryStatusSchema.safeParse("undelivered").success).toBe(true);
        expect(DeliveryStatusSchema.safeParse("failed").success).toBe(true);
        expect(DeliveryStatusSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates MessageCorrelation with thread correlation", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessageCorrelationSchema } = require("./messaging.schema");

        const valid = {
            id: "corr123",
            channel: "whatsapp",
            fromE164: "+1234567890",
            direction: "inbound",
            messageSid: "SM123456789",
            threadId: "thread123",
            correlationType: "thread",
            createdAt: new Date().toISOString(),
        };

        const result = MessageCorrelationSchema.safeParse(valid);
        expect(result.success).toBe(true);
    });

    it("validates SendMessageInput", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { SendMessageInputSchema } = require("./messaging.schema");

        const valid = {
            to: "+1234567890",
            body: "Hello world",
        };

        expect(SendMessageInputSchema.safeParse(valid).success).toBe(true);

        const missingTo = { body: "Hello" };
        expect(SendMessageInputSchema.safeParse(missingTo).success).toBe(false);

        const missingBody = { to: "+1234567890" };
        expect(SendMessageInputSchema.safeParse(missingBody).success).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY HELPER TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Messaging Helpers", () => {
    it("derives deterministic idempotency key", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { deriveOutboundIdempotencyKey } = require("./messaging.schema");

        const key1 = deriveOutboundIdempotencyKey("+1234567890", "thread1", "template1");
        const key2 = deriveOutboundIdempotencyKey("+1234567890", "thread1", "template1");

        // Same inputs produce same key
        expect(key1).toBe(key2);

        // Different inputs produce different keys
        const key3 = deriveOutboundIdempotencyKey("+1234567890", "thread2", "template1");
        expect(key1).not.toBe(key3);
    });

    it("maps Twilio status correctly", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { mapTwilioStatus } = require("./messaging.schema");

        expect(mapTwilioStatus("queued")).toBe("queued");
        expect(mapTwilioStatus("sending")).toBe("sending");
        expect(mapTwilioStatus("sent")).toBe("sent");
        expect(mapTwilioStatus("delivered")).toBe("delivered");
        expect(mapTwilioStatus("undelivered")).toBe("undelivered");
        expect(mapTwilioStatus("failed")).toBe("failed");
        expect(mapTwilioStatus("DELIVERED")).toBe("delivered"); // Case insensitive
        expect(mapTwilioStatus("unknown")).toBe("pending"); // Default
    });

    it("identifies terminal statuses", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { isTerminalStatus } = require("./messaging.schema");

        expect(isTerminalStatus("delivered")).toBe(true);
        expect(isTerminalStatus("failed")).toBe(true);
        expect(isTerminalStatus("undelivered")).toBe(true);
        expect(isTerminalStatus("pending")).toBe(false);
        expect(isTerminalStatus("sent")).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("MessagingService Contract", () => {
    it("exposes inbound receipt methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessagingService } = require("./messaging.service");

        expect(typeof MessagingService.createInboundReceiptIdempotent).toBe("function");
        expect(typeof MessagingService.getInboundReceipt).toBe("function");
        expect(typeof MessagingService.markInboundProcessing).toBe("function");
        expect(typeof MessagingService.markInboundProcessed).toBe("function");
        expect(typeof MessagingService.markInboundFailed).toBe("function");
    });

    it("exposes outbound message methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessagingService } = require("./messaging.service");

        expect(typeof MessagingService.reserveOutboundIdempotency).toBe("function");
        expect(typeof MessagingService.getOutboundByIdempotency).toBe("function");
        expect(typeof MessagingService.createOutboundPending).toBe("function");
        expect(typeof MessagingService.markOutboundSent).toBe("function");
        expect(typeof MessagingService.markOutboundDelivered).toBe("function");
        expect(typeof MessagingService.markOutboundFailed).toBe("function");
        expect(typeof MessagingService.updateOutboundStatus).toBe("function");
    });

    it("exposes correlation methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessagingService } = require("./messaging.service");

        expect(typeof MessagingService.upsertCorrelation).toBe("function");
        expect(typeof MessagingService.getCorrelation).toBe("function");
        expect(typeof MessagingService.findRecentCorrelationsForPhone).toBe("function");
    });

    it("does NOT expose forbidden writes", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessagingService } = require("./messaging.service");

        expect((MessagingService as any).createUser).toBeUndefined();
        expect((MessagingService as any).updateUser).toBeUndefined();
        expect((MessagingService as any).createBooking).toBeUndefined();
        expect((MessagingService as any).createListing).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("MessagingController Contract", () => {
    it("exposes webhook handlers", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessagingController } = require("./messaging.controller");

        expect(typeof MessagingController.handleTwilioInboundWebhook).toBe("function");
        expect(typeof MessagingController.handleTwilioStatusCallback).toBe("function");
    });

    it("exposes task processor", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessagingController } = require("./messaging.controller");

        expect(typeof MessagingController.processWhatsAppInboundTask).toBe("function");
    });

    it("exposes idempotent send", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { MessagingController } = require("./messaging.controller");

        expect(typeof MessagingController.sendWhatsAppIdempotent).toBe("function");
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONS EXPORT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Messaging Functions Exports", () => {
    it("exports twilioInboundWebhook", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fn = require("./messaging.functions");
        expect(fn.twilioInboundWebhook).toBeDefined();
    });

    it("exports twilioStatusWebhook", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fn = require("./messaging.functions");
        expect(fn.twilioStatusWebhook).toBeDefined();
    });

    it("exports processWhatsAppInbound", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fn = require("./messaging.functions");
        expect(fn.processWhatsAppInbound).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// MODULE BOUNDARY TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Messaging Module Boundaries", () => {
    it("does NOT export Firestore directly", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const module = require("./messaging.service");
        expect((module as any).db).toBeUndefined();
        expect((module as any).firestore).toBeUndefined();
    });

    it("schema has NO Firebase imports", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const schemaSource = require("./messaging.schema");

        // All exports should be pure (no Timestamp, no FieldValue)
        expect(schemaSource.InboundReceiptSchema).toBeDefined();
        expect((schemaSource as any).Timestamp).toBeUndefined();
        expect((schemaSource as any).FieldValue).toBeUndefined();
    });
});
