/**
 * Listing Schema for AskMerve V1
 * 
 * Simplified listing schema for job targeting and merchant resolution.
 */

import { z } from 'zod';
import { CoordinatesSchema } from './location.schema';
import { ActionTypeSchema } from './action.schema';

// =============================================================================
// LISTING SCHEMA
// =============================================================================

/**
 * Place types for categorization.
 */
export const PlaceTypeSchema = z.enum([
    'restaurant',
    'cafe',
    'bar',
    'hotel',
    'apartment',
    'villa',
    'spa',
    'salon',
    'gym',
    'tour_operator',
    'taxi_company',
    'water_gas_vendor',
    'grocery',
    'pharmacy',
    'service_provider',
    'other',
]);

export type PlaceType = z.infer<typeof PlaceTypeSchema>;

/**
 * Listing document schema.
 */
export const ListingSchema = z.object({
    id: z.string().min(1),

    /** Display name */
    name: z.string().min(1),

    /** Place type */
    placeType: PlaceTypeSchema,

    /** Description */
    description: z.string().optional(),

    /** Address */
    address: z.string().optional(),

    /** Coordinates for mapping */
    coordinates: CoordinatesSchema.optional(),

    /** Cover image URL */
    imageUrl: z.string().url().optional(),

    /** Contact info */
    contact: z.object({
        phone: z.string().optional(),
        whatsapp: z.string().optional(), // E.164 format
        email: z.string().email().optional(),
        website: z.string().url().optional(),
    }).optional(),

    /** Merve integration config */
    merve: z.object({
        /** Whether Merve can dispatch to this listing */
        enabled: z.boolean().default(false),
        /** Supported action types */
        actions: z.array(ActionTypeSchema).optional(),
        /** Primary WhatsApp for dispatch */
        whatsappE164: z.string().regex(/^\+\d{10,15}$/).optional(),
        /** Coverage areas (neighborhoods, etc.) */
        coverageAreas: z.array(z.string()).optional(),
    }).optional(),

    /** Operating hours (simplified) */
    operatingHours: z.object({
        monday: z.string().optional(),
        tuesday: z.string().optional(),
        wednesday: z.string().optional(),
        thursday: z.string().optional(),
        friday: z.string().optional(),
        saturday: z.string().optional(),
        sunday: z.string().optional(),
    }).optional(),

    /** Tags for search/filtering */
    tags: z.array(z.string()).optional(),

    /** Active status */
    isActive: z.boolean().default(true),

    /** Timestamps */
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type Listing = z.infer<typeof ListingSchema>;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if a listing supports a specific action type.
 */
export function listingSupportsAction(
    listing: Listing,
    actionType: z.infer<typeof ActionTypeSchema>
): boolean {
    if (!listing.merve?.enabled) {
        return false;
    }
    if (!listing.merve.actions || listing.merve.actions.length === 0) {
        return true; // If no specific actions, assume all supported
    }
    return listing.merve.actions.includes(actionType);
}

/**
 * Gets the dispatch WhatsApp number for a listing.
 */
export function getListingDispatchPhone(listing: Listing): string | undefined {
    return listing.merve?.whatsappE164 ?? listing.contact?.whatsapp;
}
