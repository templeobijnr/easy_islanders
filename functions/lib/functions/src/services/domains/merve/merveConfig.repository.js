"use strict";
/**
 * Merve Config Repository
 *
 * Manages the Merve Controller configuration per market.
 * Controls which tools are enabled, safety policies, and default templates.
 *
 * Location: markets/{marketId}/merve/config
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.merveConfigRepository = void 0;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
// ============================================================================
// DEFAULT CONFIG
// ============================================================================
const DEFAULT_CONFIG = {
    enabled: true,
    defaultLanguage: 'en',
    safety: {
        requireConfirmFor: ['orderFood', 'bookService', 'bookActivity', 'bookStay', 'requestTaxi'],
        maxOutboundPerInbound: 3,
    },
    tools: {
        orderFood: {
            enabled: true,
            catalogQuery: { domain: 'food', requireMerveEnabled: true },
            defaultTemplate: `🍽️ New Order from Easy Islanders

Customer: {customerName}
Phone: {customerPhone}

{items}

Total: {total}
Deliver to: {address}
{notes}`,
        },
        bookService: {
            enabled: true,
            catalogQuery: { domain: 'services', requireMerveEnabled: true },
            allowedTags: ['plumber', 'electrician', 'handyman', 'ac_technician', 'painter', 'cleaner'],
            defaultTemplate: `🔧 New Service Request

Service: {serviceType}
Customer: {customerName}
Phone: {customerPhone}
Address: {address}
Urgency: {urgency}

Details: {description}`,
        },
        bookActivity: {
            enabled: true,
            catalogQuery: { domain: 'activities', requireMerveEnabled: true },
            defaultTemplate: `🎯 New Booking Request

Activity: {activityName}
Customer: {customerName}
Phone: {customerPhone}
Date: {date}
Guests: {guests}

Notes: {notes}`,
        },
        bookStay: {
            enabled: true,
            catalogQuery: { domain: 'stays', requireMerveEnabled: true },
            defaultTemplate: `🏨 New Booking Request

Property: {propertyName}
Customer: {customerName}
Phone: {customerPhone}
Check-in: {checkIn}
Check-out: {checkOut}
Guests: {guests}

Notes: {notes}`,
        },
        orderWaterGas: {
            enabled: false,
            vendorSource: { collection: 'markets/{marketId}/vendors', types: ['water', 'gas'] },
            defaultTemplate: `📦 Delivery Request

Product: {product}
Quantity: {qty}
Customer: {customerName}
Phone: {customerPhone}
Address: {address}`,
        },
        findPharmacy: {
            enabled: true,
            defaultTemplate: '', // Read-only tool, no dispatch
        },
        getNews: {
            enabled: true,
            defaultTemplate: '',
        },
        getExchangeRate: {
            enabled: true,
            defaultTemplate: '',
        },
        showDirections: {
            enabled: true,
            defaultTemplate: '',
        },
        findClosest: {
            enabled: true,
            defaultTemplate: '',
        },
        requestTaxi: {
            enabled: true,
            defaultTemplate: `🚕 Taxi Request

Customer: {customerName}
Phone: {customerPhone}
Pickup: {pickupLocation}
Destination: {destination}
Pickup Time: {pickupTime}`,
        },
    },
};
// ============================================================================
// REPOSITORY
// ============================================================================
exports.merveConfigRepository = {
    /**
     * Get Merve config for a market
     */
    async getMerveConfig(marketId) {
        const doc = await db.doc(`markets/${marketId}/merve/config`).get();
        if (!doc.exists) {
            // Return default config if none exists
            return Object.assign(Object.assign({}, DEFAULT_CONFIG), { marketId, updatedAt: firestore_1.Timestamp.now() });
        }
        return doc.data();
    },
    /**
     * Check if a specific tool is enabled
     */
    async isToolEnabled(marketId, toolName) {
        var _a;
        const config = await this.getMerveConfig(marketId);
        if (!config.enabled)
            return false;
        const toolConfig = config.tools[toolName];
        return (_a = toolConfig === null || toolConfig === void 0 ? void 0 : toolConfig.enabled) !== null && _a !== void 0 ? _a : false;
    },
    /**
     * Get configuration for a specific tool
     */
    async getToolPolicy(marketId, toolName) {
        var _a;
        const config = await this.getMerveConfig(marketId);
        return (_a = config.tools[toolName]) !== null && _a !== void 0 ? _a : null;
    },
    /**
     * Check if a tool requires confirmation
     */
    async requiresConfirmation(marketId, toolName) {
        const config = await this.getMerveConfig(marketId);
        // Check tool-specific override first
        const toolConfig = config.tools[toolName];
        if ((toolConfig === null || toolConfig === void 0 ? void 0 : toolConfig.requireConfirmation) !== undefined) {
            return toolConfig.requireConfirmation;
        }
        // Fall back to global safety list
        return config.safety.requireConfirmFor.includes(toolName);
    },
    /**
     * Update Merve config
     */
    async updateConfig(marketId, updates, updatedBy) {
        await db.doc(`markets/${marketId}/merve/config`).set(Object.assign(Object.assign({}, updates), { marketId, updatedAt: firestore_1.Timestamp.now(), updatedBy }), { merge: true });
    },
    /**
     * Enable or disable a tool
     */
    async setToolEnabled(marketId, toolName, enabled) {
        await db.doc(`markets/${marketId}/merve/config`).set({
            [`tools.${toolName}.enabled`]: enabled,
            updatedAt: firestore_1.Timestamp.now(),
        }, { merge: true });
    },
    /**
     * Initialize default config for a market
     */
    async initializeConfig(marketId, adminId) {
        const config = Object.assign(Object.assign({}, DEFAULT_CONFIG), { marketId, updatedAt: firestore_1.Timestamp.now(), updatedBy: adminId });
        await db.doc(`markets/${marketId}/merve/config`).set(config);
        return config;
    },
};
//# sourceMappingURL=merveConfig.repository.js.map