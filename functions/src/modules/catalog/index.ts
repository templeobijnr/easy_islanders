/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOG MODULE — INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Re-exports for the Catalog module.
 * No wildcard exports.
 */

// Schemas & Types
export {
    ListingSchema,
    ListingTypeSchema,
    ListingStatusSchema,
    CreateListingInputSchema,
    UpdateListingInputSchema,
    ListingQuerySchema,
} from "./catalog.schema";

export type {
    Listing,
    ListingType,
    ListingStatus,
    CreateListingInput,
    UpdateListingInput,
    ListingQuery,
    Coordinates,
    OpeningHours,
    MerveConfig,
    MerveAction,
} from "./catalog.schema";

// Service (internal use)
export { CatalogService } from "./catalog.service";

// Controller (internal use)
export { CatalogController } from "./catalog.controller";

// Cloud Functions (exported to index.ts)
export {
    getListing,
    getListings,
    createListing,
    updateListing,
    approveListing,
    rejectListing,
    archiveListing,
    getMyListings,
} from "./catalog.functions";
