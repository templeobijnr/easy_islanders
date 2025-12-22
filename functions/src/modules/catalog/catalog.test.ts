/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOG MODULE — CONTRACT TESTS
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
jest.mock("./catalog.service", () => ({
    CatalogService: {
        getListing: jest.fn(async (listingId: string) => ({
            id: listingId,
            title: "Mock Listing",
            description: "Mock",
            type: "place",
            category: "restaurant",
            region: "kyrenia",
            coordinates: { lat: 35.3, lng: 33.3 },
            status: "approved",
            approved: true,
            showOnMap: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        createListing: jest.fn(async () => "listing123"),
        updateListing: jest.fn(async (listingId: string) => ({
            id: listingId,
            title: "Updated",
            description: null,
            type: "place",
            category: "restaurant",
            region: "kyrenia",
            coordinates: { lat: 35.3, lng: 33.3 },
            status: "approved",
            approved: true,
            showOnMap: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        approveListing: jest.fn(async (listingId: string) => ({
            id: listingId,
        })),
        getListings: jest.fn(async () => []),
        getListingOwnerId: jest.fn(async () => "provider123"),
        queryListings: jest.fn(async () => []),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Catalog Schema", () => {
    it("validates a complete listing object", async () => {
        const { ListingSchema } = await importCompat("./catalog.schema");

        const validListing = {
            id: "listing123",
            title: "Great Restaurant",
            description: "A lovely place to eat",
            type: "place" as const,
            category: "restaurant",
            region: "kyrenia",
            coordinates: { lat: 35.3, lng: 33.3 },
            status: "approved" as const,
            approved: true,
            showOnMap: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = ListingSchema.safeParse(validListing);
        expect(result.success).toBe(true);
    });

    it("rejects listing without required title", async () => {
        const { ListingSchema } = await importCompat("./catalog.schema");

        const invalidListing = {
            id: "listing123",
            type: "place",
            category: "restaurant",
            region: "kyrenia",
            coordinates: { lat: 35.3, lng: 33.3 },
            status: "approved",
            approved: true,
            showOnMap: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = ListingSchema.safeParse(invalidListing);
        expect(result.success).toBe(false);
    });

    it("rejects listing without required coordinates", async () => {
        const { ListingSchema } = await importCompat("./catalog.schema");

        const invalidListing = {
            id: "listing123",
            title: "Great Restaurant",
            type: "place",
            category: "restaurant",
            region: "kyrenia",
            status: "approved",
            approved: true,
            showOnMap: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = ListingSchema.safeParse(invalidListing);
        expect(result.success).toBe(false);
    });

    it("validates all listing types", async () => {
        const { ListingTypeSchema } = await importCompat("./catalog.schema");

        expect(ListingTypeSchema.safeParse("place").success).toBe(true);
        expect(ListingTypeSchema.safeParse("activity").success).toBe(true);
        expect(ListingTypeSchema.safeParse("event").success).toBe(true);
        expect(ListingTypeSchema.safeParse("stay").success).toBe(true);
        expect(ListingTypeSchema.safeParse("experience").success).toBe(true);
        expect(ListingTypeSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates all listing statuses", async () => {
        const { ListingStatusSchema } = await importCompat("./catalog.schema");

        expect(ListingStatusSchema.safeParse("draft").success).toBe(true);
        expect(ListingStatusSchema.safeParse("pending").success).toBe(true);
        expect(ListingStatusSchema.safeParse("approved").success).toBe(true);
        expect(ListingStatusSchema.safeParse("rejected").success).toBe(true);
        expect(ListingStatusSchema.safeParse("archived").success).toBe(true);
        expect(ListingStatusSchema.safeParse("invalid").success).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("CatalogService Contract", () => {
    it("exposes getListing method", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect(typeof CatalogService.CatalogService.getListing).toBe("function");
    });

    it("exposes createListing method", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect(typeof CatalogService.CatalogService.createListing).toBe("function");
    });

    it("exposes updateListing method", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect(typeof CatalogService.CatalogService.updateListing).toBe("function");
    });

    it("exposes getListings method", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect(typeof CatalogService.CatalogService.getListings).toBe("function");
    });

    it("exposes approveListing method", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect(typeof CatalogService.CatalogService.approveListing).toBe("function");
    });

    it("does NOT expose user profile APIs", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect((CatalogService.CatalogService as any).getUser).toBeUndefined();
        expect((CatalogService.CatalogService as any).createUser).toBeUndefined();
        expect((CatalogService.CatalogService as any).updateUser).toBeUndefined();
    });

    it("does NOT expose booking APIs", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect((CatalogService.CatalogService as any).createBooking).toBeUndefined();
        expect((CatalogService.CatalogService as any).getBooking).toBeUndefined();
    });

    it("does NOT expose request APIs", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect((CatalogService.CatalogService as any).createRequest).toBeUndefined();
        expect((CatalogService.CatalogService as any).getRequest).toBeUndefined();
    });

    it("does NOT expose Firestore directly", async () => {
        const CatalogService = await importCompat("./catalog.service");
        expect((CatalogService as any).db).toBeUndefined();
        expect((CatalogService as any).firestore).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("CatalogController Contract", () => {
    it("exposes getListing method", async () => {
        const CatalogController = await importCompat("./catalog.controller");
        expect(typeof CatalogController.CatalogController.getListing).toBe("function");
    });

    it("exposes createListing method", async () => {
        const CatalogController = await importCompat("./catalog.controller");
        expect(typeof CatalogController.CatalogController.createListing).toBe("function");
    });

    it("exposes updateListing method", async () => {
        const CatalogController = await importCompat("./catalog.controller");
        expect(typeof CatalogController.CatalogController.updateListing).toBe("function");
    });

    it("exposes approveListing method", async () => {
        const CatalogController = await importCompat("./catalog.controller");
        expect(typeof CatalogController.CatalogController.approveListing).toBe("function");
    });

    it("does NOT expose raw Firestore methods", async () => {
        const CatalogController = await importCompat("./catalog.controller");
        expect((CatalogController.CatalogController as any).collection).toBeUndefined();
        expect((CatalogController.CatalogController as any).doc).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Catalog Permissions", () => {
    it("allows anyone to get an approved listing", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        // Should not throw for approved listings
        await expect(
            CatalogController.getListing(ctx, "listing123")
        ).resolves.not.toThrow();
    });

    it("denies regular user from creating listings", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        const input = {
            title: "New Listing",
            type: "place" as const,
            category: "restaurant",
            region: "kyrenia",
            coordinates: { lat: 35.3, lng: 33.3 },
        };

        await expect(
            CatalogController.createListing(ctx, input)
        ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("allows provider to create listings", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "provider123", role: "provider" as const, isAdmin: false };

        const input = {
            title: "New Listing",
            type: "place" as const,
            category: "restaurant",
            region: "kyrenia",
            coordinates: { lat: 35.3, lng: 33.3 },
        };

        // Should not throw for providers
        await expect(
            CatalogController.createListing(ctx, input)
        ).resolves.not.toThrow();
    });

    it("allows admin to create listings", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        const input = {
            title: "New Listing",
            type: "place" as const,
            category: "restaurant",
            region: "kyrenia",
            coordinates: { lat: 35.3, lng: 33.3 },
        };

        await expect(
            CatalogController.createListing(ctx, input)
        ).resolves.not.toThrow();
    });

    it("denies regular user from approving listings", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(
            CatalogController.approveListing(ctx, "listing123")
        ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("denies provider from approving listings", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "provider123", role: "provider" as const, isAdmin: false };

        await expect(
            CatalogController.approveListing(ctx, "listing123")
        ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("allows admin to approve listings", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        await expect(
            CatalogController.approveListing(ctx, "listing123")
        ).resolves.not.toThrow();
    });

    it("allows provider to update their own listing", async () => {
        const { CatalogController } = await importCompat("./catalog.controller");
        const ctx = { uid: "provider123", role: "provider" as const, isAdmin: false };

        await expect(
            CatalogController.updateListing(ctx, "listing123", { title: "Updated Title" })
        ).resolves.not.toThrow();
    });
});
