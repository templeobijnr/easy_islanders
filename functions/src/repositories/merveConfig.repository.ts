/**
 * Merve Config Repository
 *
 * Manages the Merve Controller configuration per market.
 * Controls which tools are enabled, safety policies, and default templates.
 *
 * Location: markets/{marketId}/merve/config
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const db = getFirestore();

// ============================================================================
// TYPES
// ============================================================================

export interface MerveConfig {
    enabled: boolean;
    defaultLanguage: string;
    marketId: string;

    safety: {
        requireConfirmFor: string[];          // Tools that need YES confirmation
        maxOutboundPerInbound: number;        // Max WhatsApp messages per user message
    };

    tools: Record<string, ToolConfig>;

    updatedAt: Timestamp;
    updatedBy?: string;
}

export interface ToolConfig {
    enabled: boolean;

    // Data source configuration
    catalogQuery?: {
        domain?: string;                      // food, services, stays, etc.
        requireMerveEnabled: boolean;
    };
    vendorSource?: {
        collection: string;                   // e.g., "markets/{marketId}/vendors"
        types?: string[];                     // water, gas, groceries
    };

    // Template configuration
    defaultTemplate: string;

    // Tool-specific constraints
    allowedTags?: string[];                   // plumber, electrician, etc.
    requireConfirmation?: boolean;            // Override global setting
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: Omit<MerveConfig, 'marketId' | 'updatedAt'> = {
    enabled: true,
    defaultLanguage: 'en',
    safety: {
        requireConfirmFor: ['orderFood', 'bookService', 'bookActivity', 'bookStay', 'requestTaxi'],
        maxOutboundPerInbound: 3,
    },
    tools: {
        // ──────────────────────────────────────────────────────────────────
        // Core discovery / read tools (enabled by default)
        // ──────────────────────────────────────────────────────────────────
        // DEPRECATED: searchMarketplace disabled - use searchStays instead
        searchMarketplace: {
            enabled: false,
            defaultTemplate: '',
        },
        searchLocalPlaces: {
            enabled: true,
            defaultTemplate: '',
        },
        searchEvents: {
            enabled: true,
            defaultTemplate: '',
        },
        getRealTimeInfo: {
            enabled: true,
            defaultTemplate: '',
        },
        consultEncyclopedia: {
            enabled: true,
            defaultTemplate: '',
        },
        createConsumerRequest: {
            enabled: true,
            defaultTemplate: '',
        },
        getNearbyPlaces: {
            enabled: true,
            defaultTemplate: '',
        },
        computeDistance: {
            enabled: true,
            defaultTemplate: '',
        },
        fetchHotspots: {
            enabled: true,
            defaultTemplate: '',
        },
        getAreaInfo: {
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

        // ──────────────────────────────────────────────────────────────────
        // Booking / payments (keep enabled; confirmations are gate-enforced)
        // ──────────────────────────────────────────────────────────────────
        initiateBooking: {
            enabled: true,
            defaultTemplate: '',
        },
        scheduleViewing: {
            enabled: true,
            defaultTemplate: '',
        },
        createPaymentIntent: {
            // Disabled for initial launch (Stripe is not wired end-to-end).
            enabled: false,
            defaultTemplate: '',
        },

        // ──────────────────────────────────────────────────────────────────
        // Messaging primitives (dangerous; disable by default)
        // ──────────────────────────────────────────────────────────────────
        sendWhatsAppMessage: {
            enabled: false,
            defaultTemplate: '',
        },
        sendAppNotification: {
            enabled: true,
            defaultTemplate: '',
        },
        sendEmailNotification: {
            enabled: false,
            defaultTemplate: '',
        },

        // ──────────────────────────────────────────────────────────────────
        // Social / community tools (enabled)
        // ──────────────────────────────────────────────────────────────────
        getUserProfile: { enabled: true, defaultTemplate: '' },
        updateUserProfile: { enabled: true, defaultTemplate: '' },
        saveFavoriteItem: { enabled: true, defaultTemplate: '' },
        listFavorites: { enabled: true, defaultTemplate: '' },
        // ──────────────────────────────────────────────────────────────────
        // Address book tools (deliveries must fail-closed without address)
        // ──────────────────────────────────────────────────────────────────
        listUserAddresses: { enabled: true, defaultTemplate: '' },
        createOrUpdateAddress: { enabled: true, defaultTemplate: '' },
        setDefaultAddress: { enabled: true, defaultTemplate: '' },
        // Disabled for initial launch (social features).
        waveUser: { enabled: false, defaultTemplate: '' },
        acceptWave: { enabled: false, defaultTemplate: '' },
        listNearbyUsers: { enabled: true, defaultTemplate: '' },
        checkInToPlace: { enabled: true, defaultTemplate: '' },
        getCheckInsForPlace: { enabled: true, defaultTemplate: '' },
        fetchVibeMapData: { enabled: true, defaultTemplate: '' },
        createTribe: { enabled: false, defaultTemplate: '' },
        joinTribe: { enabled: false, defaultTemplate: '' },
        leaveTribe: { enabled: false, defaultTemplate: '' },
        postToTribe: { enabled: false, defaultTemplate: '' },
        listTribeMessages: { enabled: false, defaultTemplate: '' },
        getTribeInfo: { enabled: false, defaultTemplate: '' },
        listTrendingTribes: { enabled: false, defaultTemplate: '' },

        // ──────────────────────────────────────────────────────────────────
        // Itinerary tools (enabled)
        // ──────────────────────────────────────────────────────────────────
        createItinerary: { enabled: true, defaultTemplate: '' },
        addToItinerary: { enabled: true, defaultTemplate: '' },
        removeFromItinerary: { enabled: true, defaultTemplate: '' },
        getItinerary: { enabled: true, defaultTemplate: '' },
        saveItinerary: { enabled: true, defaultTemplate: '' },

        // ──────────────────────────────────────────────────────────────────
        // Business tools (enabled)
        // ──────────────────────────────────────────────────────────────────
        updateBusinessInfo: { enabled: true, defaultTemplate: '' },
        updateBusinessAvailability: { enabled: true, defaultTemplate: '' },
        updateBusinessHours: { enabled: true, defaultTemplate: '' },
        uploadBusinessMedia: { enabled: true, defaultTemplate: '' },
        listBusinessLeads: { enabled: true, defaultTemplate: '' },
        respondToLead: { enabled: true, defaultTemplate: '' },

        // ──────────────────────────────────────────────────────────────────
        // V1 Ops tools (enabled)
        // ──────────────────────────────────────────────────────────────────
        searchHousingListings: { enabled: true, defaultTemplate: '' },
        createServiceRequest: { enabled: true, defaultTemplate: '' },
        createOrder: { enabled: true, defaultTemplate: '' },
        searchPlaces: { enabled: true, defaultTemplate: '' },
        orderHouseholdSupplies: { enabled: true, defaultTemplate: '' },
        requestService: { enabled: true, defaultTemplate: '' },

        // ──────────────────────────────────────────────────────────────────
        // V1 Consumer tools (enabled)
        // ──────────────────────────────────────────────────────────────────
        searchRestaurants: { enabled: true, defaultTemplate: '' },
        getExchangeRate: { enabled: true, defaultTemplate: '' },

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
            defaultTemplate: '',  // Read-only tool, no dispatch
        },
        getNews: {
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
        dispatchTaxi: {
            enabled: true,
            defaultTemplate: '',
        },
    },
};

// ============================================================================
// REPOSITORY
// ============================================================================

export const merveConfigRepository = {
    /**
     * Get Merve config for a market
     */
    async getMerveConfig(marketId: string): Promise<MerveConfig> {
        const doc = await db.doc(`markets/${marketId}/merve/config`).get();

        if (!doc.exists) {
            // Return default config if none exists
            return {
                ...DEFAULT_CONFIG,
                marketId,
                updatedAt: Timestamp.now(),
            };
        }

        // Merge in defaults so newly-added tools/policies don't disappear
        // and so runtime gating doesn't fail-closed for missing entries.
        const raw = doc.data() as Partial<MerveConfig> | undefined;
        const mergedTools = {
            ...DEFAULT_CONFIG.tools,
            ...(raw?.tools || {}),
        } as Record<string, ToolConfig>;

        return {
            ...DEFAULT_CONFIG,
            ...(raw || {}),
            marketId,
            safety: {
                ...DEFAULT_CONFIG.safety,
                ...(raw?.safety || {}),
            },
            tools: mergedTools,
            updatedAt: (raw as any)?.updatedAt || Timestamp.now(),
        } as MerveConfig;
    },

    /**
     * Check if a specific tool is enabled
     */
    async isToolEnabled(marketId: string, toolName: string): Promise<boolean> {
        const config = await this.getMerveConfig(marketId);

        if (!config.enabled) return false;

        const toolConfig = config.tools[toolName];
        return toolConfig?.enabled ?? false;
    },

    /**
     * Get configuration for a specific tool
     */
    async getToolPolicy(marketId: string, toolName: string): Promise<ToolConfig | null> {
        const config = await this.getMerveConfig(marketId);
        return config.tools[toolName] ?? null;
    },

    /**
     * Check if a tool requires confirmation
     */
    async requiresConfirmation(marketId: string, toolName: string): Promise<boolean> {
        const config = await this.getMerveConfig(marketId);

        // Check tool-specific override first
        const toolConfig = config.tools[toolName];
        if (toolConfig?.requireConfirmation !== undefined) {
            return toolConfig.requireConfirmation;
        }

        // Fall back to global safety list
        return config.safety.requireConfirmFor.includes(toolName);
    },

    /**
     * Update Merve config
     */
    async updateConfig(
        marketId: string,
        updates: Partial<MerveConfig>,
        updatedBy?: string
    ): Promise<void> {
        await db.doc(`markets/${marketId}/merve/config`).set(
            {
                ...updates,
                marketId,
                updatedAt: Timestamp.now(),
                updatedBy,
            },
            { merge: true }
        );
    },

    /**
     * Enable or disable a tool
     */
    async setToolEnabled(marketId: string, toolName: string, enabled: boolean): Promise<void> {
        await db.doc(`markets/${marketId}/merve/config`).set(
            {
                [`tools.${toolName}.enabled`]: enabled,
                updatedAt: Timestamp.now(),
            },
            { merge: true }
        );
    },

    /**
     * Initialize default config for a market
     */
    async initializeConfig(marketId: string, adminId?: string): Promise<MerveConfig> {
        const config: MerveConfig = {
            ...DEFAULT_CONFIG,
            marketId,
            updatedAt: Timestamp.now(),
            updatedBy: adminId,
        };

        await db.doc(`markets/${marketId}/merve/config`).set(config);
        return config;
    },
};
