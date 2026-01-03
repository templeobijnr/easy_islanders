"use strict";
/**
 * Admin-Controlled Catalog Types
 *
 * These types define the Firestore collections that power Merve's tools.
 * All data is managed via the admin panel (Control Tower).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLLECTIONS = void 0;
// ============================================================================
// COLLECTION PATHS
// ============================================================================
exports.COLLECTIONS = {
    restaurants: 'restaurants',
    menuItems: function (restaurantId) { return "restaurants/".concat(restaurantId, "/menu"); },
    vendors: 'vendors',
    serviceProviders: 'service_providers',
    pharmaciesOnDuty: 'pharmacies_on_duty',
    newsCache: 'news_cache',
    foodOrders: 'food_orders',
    serviceRequests: 'service_requests',
};
