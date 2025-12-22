/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MESSAGING MODULE — INTEGRATION TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Integration tests that require Firebase emulator.
 * Run with: pnpm test:emulator
 *
 * Skipped automatically when FIRESTORE_EMULATOR_HOST is not set.
 */

const hasEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

const describeIfEmulator = hasEmulator ? describe : describe.skip;

describeIfEmulator("Messaging Integration Tests", () => {
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
    // INBOUND RECEIPT TESTS
    // ─────────────────────────────────────────────────────────────────────────

    it("creates inbound receipt idempotently", async () => {
        const { MessagingService } = await import("./messaging.service");

        const input = {
            messageSid: `SM${Date.now()}`,
            fromE164: "+1234567890",
            toE164: "+0987654321",
            body: "Test message",
            mediaUrls: [],
        };

        // First call creates
        const result1 = await MessagingService.createInboundReceiptIdempotent(input);
        expect(result1.created).toBe(true);
        expect(result1.receipt.status).toBe("queued");

        // Second call is no-op
        const result2 = await MessagingService.createInboundReceiptIdempotent(input);
        expect(result2.created).toBe(false);
        expect(result2.receipt.messageSid).toBe(input.messageSid);
    });

    it("transitions inbound status correctly", async () => {
        const { MessagingService } = await import("./messaging.service");

        const messageSid = `SM${Date.now()}_trans`;

        // Create
        await MessagingService.createInboundReceiptIdempotent({
            messageSid,
            fromE164: "+1234567890",
            toE164: "+0987654321",
            body: "Test message",
            mediaUrls: [],
        });

        // Mark processing
        const canProcess = await MessagingService.markInboundProcessing(messageSid);
        expect(canProcess).toBe(true);

        // Second attempt should fail (already processing)
        const canProcessAgain = await MessagingService.markInboundProcessing(messageSid);
        expect(canProcessAgain).toBe(false);

        // Mark processed
        await MessagingService.markInboundProcessed(messageSid, {
            threadId: "thread123",
            route: "consumer",
        });

        // Verify final state
        const receipt = await MessagingService.getInboundReceipt(messageSid);
        expect(receipt?.status).toBe("processed");
    });

    // ─────────────────────────────────────────────────────────────────────────
    // OUTBOUND IDEMPOTENCY TESTS
    // ─────────────────────────────────────────────────────────────────────────

    it("reserves outbound idempotency key", async () => {
        const { MessagingService } = await import("./messaging.service");

        const key = `idem:${Date.now()}`;

        const result1 = await MessagingService.reserveOutboundIdempotency(key);
        expect(result1.reserved).toBe(true);

        const result2 = await MessagingService.reserveOutboundIdempotency(key);
        expect(result2.reserved).toBe(false);
    });

    it("prevents duplicate outbound sends", async () => {
        const { MessagingService } = await import("./messaging.service");

        const key = `idem:send:${Date.now()}`;

        // Reserve
        await MessagingService.reserveOutboundIdempotency(key);

        // Create outbound
        const msg = await MessagingService.createOutboundPending({
            idempotencyKey: key,
            fromE164: "+0987654321",
            toE164: "+1234567890",
            body: "Hello!",
        });

        // Get by idempotency should return same message
        const existing = await MessagingService.getOutboundByIdempotency(key);
        expect(existing?.id).toBe(msg.id);
    });
});
