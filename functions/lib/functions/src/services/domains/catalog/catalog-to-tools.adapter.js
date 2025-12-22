"use strict";
/**
 * Catalog to Tools Adapter
 *
 * Converts generic CatalogItem to tool-specific formats.
 * Returns Result pattern (ok/fail) instead of throwing.
 *
 * @module catalog-to-tools.adapter
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAction = hasAction;
exports.catalogToRestaurant = catalogToRestaurant;
exports.catalogToServiceProvider = catalogToServiceProvider;
exports.catalogToActivity = catalogToActivity;
exports.catalogToStay = catalogToStay;
exports.getAdapterForToolType = getAdapterForToolType;
exports.isMerveReady = isMerveReady;
// ============================================================================
// HELPER: Get dispatch template from actions or legacy field
// ============================================================================
function getDispatchTemplate(merve, actionType, defaultTemplate) {
    var _a, _b;
    // Find the action in the actions array
    const action = (_a = merve.actions) === null || _a === void 0 ? void 0 : _a.find(a => a.actionType === actionType && a.enabled);
    if ((_b = action === null || action === void 0 ? void 0 : action.dispatch) === null || _b === void 0 ? void 0 : _b.template) {
        return action.dispatch.template;
    }
    // Fallback to default
    return defaultTemplate;
}
// Check if item has a specific action enabled
function hasAction(merve, actionType) {
    var _a, _b, _c, _d;
    // Check actions[] first
    if ((_a = merve.actions) === null || _a === void 0 ? void 0 : _a.some(a => a.actionType === actionType && a.enabled)) {
        return true;
    }
    // Backward compat: infer from legacy toolType
    if (!((_b = merve.actions) === null || _b === void 0 ? void 0 : _b.length) && merve.toolType) {
        const legacyActionMap = {
            restaurant: ['order_food', 'reserve_table'],
            provider: ['book_service', 'request_service'],
            activity: ['book_activity'],
            stay: ['book_stay', 'inquire'],
        };
        return (_d = (_c = legacyActionMap[merve.toolType]) === null || _c === void 0 ? void 0 : _c.includes(actionType)) !== null && _d !== void 0 ? _d : false;
    }
    return false;
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
function catalogToRestaurant(item, _menuItems) {
    var _a, _b, _c, _d, _e;
    // Validate Merve integration
    if (!((_a = item.merve) === null || _a === void 0 ? void 0 : _a.enabled)) {
        return { ok: false, reason: 'Item is not Merve-enabled' };
    }
    if (item.merve.toolType !== 'restaurant') {
        return { ok: false, reason: `Expected toolType 'restaurant', got '${item.merve.toolType}'` };
    }
    if (!item.merve.whatsappE164) {
        return { ok: false, reason: 'Missing whatsappE164 for dispatch' };
    }
    // Extract address from attributes or use name as fallback
    const address = ((_b = item.attributes) === null || _b === void 0 ? void 0 : _b.address) || item.name;
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
            priceRange: (_c = item.attributes) === null || _c === void 0 ? void 0 : _c.priceRange,
            rating: (_d = item.attributes) === null || _d === void 0 ? void 0 : _d.rating,
            imageUrl: (_e = item.images) === null || _e === void 0 ? void 0 : _e[0],
        },
    };
}
/**
 * Convert CatalogItem to ServiceProvider format
 */
function catalogToServiceProvider(item) {
    var _a, _b, _c;
    if (!((_a = item.merve) === null || _a === void 0 ? void 0 : _a.enabled)) {
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
            rating: (_b = item.attributes) === null || _b === void 0 ? void 0 : _b.rating,
            responseTime: (_c = item.attributes) === null || _c === void 0 ? void 0 : _c.responseTime,
        },
    };
}
/**
 * Convert CatalogItem to Activity format
 */
function catalogToActivity(item) {
    var _a, _b, _c, _d;
    if (!((_a = item.merve) === null || _a === void 0 ? void 0 : _a.enabled)) {
        return { ok: false, reason: 'Item is not Merve-enabled' };
    }
    if (item.merve.toolType !== 'activity') {
        return { ok: false, reason: `Expected toolType 'activity', got '${item.merve.toolType}'` };
    }
    if (!item.merve.whatsappE164) {
        return { ok: false, reason: 'Missing whatsappE164 for dispatch' };
    }
    const address = ((_b = item.attributes) === null || _b === void 0 ? void 0 : _b.address) || item.name;
    return {
        ok: true,
        value: {
            id: item.id,
            name: item.name,
            whatsappE164: item.merve.whatsappE164,
            address,
            description: item.description,
            price: (_c = item.price) !== null && _c !== void 0 ? _c : undefined,
            currency: (_d = item.currency) !== null && _d !== void 0 ? _d : undefined,
            geo: item.merve.geo,
            dispatchTemplate: getDispatchTemplate(item.merve, 'book_activity', DEFAULT_TEMPLATES.activity),
        },
    };
}
/**
 * Convert CatalogItem to Stay format
 */
function catalogToStay(item) {
    var _a, _b, _c, _d;
    if (!((_a = item.merve) === null || _a === void 0 ? void 0 : _a.enabled)) {
        return { ok: false, reason: 'Item is not Merve-enabled' };
    }
    if (item.merve.toolType !== 'stay') {
        return { ok: false, reason: `Expected toolType 'stay', got '${item.merve.toolType}'` };
    }
    if (!item.merve.whatsappE164) {
        return { ok: false, reason: 'Missing whatsappE164 for dispatch' };
    }
    const address = ((_b = item.attributes) === null || _b === void 0 ? void 0 : _b.address) || item.name;
    return {
        ok: true,
        value: {
            id: item.id,
            name: item.name,
            whatsappE164: item.merve.whatsappE164,
            address,
            description: item.description,
            pricePerNight: (_c = item.price) !== null && _c !== void 0 ? _c : undefined,
            currency: (_d = item.currency) !== null && _d !== void 0 ? _d : undefined,
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
function getAdapterForToolType(toolType) {
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
function isMerveReady(item) {
    var _a;
    return !!(((_a = item.merve) === null || _a === void 0 ? void 0 : _a.enabled) &&
        item.merve.toolType &&
        item.merve.whatsappE164);
}
//# sourceMappingURL=catalog-to-tools.adapter.js.map