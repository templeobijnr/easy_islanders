/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BOOKINGS MODULE — CONTRACT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Written BEFORE implementation.
 * Defines the contract that service/controller must fulfill.
 */

async function importCompat<T = any>(path: string): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path);
    return ((mod as any).default ?? mod) as T;
}

// Avoid real Firestore calls in contract tests.
jest.mock("./bookings.service", () => ({
    BookingsService: {
        getBooking: jest.fn(async (bookingId: string) => {
            const status = bookingId === "bookingConfirmed" ? "confirmed" : "pending";
            return {
                id: bookingId,
                userId: "user123",
                type: "reservation",
                status,
                itemTitle: "Mock Booking",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }),
        createBooking: jest.fn(async () => "booking123"),
        getBookingsForUser: jest.fn(async () => []),
        updateBookingStatus: jest.fn(async (bookingId: string) => ({
            id: bookingId,
            userId: "user123",
            type: "reservation",
            status: "confirmed",
            itemTitle: "Mock Booking",
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        getBookingUserId: jest.fn(async () => "user123"),
        getBookingStatus: jest.fn(async () => "pending"),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Bookings Schema", () => {
    it("validates a complete booking object", async () => {
        const { BookingSchema } = await importCompat("./bookings.schema");

        const validBooking = {
            id: "booking123",
            userId: "user123",
            type: "reservation" as const,
            status: "pending" as const,
            itemTitle: "Table for 2",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = BookingSchema.safeParse(validBooking);
        expect(result.success).toBe(true);
    });

    it("rejects booking without required userId", async () => {
        const { BookingSchema } = await importCompat("./bookings.schema");

        const invalidBooking = {
            id: "booking123",
            type: "reservation",
            status: "pending",
            itemTitle: "Table for 2",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = BookingSchema.safeParse(invalidBooking);
        expect(result.success).toBe(false);
    });

    it("rejects booking without required itemTitle", async () => {
        const { BookingSchema } = await importCompat("./bookings.schema");

        const invalidBooking = {
            id: "booking123",
            userId: "user123",
            type: "reservation",
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = BookingSchema.safeParse(invalidBooking);
        expect(result.success).toBe(false);
    });

    it("validates all booking types", async () => {
        const { BookingTypeSchema } = await importCompat("./bookings.schema");

        expect(BookingTypeSchema.safeParse("reservation").success).toBe(true);
        expect(BookingTypeSchema.safeParse("order").success).toBe(true);
        expect(BookingTypeSchema.safeParse("viewing").success).toBe(true);
        expect(BookingTypeSchema.safeParse("booking").success).toBe(true);
        expect(BookingTypeSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates all booking statuses", async () => {
        const { BookingStatusSchema } = await importCompat("./bookings.schema");

        expect(BookingStatusSchema.safeParse("pending").success).toBe(true);
        expect(BookingStatusSchema.safeParse("confirmed").success).toBe(true);
        expect(BookingStatusSchema.safeParse("completed").success).toBe(true);
        expect(BookingStatusSchema.safeParse("cancelled").success).toBe(true);
        expect(BookingStatusSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates CreateBookingInput requires type and itemTitle", async () => {
        const { CreateBookingInputSchema } = await importCompat("./bookings.schema");

        const valid = { type: "reservation", itemTitle: "Table for 2" };
        expect(CreateBookingInputSchema.safeParse(valid).success).toBe(true);

        const missingType = { itemTitle: "Table for 2" };
        expect(CreateBookingInputSchema.safeParse(missingType).success).toBe(false);

        const missingTitle = { type: "reservation" };
        expect(CreateBookingInputSchema.safeParse(missingTitle).success).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Booking Status Transitions", () => {
    it("allows pending → confirmed", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("pending", "confirmed")).toBe(true);
    });

    it("allows pending → cancelled", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("pending", "cancelled")).toBe(true);
    });

    it("allows confirmed → completed", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("confirmed", "completed")).toBe(true);
    });

    it("allows confirmed → cancelled", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("confirmed", "cancelled")).toBe(true);
    });

    it("rejects pending → completed (must confirm first)", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("pending", "completed")).toBe(false);
    });

    it("rejects completed → cancelled (terminal state)", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("completed", "cancelled")).toBe(false);
    });

    it("rejects cancelled → anything (terminal state)", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("cancelled", "pending")).toBe(false);
        expect(isValidBookingStatusTransition("cancelled", "confirmed")).toBe(false);
        expect(isValidBookingStatusTransition("cancelled", "completed")).toBe(false);
    });

    it("rejects confirmed → pending (no backward transitions)", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("confirmed", "pending")).toBe(false);
    });

    it("rejects completed → pending (no backward transitions)", async () => {
        const { isValidBookingStatusTransition } = await importCompat("./bookings.schema");
        expect(isValidBookingStatusTransition("completed", "pending")).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("BookingsService Contract", () => {
    it("exposes getBooking method", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect(typeof BookingsService.BookingsService.getBooking).toBe("function");
    });

    it("exposes createBooking method", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect(typeof BookingsService.BookingsService.createBooking).toBe("function");
    });

    it("exposes getBookingsForUser method", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect(typeof BookingsService.BookingsService.getBookingsForUser).toBe("function");
    });

    it("exposes updateBookingStatus method", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect(typeof BookingsService.BookingsService.updateBookingStatus).toBe("function");
    });

    it("does NOT expose createRequest on BookingsService", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect((BookingsService.BookingsService as any).createRequest).toBeUndefined();
    });

    it("does NOT expose createListing on BookingsService", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect((BookingsService.BookingsService as any).createListing).toBeUndefined();
    });

    it("does NOT expose getUser on BookingsService", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect((BookingsService.BookingsService as any).getUser).toBeUndefined();
    });

    it("does NOT expose checkIn on BookingsService", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect((BookingsService.BookingsService as any).checkIn).toBeUndefined();
    });

    it("does NOT expose Firestore directly", async () => {
        const BookingsService = await importCompat("./bookings.service");
        expect((BookingsService as any).db).toBeUndefined();
        expect((BookingsService as any).firestore).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("BookingsController Contract", () => {
    it("exposes getBooking method", async () => {
        const BookingsController = await importCompat("./bookings.controller");
        expect(typeof BookingsController.BookingsController.getBooking).toBe("function");
    });

    it("exposes createBooking method", async () => {
        const BookingsController = await importCompat("./bookings.controller");
        expect(typeof BookingsController.BookingsController.createBooking).toBe("function");
    });

    it("exposes confirmBooking method", async () => {
        const BookingsController = await importCompat("./bookings.controller");
        expect(typeof BookingsController.BookingsController.confirmBooking).toBe("function");
    });

    it("exposes completeBooking method", async () => {
        const BookingsController = await importCompat("./bookings.controller");
        expect(typeof BookingsController.BookingsController.completeBooking).toBe("function");
    });

    it("exposes cancelBooking method", async () => {
        const BookingsController = await importCompat("./bookings.controller");
        expect(typeof BookingsController.BookingsController.cancelBooking).toBe("function");
    });

    it("does NOT expose raw Firestore methods", async () => {
        const BookingsController = await importCompat("./bookings.controller");
        expect((BookingsController.BookingsController as any).collection).toBeUndefined();
        expect((BookingsController.BookingsController as any).doc).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Bookings Permissions", () => {
    it("allows authenticated user to create booking", async () => {
        const { BookingsController } = await importCompat("./bookings.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        const input = {
            type: "reservation" as const,
            itemTitle: "Table for 2",
        };

        await expect(BookingsController.createBooking(ctx, input)).resolves.not.toThrow();
    });

    it("allows user to view their own booking", async () => {
        const { BookingsController } = await importCompat("./bookings.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(BookingsController.getBooking(ctx, "booking123")).resolves.not.toThrow();
    });

    it("allows admin to view any booking", async () => {
        const { BookingsController } = await importCompat("./bookings.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        await expect(BookingsController.getBooking(ctx, "anyBooking")).resolves.not.toThrow();
    });

    it("allows user to cancel their own booking", async () => {
        const { BookingsController } = await importCompat("./bookings.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(
            BookingsController.cancelBooking(ctx, "booking123", {})
        ).resolves.not.toThrow();
    });

    it("allows admin to confirm any booking", async () => {
        const { BookingsController } = await importCompat("./bookings.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        await expect(
            BookingsController.confirmBooking(ctx, "booking123")
        ).resolves.not.toThrow();
    });

    it("allows admin to complete any booking", async () => {
        const { BookingsController } = await importCompat("./bookings.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        await expect(
            BookingsController.completeBooking(ctx, "bookingConfirmed")
        ).resolves.not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONS EXPORT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Bookings Functions Exports", () => {
    it("exports createBooking function", async () => {
        const fn = await importCompat("./bookings.functions");
        expect(fn.createBooking).toBeDefined();
    });

    it("exports getBooking function", async () => {
        const fn = await importCompat("./bookings.functions");
        expect(fn.getBooking).toBeDefined();
    });

    it("exports getMyBookings function", async () => {
        const fn = await importCompat("./bookings.functions");
        expect(fn.getMyBookings).toBeDefined();
    });

    it("exports confirmBooking function", async () => {
        const fn = await importCompat("./bookings.functions");
        expect(fn.confirmBooking).toBeDefined();
    });

    it("exports completeBooking function", async () => {
        const fn = await importCompat("./bookings.functions");
        expect(fn.completeBooking).toBeDefined();
    });

    it("exports cancelBooking function", async () => {
        const fn = await importCompat("./bookings.functions");
        expect(fn.cancelBooking).toBeDefined();
    });
});
