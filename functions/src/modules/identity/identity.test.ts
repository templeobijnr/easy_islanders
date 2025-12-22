/**
 * ═══════════════════════════════════════════════════════════════════════════
 * IDENTITY MODULE — CONTRACT TESTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Written BEFORE implementation.
 * Defines the contract that service/controller must fulfill.
 */

// Avoid real Firestore calls in contract tests.
jest.mock("./identity.service", () => ({
    IdentityService: {
        getUser: jest.fn(async (userId: string) => ({
            id: userId,
            email: "test@example.com",
            phone: "+905551234567",
            displayName: "Test User",
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        createUser: jest.fn(async () => ({ id: "user123" })),
        updateUser: jest.fn(async () => ({ id: "user123" })),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Identity Schema", () => {
    it("validates a complete user object", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { UserSchema } = require("./identity.schema");

        const validUser = {
            id: "user123",
            email: "test@example.com",
            phone: "+905551234567",
            displayName: "Test User",
            address: {
                city: "Kyrenia",
                region: "kyrenia",
                country: "TRNC",
            },
            role: "user" as const,
            userType: "personal" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
            isVerified: false,
        };

        const result = UserSchema.safeParse(validUser);
        expect(result.success).toBe(true);
    });

    it("rejects user without required email", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { UserSchema } = require("./identity.schema");

        const invalidUser = {
            id: "user123",
            phone: "+905551234567",
            address: { city: "Kyrenia", region: "kyrenia", country: "TRNC" },
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = UserSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
    });

    it("rejects user without required phone", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { UserSchema } = require("./identity.schema");

        const invalidUser = {
            id: "user123",
            email: "test@example.com",
            address: { city: "Kyrenia", region: "kyrenia", country: "TRNC" },
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = UserSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
    });

    it("rejects user without required address", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { UserSchema } = require("./identity.schema");

        const invalidUser = {
            id: "user123",
            email: "test@example.com",
            phone: "+905551234567",
            role: "user",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = UserSchema.safeParse(invalidUser);
        expect(result.success).toBe(false);
    });

    it("validates all role types", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { UserRoleSchema } = require("./identity.schema");

        expect(UserRoleSchema.safeParse("user").success).toBe(true);
        expect(UserRoleSchema.safeParse("provider").success).toBe(true);
        expect(UserRoleSchema.safeParse("admin").success).toBe(true);
        expect(UserRoleSchema.safeParse("superadmin").success).toBe(true);
        expect(UserRoleSchema.safeParse("invalid").success).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("IdentityService Contract", () => {
    it("exposes getUser method", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityService = require("./identity.service");
        expect(typeof IdentityService.IdentityService.getUser).toBe("function");
    });

    it("exposes createUser method", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityService = require("./identity.service");
        expect(typeof IdentityService.IdentityService.createUser).toBe("function");
    });

    it("exposes updateUser method", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityService = require("./identity.service");
        expect(typeof IdentityService.IdentityService.updateUser).toBe("function");
    });

    it("does NOT expose Firestore directly", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityService = require("./identity.service");
        expect((IdentityService as any).db).toBeUndefined();
        expect((IdentityService as any).firestore).toBeUndefined();
    });

    it("does NOT expose catalog methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityService = require("./identity.service");
        expect((IdentityService.IdentityService as any).createListing).toBeUndefined();
        expect((IdentityService.IdentityService as any).getListing).toBeUndefined();
    });

    it("does NOT expose booking methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityService = require("./identity.service");
        expect((IdentityService.IdentityService as any).createBooking).toBeUndefined();
        expect((IdentityService.IdentityService as any).getBooking).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("IdentityController Contract", () => {
    it("exposes getUser method", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityController = require("./identity.controller");
        expect(typeof IdentityController.IdentityController.getUser).toBe("function");
    });

    it("exposes updateProfile method", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityController = require("./identity.controller");
        expect(typeof IdentityController.IdentityController.updateProfile).toBe("function");
    });

    it("does NOT expose raw Firestore methods", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const IdentityController = require("./identity.controller");
        expect((IdentityController.IdentityController as any).collection).toBeUndefined();
        expect((IdentityController.IdentityController as any).doc).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Identity Permissions", () => {
    it("allows user to get own profile", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { IdentityController } = require("./identity.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        // Should not throw
        await expect(
            IdentityController.getUser(ctx, "user123")
        ).resolves.not.toThrow();
    });

    it("denies user from getting another user profile", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { IdentityController } = require("./identity.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(
            IdentityController.getUser(ctx, "otherUser456")
        ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    });

    it("allows admin to get any user profile", async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { IdentityController } = require("./identity.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        // Should not throw
        await expect(
            IdentityController.getUser(ctx, "anyUser789")
        ).resolves.not.toThrow();
    });
});
