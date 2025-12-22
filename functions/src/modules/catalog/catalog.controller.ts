/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOG MODULE — CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Validation + Permission checks.
 * NO direct Firestore access.
 *
 * BORING CODE ONLY:
 * - Explicit permission checks
 * - No clever shortcuts
 * - Readable in one pass
 */

import { CatalogService } from "./catalog.service";
import type {
    Listing,
    CreateListingInput,
    UpdateListingInput,
    ListingQuery,
} from "./catalog.schema";
import { CreateListingInputSchema, UpdateListingInputSchema, ListingQuerySchema } from "./catalog.schema";
import { AppError } from "../../utils/errors";
import type { AuthContext } from "../identity/identity.schema";

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSION HELPERS (explicit, boring)
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

function isProvider(ctx: AuthContext): boolean {
    if (ctx.role === "provider") {
        return true;
    }
    return false;
}

function canCreateListing(ctx: AuthContext): boolean {
    // Admins can create listings
    if (isAdmin(ctx)) {
        return true;
    }
    // Providers can create listings
    if (isProvider(ctx)) {
        return true;
    }
    // Regular users cannot create listings
    return false;
}

function canApproveListing(ctx: AuthContext): boolean {
    // Only admins can approve listings
    return isAdmin(ctx);
}

async function canUpdateListing(ctx: AuthContext, listingId: string): Promise<boolean> {
    // Admins can update any listing
    if (isAdmin(ctx)) {
        return true;
    }

    // Providers can update their own listings
    if (isProvider(ctx)) {
        const ownerId = await CatalogService.getListingOwnerId(listingId);
        if (ownerId === ctx.uid) {
            return true;
        }
    }

    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────

export const CatalogController = {
    /**
     * Get a listing by ID
     * - Anyone can view approved listings
     * - Owners and admins can view any listing
     */
    async getListing(ctx: AuthContext, listingId: string): Promise<Listing | null> {
        const listing = await CatalogService.getListing(listingId);

        if (listing === null) {
            return null;
        }

        // Approved listings are public
        if (listing.approved === true) {
            return listing;
        }

        // Admins can view any listing
        if (isAdmin(ctx)) {
            return listing;
        }

        // Owners can view their own listings
        if (listing.ownerId === ctx.uid) {
            return listing;
        }

        // Everyone else cannot see unapproved listings
        throw new AppError("PERMISSION_DENIED", "You cannot view this listing");
    },

    /**
     * Create a new listing
     * - Providers and admins can create listings
     * - Regular users cannot create listings
     */
    async createListing(ctx: AuthContext, input: CreateListingInput): Promise<string> {
        // Permission check
        if (!canCreateListing(ctx)) {
            throw new AppError("PERMISSION_DENIED", "You do not have permission to create listings");
        }

        // Validate input
        const validationResult = CreateListingInputSchema.safeParse(input);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        // Create the listing
        const listingId = await CatalogService.createListing(ctx.uid, validationResult.data);

        return listingId;
    },

    /**
     * Update an existing listing
     * - Providers can update their own listings
     * - Admins can update any listing
     */
    async updateListing(
        ctx: AuthContext,
        listingId: string,
        updates: UpdateListingInput
    ): Promise<Listing | null> {
        // Permission check
        const hasPermission = await canUpdateListing(ctx, listingId);
        if (!hasPermission) {
            throw new AppError("PERMISSION_DENIED", "You do not have permission to update this listing");
        }

        // Validate input
        const validationResult = UpdateListingInputSchema.safeParse(updates);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        // Update the listing
        const updatedListing = await CatalogService.updateListing(listingId, validationResult.data);

        return updatedListing;
    },

    /**
     * Get listings by query
     * - Anyone can query approved listings
     * - Admins can query all listings
     * - Providers can query their own listings
     */
    async getListings(ctx: AuthContext, query: ListingQuery): Promise<Listing[]> {
        // Validate query
        const validationResult = ListingQuerySchema.safeParse(query);
        if (!validationResult.success) {
            throw new AppError("INVALID_INPUT", validationResult.error.message);
        }

        const validQuery = validationResult.data;

        // Non-admins can only see approved listings (unless querying their own)
        if (!isAdmin(ctx)) {
            if (validQuery.ownerId !== ctx.uid) {
                validQuery.approved = true;
            }
        }

        return CatalogService.getListings(validQuery);
    },

    /**
     * Approve a listing
     * - Only admins can approve listings
     */
    async approveListing(ctx: AuthContext, listingId: string): Promise<Listing | null> {
        // Permission check
        if (!canApproveListing(ctx)) {
            throw new AppError("PERMISSION_DENIED", "Only admins can approve listings");
        }

        return CatalogService.approveListing(listingId, ctx.uid);
    },

    /**
     * Reject a listing
     * - Only admins can reject listings
     */
    async rejectListing(ctx: AuthContext, listingId: string): Promise<Listing | null> {
        // Permission check
        if (!canApproveListing(ctx)) {
            throw new AppError("PERMISSION_DENIED", "Only admins can reject listings");
        }

        return CatalogService.rejectListing(listingId, ctx.uid);
    },

    /**
     * Archive a listing (soft delete)
     * - Providers can archive their own listings
     * - Admins can archive any listing
     */
    async archiveListing(ctx: AuthContext, listingId: string): Promise<boolean> {
        // Permission check
        const hasPermission = await canUpdateListing(ctx, listingId);
        if (!hasPermission) {
            throw new AppError("PERMISSION_DENIED", "You do not have permission to archive this listing");
        }

        return CatalogService.archiveListing(listingId);
    },

    /**
     * Get provider's own listings
     */
    async getMyListings(ctx: AuthContext, query?: Partial<ListingQuery>): Promise<Listing[]> {
        return CatalogService.getListings({
            ...query,
            ownerId: ctx.uid,
        });
    },
};
