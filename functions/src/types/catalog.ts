/**
 * Catalog Item Types
 *
 * Core data model for products and services in the catalog.
 * Uses the four-layer hybrid taxonomy model.
 *
 * @version nc_v1
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import {
    IndustryDomain,
    OfferingType,
    ActionType,
    PriceType,
    Currency,
} from '../taxonomy/enums';

// ============================================================================
// CATALOG ITEM (What businesses sell)
// ============================================================================
export interface CatalogItem {
    id: string;
    businessId: string;
    marketId: string;

    // ═══ LAYER 1: SYSTEM-CONTROLLED ═══
    industryDomain: IndustryDomain;
    offeringType: OfferingType;
    actionType: ActionType;

    // ═══ LAYER 2: BUSINESS-DEFINED ═══
    section: string;             // e.g., "Tandoori Specials" (business's menu category)
    subsection?: string;         // e.g., "Chicken" (optional subcategory)

    // ═══ LAYER 2.5: CANONICAL MAPPING ═══
    taxonomyId?: string;         // e.g., "food.mains.chicken" (system-mapped)
    taxonomyConfidence?: number; // 0.0 - 1.0
    taxonomyVersion: string;     // e.g., "nc_v1"

    // ═══ CORE FIELDS ═══
    name: string;
    nameNormalized: string;      // Lowercase, trimmed for search
    description?: string;
    price: number | null;        // null when priceType === 'unknown'
    currency: Currency | null;    // null when currency not specified
    priceType: PriceType;
    images?: string[];
    isAvailable: boolean;

    // ═══ LAYER 3: OPTIONAL ENRICHMENT ═══
    tags?: string[];             // Free text tags: ["spicy", "halal"]
    attributeSchemaId?: string;  // e.g., "food.v1" for validation
    attributes?: Record<string, unknown>; // Validated key-values

    // Vector embedding for semantic search
    embedding?: number[] | FieldValue;

    // Source tracking (for replacement logic)
    source: {
        type: 'doc' | 'manual' | 'import';
        docId?: string;          // When type === 'doc'
        extractionRunId?: string;
    };
    status: 'active' | 'inactive';

    // ═══ MERVE TOOL INTEGRATION ═══
    // Optional namespace for enabling catalog items as Merve tool targets.
    // If missing or merve.enabled === false, item is not discoverable by tools.
    merve?: MerveIntegration;

    // Timestamps
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
}

// ============================================================================
// MERVE INTEGRATION (Tool enablement namespace with actions[] model)
// ============================================================================

// All supported action types
export type MerveActionType =
    | 'order_food'
    | 'order_supplies'      // Water, gas, groceries - dispatched to vendors
    | 'book_service'
    | 'request_service'
    | 'book_activity'
    | 'book_stay'
    | 'register_event'
    | 'inquire'
    | 'reserve_table';

// Place types for contextual defaults
export type MervePlaceType =
    | 'restaurant' | 'cafe' | 'bar'
    | 'service' | 'spa' | 'salon'
    | 'activity' | 'experience'
    | 'stay' | 'event';

// Legacy single-type (kept for backward compatibility read)
export type MerveToolType = 'restaurant' | 'provider' | 'activity' | 'stay';

// Dispatch specification
export interface MerveDispatchSpec {
    channel: 'whatsapp';
    toE164?: string;                 // Override recipient (else use default)
    template: string;                 // Message template
}

// Data reference for offerings subcollection
export interface MerveDataRef {
    kind: 'menu' | 'services' | 'offerings' | 'tickets' | 'roomTypes';
    path: string;                     // subcollection path
}

// Individual action specification
export interface MerveActionSpec {
    actionType: MerveActionType;
    enabled: boolean;
    dispatch: MerveDispatchSpec;
    dataRef?: MerveDataRef;
}

// Main Merve integration namespace on catalog item
export interface MerveIntegration {
    enabled: boolean;                          // Global enable/disable
    actions: MerveActionSpec[];                // Actions this item supports
    whatsappE164?: string;                     // Default WhatsApp (fallback)
    geo?: { lat: number; lng: number };        // For findClosest calculations
    coverageAreas?: string[];                  // Service/delivery coverage
    tags?: string[];                           // plumber, electrician, salon, etc.

    // Legacy field (for backward compatibility - read only)
    // If actions[] is empty but toolType exists, derive actions from toolType
    toolType?: MerveToolType;
}

// ============================================================================
// CATALOG ITEM INPUT (For creation/update)
// ============================================================================
export interface CatalogItemInput {
    // Required
    businessId: string;
    marketId: string;
    industryDomain: IndustryDomain;
    offeringType: OfferingType;
    actionType: ActionType;
    section: string;
    name: string;
    price: number | null;          // null for unknown
    currency: Currency | null;     // null when not specified
    priceType: PriceType;

    // Source tracking (required for extraction, optional for manual)
    source?: {
        type: 'doc' | 'manual' | 'import';
        docId?: string;
        extractionRunId?: string;
    };

    // Optional
    subsection?: string;
    description?: string;
    images?: string[];
    isAvailable?: boolean;
    tags?: string[];
    attributes?: Record<string, unknown>;

    // Merve tool integration (optional)
    merve?: Partial<MerveIntegration>;
}

// ============================================================================
// CATALOG QUERY PARAMS
// ============================================================================
export interface CatalogQueryParams {
    marketId: string;
    industryDomain?: IndustryDomain;
    taxonomyId?: string;
    taxonomyPrefix?: string;     // e.g., "food.mains" matches all food.mains.*
    offeringType?: OfferingType;
    maxPrice?: number;
    currency?: Currency;
    isAvailable?: boolean;
    merveEnabled?: boolean;              // Filter for Merve-enabled items only
    merveActionType?: MerveActionType;   // Filter by action type
    merveToolType?: MerveToolType;       // Legacy: filter by tool type
    limit?: number;
}

// ============================================================================
// CATALOG SEARCH RESULT
// ============================================================================
export interface CatalogSearchResult {
    items: CatalogItem[];
    total: number;
    hasMore: boolean;
}

// ============================================================================
// TAXONOMY MAPPING RESULT
// ============================================================================
export interface TaxonomyMappingResult {
    taxonomyId: string | null;
    confidence: number;
    reason?: string;
}

// ============================================================================
// MENU ITEM (Subcollection for restaurants)
// ============================================================================
export interface CatalogMenuItem {
    id: string;
    catalogItemId: string;           // Parent catalog item (restaurant)
    name: string;
    nameNormalized: string;
    price: number;
    currency: 'TRY' | 'EUR' | 'GBP' | 'USD';
    category: string;                // Mains, Starters, Drinks, Desserts
    description?: string;
    photoUrl?: string;
    isAvailable: boolean;
    sortOrder?: number;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
}

export interface CatalogMenuItemInput {
    name: string;
    price: number;
    currency: 'TRY' | 'EUR' | 'GBP' | 'USD';
    category: string;
    description?: string;
    photoUrl?: string;
    isAvailable?: boolean;
    sortOrder?: number;
}
