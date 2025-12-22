/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONNECT MODULE — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validation + Permission checks.
 * NO direct Firestore access.
 */

import { ConnectService } from "./connect.service";
import type {
    CheckIn,
    Join,
    UserActivity,
    ConnectCurationItem,
    LiveVenue,
    CheckInInput,
    JoinEventInput,
    LeaveEventInput,
    FeedQuery,
    LiveVenuesQuery,
    UpsertCurationInput,
} from "./connect.schema";
import {
    CheckInInputSchema,
    JoinEventInputSchema,
    LeaveEventInputSchema,
    FeedQuerySchema,
    LiveVenuesQuerySchema,
    UpsertCurationInputSchema,
} from "./connect.schema";
import { AppError } from "../../utils/errors";
import type { AuthContext } from "../identity/identity.schema";

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION HELPERS (explicit)
// ─────────────────────────────────────────────────────────────────────────────

function isAdmin(ctx: AuthContext): boolean {
    if (ctx.isAdmin === true) {
        return true;
    }
    if (ctx.role === "admin") {
        return true;
    }
    if (ctx.role === "superadmin") {
        return true;
    }
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export const ConnectController = {
    /**
     * Check in to a pin (idempotent)
     * - Any authenticated user can check in
     */
    async checkIn(ctx: AuthContext, input: CheckInInput): Promise<CheckIn> {
        // Validate input
        const validationResult = CheckInInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const { pinId, pinType } = validationResult.data;

        // Call service
        const checkIn = await ConnectService.upsertCheckIn({
            userId: ctx.uid,
            pinId: pinId,
            pinType: pinType,
        });

        return checkIn;
    },

    /**
     * Join an event (idempotent)
     * - Any authenticated user can join an event
     */
    async joinEvent(ctx: AuthContext, input: JoinEventInput): Promise<Join> {
        // Validate input
        const validationResult = JoinEventInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const { eventId } = validationResult.data;

        // Call service
        const join = await ConnectService.upsertJoinJoined({
            userId: ctx.uid,
            eventId: eventId,
        });

        return join;
    },

    /**
     * Leave an event
     * - Any authenticated user can leave an event
     * - Fail-closed: if no prior join, creates join with status "left"
     */
    async leaveEvent(ctx: AuthContext, input: LeaveEventInput): Promise<Join> {
        // Validate input
        const validationResult = LeaveEventInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const { eventId } = validationResult.data;

        // Call service
        const join = await ConnectService.upsertJoinLeft({
            userId: ctx.uid,
            eventId: eventId,
        });

        return join;
    },

    /**
     * Get active feed
     * - Any authenticated user can view the feed
     * - Excludes expired checkin activities
     */
    async getActiveFeed(ctx: AuthContext, query: FeedQuery): Promise<UserActivity[]> {
        // Validate query
        const validationResult = FeedQuerySchema.safeParse(query);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        return ConnectService.getActiveFeed(validationResult.data);
    },

    /**
     * Get live venues
     * - Any authenticated user can view live venues
     * - Only counts non-expired checkins
     */
    async getLiveVenues(ctx: AuthContext, query: LiveVenuesQuery): Promise<LiveVenue[]> {
        // Validate query
        const validationResult = LiveVenuesQuerySchema.safeParse(query);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        return ConnectService.getLiveVenues(validationResult.data);
    },

    /**
     * Get curation items
     * - Any authenticated user can view curated items
     */
    async getCurationItems(ctx: AuthContext): Promise<ConnectCurationItem[]> {
        return ConnectService.getCurationItems();
    },

    /**
     * Upsert curation item
     * - Admin only
     */
    async upsertCurationItem(
        ctx: AuthContext,
        input: UpsertCurationInput
    ): Promise<ConnectCurationItem> {
        // Permission check: admin only
        if (!isAdmin(ctx)) {
            throw new AppError("PERMISSION_DENIED", "Only admins can manage curation");
        }

        // Validate input
        const validationResult = UpsertCurationInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        return ConnectService.upsertCurationItem(validationResult.data, {
            adminId: ctx.uid,
        });
    },
};
