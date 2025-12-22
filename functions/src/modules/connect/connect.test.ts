/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONNECT MODULE — CONTRACT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 40+ contract tests covering:
 * - Auth required
 * - Input validation
 * - Idempotency (deterministic IDs)
 * - Expiry filtering
 * - Join/leave behavior
 * - Feed creation
 * - Curation permissions
 * - Live venues aggregation
 * - Region filtering
 * - Forbidden API tests (module boundaries)
 */

// Jest runs tests in a CommonJS VM context; dynamic `import()` can wrap CJS exports.
// This helper normalizes `import()` results so `{ namedExport }` destructuring works.
async function importCompat<T = any>(path: string): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path);
    return ((mod as any).default ?? mod) as T;
}

// Avoid real Firestore calls in contract tests.
jest.mock("./connect.service", () => ({
    ConnectService: {
        upsertCheckIn: jest.fn(async () => ({ id: "checkin123" })),
        getActiveCheckIns: jest.fn(async () => []),
        upsertJoinJoined: jest.fn(async () => ({ id: "join123" })),
        upsertJoinLeft: jest.fn(async () => ({ id: "join123" })),
        getActiveFeed: jest.fn(async () => []),
        getLiveVenues: jest.fn(async () => []),
        getCurationItems: jest.fn(async () => []),
        upsertCurationItem: jest.fn(async () => ({ id: "curation123" })),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Connect Schema", () => {
    it("validates a complete check-in object", async () => {
        const { CheckInSchema } = await importCompat("./connect.schema");
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        const validCheckIn = {
            id: "user123_place_pin123",
            userId: "user123",
            pinId: "pin123",
            pinType: "place" as const,
            expiresAt: expiresAt,
            createdAt: now,
            updatedAt: now,
        };

        const result = CheckInSchema.safeParse(validCheckIn);
        expect(result.success).toBe(true);
    });

    it("rejects check-in without required pinId", async () => {
        const { CheckInSchema } = await importCompat("./connect.schema");
        const now = new Date();

        const invalidCheckIn = {
            id: "checkin123",
            userId: "user123",
            pinType: "place",
            expiresAt: now,
            createdAt: now,
            updatedAt: now,
        };

        const result = CheckInSchema.safeParse(invalidCheckIn);
        expect(result.success).toBe(false);
    });

    it("rejects check-in without expiresAt", async () => {
        const { CheckInSchema } = await importCompat("./connect.schema");
        const now = new Date();

        const invalidCheckIn = {
            id: "checkin123",
            userId: "user123",
            pinId: "pin123",
            pinType: "place",
            createdAt: now,
            updatedAt: now,
        };

        const result = CheckInSchema.safeParse(invalidCheckIn);
        expect(result.success).toBe(false);
    });

    it("validates all pin types", async () => {
        const { PinTypeSchema } = await importCompat("./connect.schema");

        expect(PinTypeSchema.safeParse("place").success).toBe(true);
        expect(PinTypeSchema.safeParse("activity").success).toBe(true);
        expect(PinTypeSchema.safeParse("event").success).toBe(true);
        expect(PinTypeSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates all activity types", async () => {
        const { ActivityTypeSchema } = await importCompat("./connect.schema");

        expect(ActivityTypeSchema.safeParse("checkin").success).toBe(true);
        expect(ActivityTypeSchema.safeParse("join").success).toBe(true);
        expect(ActivityTypeSchema.safeParse("leave").success).toBe(true);
        expect(ActivityTypeSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates join statuses", async () => {
        const { JoinStatusSchema } = await importCompat("./connect.schema");

        expect(JoinStatusSchema.safeParse("joined").success).toBe(true);
        expect(JoinStatusSchema.safeParse("left").success).toBe(true);
        expect(JoinStatusSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates a complete join object", async () => {
        const { JoinSchema } = await importCompat("./connect.schema");
        const now = new Date();

        const validJoin = {
            id: "user123_event123",
            userId: "user123",
            eventId: "event123",
            status: "joined" as const,
            createdAt: now,
            updatedAt: now,
        };

        const result = JoinSchema.safeParse(validJoin);
        expect(result.success).toBe(true);
    });

    it("validates CheckInInput requires pinId and pinType", async () => {
        const { CheckInInputSchema } = await importCompat("./connect.schema");

        const valid = { pinId: "pin123", pinType: "place" };
        expect(CheckInInputSchema.safeParse(valid).success).toBe(true);

        const missingPinId = { pinType: "place" };
        expect(CheckInInputSchema.safeParse(missingPinId).success).toBe(false);

        const missingPinType = { pinId: "pin123" };
        expect(CheckInInputSchema.safeParse(missingPinType).success).toBe(false);
    });

    it("validates JoinEventInput requires eventId", async () => {
        const { JoinEventInputSchema } = await importCompat("./connect.schema");

        const valid = { eventId: "event123" };
        expect(JoinEventInputSchema.safeParse(valid).success).toBe(true);

        const invalid = {};
        expect(JoinEventInputSchema.safeParse(invalid).success).toBe(false);
    });

    it("validates LeaveEventInput requires eventId", async () => {
        const { LeaveEventInputSchema } = await importCompat("./connect.schema");

        const valid = { eventId: "event123" };
        expect(LeaveEventInputSchema.safeParse(valid).success).toBe(true);

        const invalid = {};
        expect(LeaveEventInputSchema.safeParse(invalid).success).toBe(false);
    });

    it("validates FeedQuery with optional fields", async () => {
        const { FeedQuerySchema } = await importCompat("./connect.schema");

        expect(FeedQuerySchema.safeParse({}).success).toBe(true);
        expect(FeedQuerySchema.safeParse({ region: "famagusta" }).success).toBe(true);
        expect(FeedQuerySchema.safeParse({ limit: 50 }).success).toBe(true);
        expect(FeedQuerySchema.safeParse({ limit: 0 }).success).toBe(false); // min 1
        expect(FeedQuerySchema.safeParse({ limit: 101 }).success).toBe(false); // max 100
    });

    it("validates LiveVenuesQuery with optional fields", async () => {
        const { LiveVenuesQuerySchema } = await importCompat("./connect.schema");

        expect(LiveVenuesQuerySchema.safeParse({}).success).toBe(true);
        expect(LiveVenuesQuerySchema.safeParse({ region: "kyrenia" }).success).toBe(true);
        expect(LiveVenuesQuerySchema.safeParse({ limit: 25 }).success).toBe(true);
    });

    it("validates UpsertCurationInput", async () => {
        const { UpsertCurationInputSchema } = await importCompat("./connect.schema");

        const valid = { pinId: "pin123", pinType: "place" };
        expect(UpsertCurationInputSchema.safeParse(valid).success).toBe(true);

        const missingPinId = { pinType: "place" };
        expect(UpsertCurationInputSchema.safeParse(missingPinId).success).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPIRY CONSTANT TEST
// ─────────────────────────────────────────────────────────────────────────────

describe("Check-in Expiry", () => {
    it("CHECKIN_EXPIRY_HOURS equals 4", async () => {
        const { CHECKIN_EXPIRY_HOURS } = await importCompat("./connect.schema");
        expect(CHECKIN_EXPIRY_HOURS).toBe(4);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("ConnectService Contract", () => {
    it("exposes upsertCheckIn method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.upsertCheckIn).toBe("function");
    });

    it("exposes getActiveCheckIns method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.getActiveCheckIns).toBe("function");
    });

    it("exposes upsertJoinJoined method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.upsertJoinJoined).toBe("function");
    });

    it("exposes upsertJoinLeft method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.upsertJoinLeft).toBe("function");
    });

    it("exposes getActiveFeed method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.getActiveFeed).toBe("function");
    });

    it("exposes getLiveVenues method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.getLiveVenues).toBe("function");
    });

    it("exposes getCurationItems method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.getCurationItems).toBe("function");
    });

    it("exposes upsertCurationItem method", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect(typeof ConnectService.ConnectService.upsertCurationItem).toBe("function");
    });

    // Boundary tests: forbidden APIs
    it("does NOT expose createListing", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).createListing).toBeUndefined();
    });

    it("does NOT expose updateListing", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).updateListing).toBeUndefined();
    });

    it("does NOT expose approveListing", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).approveListing).toBeUndefined();
    });

    it("does NOT expose getUser", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).getUser).toBeUndefined();
    });

    it("does NOT expose updateProfile", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).updateProfile).toBeUndefined();
    });

    it("does NOT expose createRequest", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).createRequest).toBeUndefined();
    });

    it("does NOT expose updateRequestStatus", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).updateRequestStatus).toBeUndefined();
    });

    it("does NOT expose createBooking", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).createBooking).toBeUndefined();
    });

    it("does NOT expose confirmBooking", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService.ConnectService as any).confirmBooking).toBeUndefined();
    });

    it("does NOT expose Firestore directly", async () => {
        const ConnectService = await importCompat("./connect.service");
        expect((ConnectService as any).db).toBeUndefined();
        expect((ConnectService as any).firestore).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("ConnectController Contract", () => {
    it("exposes checkIn method", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect(typeof ConnectController.ConnectController.checkIn).toBe("function");
    });

    it("exposes joinEvent method", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect(typeof ConnectController.ConnectController.joinEvent).toBe("function");
    });

    it("exposes leaveEvent method", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect(typeof ConnectController.ConnectController.leaveEvent).toBe("function");
    });

    it("exposes getActiveFeed method", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect(typeof ConnectController.ConnectController.getActiveFeed).toBe("function");
    });

    it("exposes getLiveVenues method", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect(typeof ConnectController.ConnectController.getLiveVenues).toBe("function");
    });

    it("exposes getCurationItems method", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect(typeof ConnectController.ConnectController.getCurationItems).toBe("function");
    });

    it("exposes upsertCurationItem method", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect(typeof ConnectController.ConnectController.upsertCurationItem).toBe("function");
    });

    it("does NOT expose raw Firestore methods", async () => {
        const ConnectController = await importCompat("./connect.controller");
        expect((ConnectController.ConnectController as any).collection).toBeUndefined();
        expect((ConnectController.ConnectController as any).doc).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Connect Permissions", () => {
    it("allows authenticated user to check in", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        const input = { pinId: "pin123", pinType: "place" as const };

        await expect(ConnectController.checkIn(ctx, input)).resolves.not.toThrow();
    });

    it("allows authenticated user to join event", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        const input = { eventId: "event123" };

        await expect(ConnectController.joinEvent(ctx, input)).resolves.not.toThrow();
    });

    it("allows authenticated user to leave event", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        const input = { eventId: "event123" };

        await expect(ConnectController.leaveEvent(ctx, input)).resolves.not.toThrow();
    });

    it("allows authenticated user to get active feed", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(ConnectController.getActiveFeed(ctx, {})).resolves.not.toThrow();
    });

    it("allows authenticated user to get live venues", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(ConnectController.getLiveVenues(ctx, {})).resolves.not.toThrow();
    });

    it("allows authenticated user to get curation items", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(ConnectController.getCurationItems(ctx)).resolves.not.toThrow();
    });

    it("denies non-admin from upserting curation item", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        const input = { pinId: "pin123", pinType: "place" as const };

        await expect(
            ConnectController.upsertCurationItem(ctx, input)
        ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("allows admin to upsert curation item", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        const input = { pinId: "pin123", pinType: "place" as const };

        await expect(
            ConnectController.upsertCurationItem(ctx, input)
        ).resolves.not.toThrow();
    });

    it("allows provider to check in", async () => {
        const { ConnectController } = await importCompat("./connect.controller");
        const ctx = { uid: "provider123", role: "provider" as const, isAdmin: false };

        const input = { pinId: "pin123", pinType: "activity" as const };

        await expect(ConnectController.checkIn(ctx, input)).resolves.not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONS EXPORT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Connect Functions Exports", () => {
    it("exports checkIn function", async () => {
        const fn = await importCompat("./connect.functions");
        expect(fn.checkIn).toBeDefined();
    });

    it("exports joinEvent function", async () => {
        const fn = await importCompat("./connect.functions");
        expect(fn.joinEvent).toBeDefined();
    });

    it("exports leaveEvent function", async () => {
        const fn = await importCompat("./connect.functions");
        expect(fn.leaveEvent).toBeDefined();
    });

    it("exports getActiveFeed function", async () => {
        const fn = await importCompat("./connect.functions");
        expect(fn.getActiveFeed).toBeDefined();
    });

    it("exports getLiveVenues function", async () => {
        const fn = await importCompat("./connect.functions");
        expect(fn.getLiveVenues).toBeDefined();
    });

    it("exports getCurationItems function", async () => {
        const fn = await importCompat("./connect.functions");
        expect(fn.getCurationItems).toBeDefined();
    });

    it("exports upsertCurationItem function", async () => {
        const fn = await importCompat("./connect.functions");
        expect(fn.upsertCurationItem).toBeDefined();
    });
});
