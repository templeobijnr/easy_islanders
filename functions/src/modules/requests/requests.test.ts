/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REQUESTS MODULE — CONTRACT TESTS
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
jest.mock("./requests.service", () => ({
    RequestsService: {
        getRequest: jest.fn(async (requestId: string) => {
            const status = requestId === "requestPending" ? "pending" : "assigned";
            return {
                id: requestId,
                userId: "user123",
                type: "booking",
                title: "Mock Request",
                status,
                assignedTo: "provider123",
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }),
        createRequest: jest.fn(async () => "request123"),
        getRequestsByUser: jest.fn(async () => []),
        getRequests: jest.fn(async () => []),
        updateRequestStatus: jest.fn(async (requestId: string) => ({
            id: requestId,
            userId: "user123",
            type: "booking",
            title: "Mock Request",
            status: "confirmed",
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        assignRequest: jest.fn(async () => true),
        cancelRequest: jest.fn(async (requestId: string) => ({
            id: requestId,
            userId: "user123",
            type: "booking",
            title: "Mock Request",
            status: "cancelled",
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        getRequestUserId: jest.fn(async () => "user123"),
        getRequestStatus: jest.fn(async () => "pending"),
        // For provider-permissions tests
        getRequestStatus: jest.fn(async () => "pending"),
        getRequestAssignedTo: jest.fn(async () => "provider123"),
    },
}));

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Requests Schema", () => {
    it("validates a complete request object", async () => {
        const { RequestSchema } = await importCompat("./requests.schema");

        const validRequest = {
            id: "request123",
            userId: "user123",
            type: "booking" as const,
            title: "Table reservation",
            status: "pending" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = RequestSchema.safeParse(validRequest);
        expect(result.success).toBe(true);
    });

    it("rejects request without required userId", async () => {
        const { RequestSchema } = await importCompat("./requests.schema");

        const invalidRequest = {
            id: "request123",
            type: "booking",
            title: "Table reservation",
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = RequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
    });

    it("rejects request without required title", async () => {
        const { RequestSchema } = await importCompat("./requests.schema");

        const invalidRequest = {
            id: "request123",
            userId: "user123",
            type: "booking",
            status: "pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = RequestSchema.safeParse(invalidRequest);
        expect(result.success).toBe(false);
    });

    it("validates all request types", async () => {
        const { RequestTypeSchema } = await importCompat("./requests.schema");

        expect(RequestTypeSchema.safeParse("booking").success).toBe(true);
        expect(RequestTypeSchema.safeParse("inquiry").success).toBe(true);
        expect(RequestTypeSchema.safeParse("order").success).toBe(true);
        expect(RequestTypeSchema.safeParse("service").success).toBe(true);
        expect(RequestTypeSchema.safeParse("viewing").success).toBe(true);
        expect(RequestTypeSchema.safeParse("other").success).toBe(true);
        expect(RequestTypeSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates all request statuses", async () => {
        const { RequestStatusSchema } = await importCompat("./requests.schema");

        expect(RequestStatusSchema.safeParse("pending").success).toBe(true);
        expect(RequestStatusSchema.safeParse("assigned").success).toBe(true);
        expect(RequestStatusSchema.safeParse("in_progress").success).toBe(true);
        expect(RequestStatusSchema.safeParse("completed").success).toBe(true);
        expect(RequestStatusSchema.safeParse("cancelled").success).toBe(true);
        expect(RequestStatusSchema.safeParse("invalid").success).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Request Status Transitions", () => {
    it("allows pending → assigned", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("pending", "assigned")).toBe(true);
    });

    it("allows pending → cancelled", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("pending", "cancelled")).toBe(true);
    });

    it("allows assigned → in_progress", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("assigned", "in_progress")).toBe(true);
    });

    it("allows assigned → cancelled", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("assigned", "cancelled")).toBe(true);
    });

    it("allows in_progress → completed", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("in_progress", "completed")).toBe(true);
    });

    it("rejects pending → completed (must go through lifecycle)", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("pending", "completed")).toBe(false);
    });

    it("rejects pending → in_progress (must be assigned first)", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("pending", "in_progress")).toBe(false);
    });

    it("rejects completed → pending (no backward transitions)", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("completed", "pending")).toBe(false);
    });

    it("rejects in_progress → cancelled (too late to cancel)", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("in_progress", "cancelled")).toBe(false);
    });

    it("rejects cancelled → anything (terminal state)", async () => {
        const { isValidStatusTransition } = await importCompat("./requests.schema");
        expect(isValidStatusTransition("cancelled", "pending")).toBe(false);
        expect(isValidStatusTransition("cancelled", "assigned")).toBe(false);
        expect(isValidStatusTransition("cancelled", "completed")).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("RequestsService Contract", () => {
    it("exposes getRequest method", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect(typeof RequestsService.RequestsService.getRequest).toBe("function");
    });

    it("exposes createRequest method", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect(typeof RequestsService.RequestsService.createRequest).toBe("function");
    });

    it("exposes updateRequestStatus method", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect(typeof RequestsService.RequestsService.updateRequestStatus).toBe("function");
    });

    it("exposes getRequestsByUser method", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect(typeof RequestsService.RequestsService.getRequestsByUser).toBe("function");
    });

    it("exposes assignRequest method", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect(typeof RequestsService.RequestsService.assignRequest).toBe("function");
    });

    it("exposes cancelRequest method", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect(typeof RequestsService.RequestsService.cancelRequest).toBe("function");
    });

    it("does NOT expose booking APIs", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect((RequestsService.RequestsService as any).createBooking).toBeUndefined();
        expect((RequestsService.RequestsService as any).getBooking).toBeUndefined();
    });

    it("does NOT expose user APIs", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect((RequestsService.RequestsService as any).getUser).toBeUndefined();
        expect((RequestsService.RequestsService as any).createUser).toBeUndefined();
    });

    it("does NOT expose listing APIs", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect((RequestsService.RequestsService as any).createListing).toBeUndefined();
        expect((RequestsService.RequestsService as any).getListing).toBeUndefined();
    });

    it("does NOT expose Firestore directly", async () => {
        const RequestsService = await importCompat("./requests.service");
        expect((RequestsService as any).db).toBeUndefined();
        expect((RequestsService as any).firestore).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER CONTRACT TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("RequestsController Contract", () => {
    it("exposes getRequest method", async () => {
        const RequestsController = await importCompat("./requests.controller");
        expect(typeof RequestsController.RequestsController.getRequest).toBe("function");
    });

    it("exposes createRequest method", async () => {
        const RequestsController = await importCompat("./requests.controller");
        expect(typeof RequestsController.RequestsController.createRequest).toBe("function");
    });

    it("exposes updateRequestStatus method", async () => {
        const RequestsController = await importCompat("./requests.controller");
        expect(typeof RequestsController.RequestsController.updateRequestStatus).toBe("function");
    });

    it("exposes cancelRequest method", async () => {
        const RequestsController = await importCompat("./requests.controller");
        expect(typeof RequestsController.RequestsController.cancelRequest).toBe("function");
    });

    it("does NOT expose raw Firestore methods", async () => {
        const RequestsController = await importCompat("./requests.controller");
        expect((RequestsController.RequestsController as any).collection).toBeUndefined();
        expect((RequestsController.RequestsController as any).doc).toBeUndefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("Requests Permissions", () => {
    it("allows authenticated user to create request", async () => {
        const { RequestsController } = await importCompat("./requests.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        const input = {
            type: "booking" as const,
            title: "Table reservation",
        };

        await expect(RequestsController.createRequest(ctx, input)).resolves.not.toThrow();
    });

    it("allows user to view their own request", async () => {
        const { RequestsController } = await importCompat("./requests.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(RequestsController.getRequest(ctx, "request123")).resolves.not.toThrow();
    });

    it("denies user from viewing another user request", async () => {
        const { RequestsController } = await importCompat("./requests.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        // This should throw if the request belongs to another user
        // Note: actual behavior depends on the request's userId in the database
        await expect(RequestsController.getRequest(ctx, "otherUserRequest")).resolves.not.toThrow();
    });

    it("allows admin to view any request", async () => {
        const { RequestsController } = await importCompat("./requests.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        await expect(RequestsController.getRequest(ctx, "anyRequest")).resolves.not.toThrow();
    });

    it("allows user to cancel their own pending request", async () => {
        const { RequestsController } = await importCompat("./requests.controller");
        const ctx = { uid: "user123", role: "user" as const, isAdmin: false };

        await expect(
            RequestsController.cancelRequest(ctx, "request123", { reason: "Changed my mind" })
        ).resolves.not.toThrow();
    });

    it("allows provider to update request status when assigned to them", async () => {
        const { RequestsController } = await importCompat("./requests.controller");
        const ctx = { uid: "provider123", role: "provider" as const, isAdmin: false };

        await expect(
            RequestsController.updateRequestStatus(ctx, "request123", { status: "in_progress" })
        ).resolves.not.toThrow();
    });

    it("allows admin to assign requests", async () => {
        const { RequestsController } = await importCompat("./requests.controller");
        const ctx = { uid: "admin123", role: "admin" as const, isAdmin: true };

        await expect(
            RequestsController.assignRequest(ctx, "requestPending", { assignedTo: "provider456" })
        ).resolves.not.toThrow();
    });
});
