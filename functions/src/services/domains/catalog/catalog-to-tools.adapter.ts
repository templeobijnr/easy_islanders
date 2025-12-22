/**
 * Catalog to Tools Adapter
 *
 * Converts generic CatalogItem to tool-specific formats.
 * Returns Result pattern (ok/fail) instead of throwing.
 *
 * @module catalog-to-tools.adapter
 */

import { CatalogItem, CatalogMenuItem, MerveToolType, MerveActionType, MerveIntegration } from '../../../types/catalog';

// ============================================================================
// RESULT PATTERN
// ============================================================================

export type AdapterResult<T> =
    | { ok: true; value: T }
    | { ok: false; reason: string };

// ============================================================================
// HELPER: Get dispatch template from actions or legacy field
// ============================================================================

function getDispatchTemplate(merve: MerveIntegration, actionType: MerveActionType, defaultTemplate: string): string {
    // Find the action in the actions array
    const action = merve.actions?.find(a => a.actionType === actionType && a.enabled);
    if (action?.dispatch?.template) {
        return action.dispatch.template;
    }
    // Fallback to default
    return defaultTemplate;
}

// Check if item has a specific action enabled
export function hasAction(merve: MerveIntegration, actionType: MerveActionType): boolean {
    // Check actions[] first
    if (merve.actions?.some(a => a.actionType === actionType && a.enabled)) {
        return true;
    }
    // Backward compat: infer from legacy toolType
    if (!merve.actions?.length && merve.toolType) {
        const legacyActionMap: Record<MerveToolType, MerveActionType[]> = {
            restaurant: ['order_food', 'reserve_table'],
            provider: ['book_service', 'request_service'],
            activity: ['book_activity'],
            stay: ['book_stay', 'inquire'],
        };
        return legacyActionMap[merve.toolType]?.includes(actionType) ?? false;
    }
    return false;
}

// ============================================================================
// TOOL OUTPUT TYPES
// ============================================================================

export interface RestaurantOutput {
    id: string;
    name: string;
    whatsappE164: string;
    address: string;
    cuisineTags: string[];
    deliveryAreas: string[];
    dispatchTemplate: string;
    geo?: { lat: number; lng: number };
    priceRange?: string;
    rating?: number;
    imageUrl?: string;
}

export interface ServiceProviderOutput {
    id: string;
    name: string;
    whatsappE164: string;
    services: string[];
    coverageAreas: string[];
    dispatchTemplate: string;
    geo?: { lat: number; lng: number };
    rating?: number;
    responseTime?: string;
}

export interface ActivityOutput {
    id: string;
    name: string;
    whatsappE164: string;
    address: string;
    description?: string;
    price?: number;
    currency?: string;
    geo?: { lat: number; lng: number };
    dispatchTemplate: string;
}

export interface StayOutput {
    id: string;
    name: string;
    whatsappE164: string;
    address: string;
    description?: string;
    pricePerNight?: number;
    currency?: string;
    geo?: { lat: number; lng: number };
    dispatchTemplate: string;
}

// ============================================================================
// DEFAULT TEMPLATES
// ============================================================================

const DEFAULT_TEMPLATES = {
    restaurant: `🍽️ New Order from Easy Islanders

Customer: {customerName}
Phone: {customerPhone}

{items}

Total: {total}
Deliver to: {address}
{notes}`,

    provider: `🔧 New Service Request

Service: {serviceType}
Customer: {customerName}
Phone: {customerPhone}
Address: {address}
Urgency: {urgency}

Details: {description}`,

    activity: `🎯 New Booking Request

Activity: {activityName}
Customer: {customerName}
Phone: {customerPhone}
Date: {date}
Guests: {guests}

Notes: {notes}`,

    stay: `🏨 New Booking Request

Property: {propertyName}
Customer: {customerName}
Phone: {customerPhone}
Check-in: {checkIn}
Check-out: {checkOut}
Guests: {guests}

Notes: {notes}`,
};

// ============================================================================
// ADAPTERS
// ============================================================================

/**
 * Convert CatalogItem to Restaurant format
 */
export function catalogToRestaurant(
    item: CatalogItem,
    _menuItems?: CatalogMenuItem[]
): AdapterResult<RestaurantOutput> {
    // Validate Merve integration
    if (!item.merve?.enabled) {
        return { ok: false, reason: 'Item is not Merve-enabled' };
    }
    if (item.merve.toolType !== 'restaurant') {
        return { ok: false, reason: `Expected toolType 'restaurant', got '${item.merve.toolType}'` };
    }
    if (!item.merve.whatsappE164) {
        return { ok: false, reason: 'Missing whatsappE164 for dispatch' };
    }

    // Extract address from attributes or use name as fallback
    const address = (item.attributes?.address as string) || item.name;

    return {
        ok: true,
        value: {
            id: item.id,
            name: item.name,
            whatsappE164: item.merve.whatsappE164,
            address,
            cuisineTags: item.merve.tags || item.tags || [],
            deliveryAreas: item.merve.coverageAreas || [],
            dispatchTemplate: getDispatchTemplate(item.merve, 'order_food', DEFAULT_TEMPLATES.restaurant),
            geo: item.merve.geo,
            priceRange: item.attributes?.priceRange as string,
            rating: item.attributes?.rating as number,
            imageUrl: item.images?.[0],
        },
    };
}

/**
 * Convert CatalogItem to ServiceProvider format
 */
export function catalogToServiceProvider(item: CatalogItem): AdapterResult<ServiceProviderOutput> {
    if (!item.merve?.enabled) {
        return { ok: false, reason: 'Item is not Merve-enabled' };
    }
    if (item.merve.toolType !== 'provider') {
        return { ok: false, reason: `Expected toolType 'provider', got '${item.merve.toolType}'` };
    }
    if (!item.merve.whatsappE164) {
        return { ok: false, reason: 'Missing whatsappE164 for dispatch' };
    }

    return {
        ok: true,
        value: {
            id: item.id,
            name: item.name,
            whatsappE164: item.merve.whatsappE164,
            services: item.merve.tags || [],
            coverageAreas: item.merve.coverageAreas || [],
            dispatchTemplate: getDispatchTemplate(item.merve, 'book_service', DEFAULT_TEMPLATES.provider),
            geo: item.merve.geo,
            rating: item.attributes?.rating as number,
            responseTime: item.attributes?.responseTime as string,
        },
    };
}

/**
 * Convert CatalogItem to Activity format
 */
export function catalogToActivity(item: CatalogItem): AdapterResult<ActivityOutput> {
    if (!item.merve?.enabled) {
        return { ok: false, reason: 'Item is not Merve-enabled' };
    }
    if (item.merve.toolType !== 'activity') {
        return { ok: false, reason: `Expected toolType 'activity', got '${item.merve.toolType}'` };
    }
    if (!item.merve.whatsappE164) {
        return { ok: false, reason: 'Missing whatsappE164 for dispatch' };
    }

    const address = (item.attributes?.address as string) || item.name;

    return {
        ok: true,
        value: {
            id: item.id,
            name: item.name,
            whatsappE164: item.merve.whatsappE164,
            address,
            description: item.description,
            price: item.price ?? undefined,
            currency: item.currency ?? undefined,
            geo: item.merve.geo,
            dispatchTemplate: getDispatchTemplate(item.merve, 'book_activity', DEFAULT_TEMPLATES.activity),
        },
    };
}

/**
 * Convert CatalogItem to Stay format
 */
export function catalogToStay(item: CatalogItem): AdapterResult<StayOutput> {
    if (!item.merve?.enabled) {
        return { ok: false, reason: 'Item is not Merve-enabled' };
    }
    if (item.merve.toolType !== 'stay') {
        return { ok: false, reason: `Expected toolType 'stay', got '${item.merve.toolType}'` };
    }
    if (!item.merve.whatsappE164) {
        return { ok: false, reason: 'Missing whatsappE164 for dispatch' };
    }

    const address = (item.attributes?.address as string) || item.name;

    return {
        ok: true,
        value: {
            id: item.id,
            name: item.name,
            whatsappE164: item.merve.whatsappE164,
            address,
            description: item.description,
            pricePerNight: item.price ?? undefined,
            currency: item.currency ?? undefined,
            geo: item.merve.geo,
            dispatchTemplate: getDispatchTemplate(item.merve, 'book_stay', DEFAULT_TEMPLATES.stay),
        },
    };
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Get the appropriate adapter for a tool type
 */
export function getAdapterForToolType(toolType: MerveToolType) {
    switch (toolType) {
        case 'restaurant':
            return catalogToRestaurant;
        case 'provider':
            return catalogToServiceProvider;
        case 'activity':
            return catalogToActivity;
        case 'stay':
            return catalogToStay;
        default:
            return null;
    }
}

/**
 * Check if a catalog item is valid for Merve tool usage
 */
export function isMerveReady(item: CatalogItem): boolean {
    return !!(
        item.merve?.enabled &&
        item.merve.toolType &&
        item.merve.whatsappE164
    );
}
