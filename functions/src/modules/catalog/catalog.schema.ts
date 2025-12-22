/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOG MODULE — SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Source of truth for Listing data shape.
 * NO Firebase imports. NO business logic.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export const ListingTypeSchema = z.enum([
    "place",
    "activity",
    "event",
    "stay",
    "experience",
]);
export type ListingType = z.infer<typeof ListingTypeSchema>;

export const ListingStatusSchema = z.enum([
    "draft",
    "pending",
    "approved",
    "rejected",
    "archived",
]);
export type ListingStatus = z.infer<typeof ListingStatusSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATES
// ─────────────────────────────────────────────────────────────────────────────

export const CoordinatesSchema = z.object({
    lat: z.number(),
    lng: z.number(),
});
export type Coordinates = z.infer<typeof CoordinatesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// OPENING HOURS
// ─────────────────────────────────────────────────────────────────────────────

export const OpeningHoursSchema = z.object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
});
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MERVE INTEGRATION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const MerveActionSchema = z.object({
    type: z.string(),
    enabled: z.boolean(),
    config: z.record(z.unknown()).optional(),
});
export type MerveAction = z.infer<typeof MerveActionSchema>;

export const MerveConfigSchema = z.object({
    enabled: z.boolean(),
    actions: z.array(MerveActionSchema).optional(),
});
export type MerveConfig = z.infer<typeof MerveConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LISTING (Core Entity)
// ─────────────────────────────────────────────────────────────────────────────

export const ListingSchema = z.object({
    // Identity
    id: z.string(),
    title: z.string().min(1),
    description: z.string().optional(),

    // Classification
    type: ListingTypeSchema,
    category: z.string(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).optional(),

    // Location
    region: z.string(),
    address: z.string().optional(),
    coordinates: CoordinatesSchema,

    // Media
    images: z.array(z.string()).optional(),
    heroImage: z.string().optional(),

    // Business Info
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    openingHours: OpeningHoursSchema.optional(),

    // Pricing
    price: z.number().optional(),
    currency: z.string().default("GBP"),
    priceLabel: z.string().optional(),

    // Ownership
    ownerId: z.string().optional(),
    ownerName: z.string().optional(),

    // Status & Visibility
    status: ListingStatusSchema,
    approved: z.boolean(),
    showOnMap: z.boolean(),
    featured: z.boolean().optional(),

    // Merve Integration
    merve: MerveConfigSchema.optional(),

    // Timestamps
    createdAt: z.date(),
    updatedAt: z.date(),
    approvedAt: z.date().optional(),
    approvedBy: z.string().optional(),
});

export type Listing = z.infer<typeof ListingSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// INPUT SCHEMAS (for API validation)
// ─────────────────────────────────────────────────────────────────────────────

export const CreateListingInputSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    type: ListingTypeSchema,
    category: z.string(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).optional(),
    region: z.string(),
    address: z.string().optional(),
    coordinates: CoordinatesSchema,
    images: z.array(z.string()).optional(),
    heroImage: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    openingHours: OpeningHoursSchema.optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
    priceLabel: z.string().optional(),
    merve: MerveConfigSchema.optional(),
});

export type CreateListingInput = z.infer<typeof CreateListingInputSchema>;

export const UpdateListingInputSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).optional(),
    region: z.string().optional(),
    address: z.string().optional(),
    coordinates: CoordinatesSchema.optional(),
    images: z.array(z.string()).optional(),
    heroImage: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    openingHours: OpeningHoursSchema.optional(),
    price: z.number().optional(),
    currency: z.string().optional(),
    priceLabel: z.string().optional(),
    showOnMap: z.boolean().optional(),
    featured: z.boolean().optional(),
    merve: MerveConfigSchema.optional(),
});

export type UpdateListingInput = z.infer<typeof UpdateListingInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// QUERY SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

export const ListingQuerySchema = z.object({
    type: ListingTypeSchema.optional(),
    category: z.string().optional(),
    region: z.string().optional(),
    approved: z.boolean().optional(),
    ownerId: z.string().optional(),
    limit: z.number().min(1).max(100).optional(),
});

export type ListingQuery = z.infer<typeof ListingQuerySchema>;
