"use strict";
/**
 * Merve Config Repository
 *
 * Manages the Merve Controller configuration per market.
 * Controls which tools are enabled, safety policies, and default templates.
 *
 * Location: markets/{marketId}/merve/config
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merveConfigRepository = void 0;
var firestore_1 = require("firebase-admin/firestore");
var db = (0, firestore_1.getFirestore)();
// ============================================================================
// DEFAULT CONFIG
// ============================================================================
var DEFAULT_CONFIG = {
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
            defaultTemplate: "\uD83C\uDF7D\uFE0F New Order from Easy Islanders\n\nCustomer: {customerName}\nPhone: {customerPhone}\n\n{items}\n\nTotal: {total}\nDeliver to: {address}\n{notes}",
        },
        bookService: {
            enabled: true,
            catalogQuery: { domain: 'services', requireMerveEnabled: true },
            allowedTags: ['plumber', 'electrician', 'handyman', 'ac_technician', 'painter', 'cleaner'],
            defaultTemplate: "\uD83D\uDD27 New Service Request\n\nService: {serviceType}\nCustomer: {customerName}\nPhone: {customerPhone}\nAddress: {address}\nUrgency: {urgency}\n\nDetails: {description}",
        },
        bookActivity: {
            enabled: true,
            catalogQuery: { domain: 'activities', requireMerveEnabled: true },
            defaultTemplate: "\uD83C\uDFAF New Booking Request\n\nActivity: {activityName}\nCustomer: {customerName}\nPhone: {customerPhone}\nDate: {date}\nGuests: {guests}\n\nNotes: {notes}",
        },
        bookStay: {
            enabled: true,
            catalogQuery: { domain: 'stays', requireMerveEnabled: true },
            defaultTemplate: "\uD83C\uDFE8 New Booking Request\n\nProperty: {propertyName}\nCustomer: {customerName}\nPhone: {customerPhone}\nCheck-in: {checkIn}\nCheck-out: {checkOut}\nGuests: {guests}\n\nNotes: {notes}",
        },
        orderWaterGas: {
            enabled: false,
            vendorSource: { collection: 'markets/{marketId}/vendors', types: ['water', 'gas'] },
            defaultTemplate: "\uD83D\uDCE6 Delivery Request\n\nProduct: {product}\nQuantity: {qty}\nCustomer: {customerName}\nPhone: {customerPhone}\nAddress: {address}",
        },
        findPharmacy: {
            enabled: true,
            defaultTemplate: '', // Read-only tool, no dispatch
        },
        getNews: {
            enabled: true,
            defaultTemplate: '',
        },
        requestTaxi: {
            enabled: true,
            defaultTemplate: "\uD83D\uDE95 Taxi Request\n\nCustomer: {customerName}\nPhone: {customerPhone}\nPickup: {pickupLocation}\nDestination: {destination}\nPickup Time: {pickupTime}",
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
exports.merveConfigRepository = {
    /**
     * Get Merve config for a market
     */
    getMerveConfig: function (marketId) {
        return __awaiter(this, void 0, void 0, function () {
            var doc, raw, mergedTools;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.doc("markets/".concat(marketId, "/merve/config")).get()];
                    case 1:
                        doc = _a.sent();
                        if (!doc.exists) {
                            // Return default config if none exists
                            return [2 /*return*/, __assign(__assign({}, DEFAULT_CONFIG), { marketId: marketId, updatedAt: firestore_1.Timestamp.now() })];
                        }
                        raw = doc.data();
                        mergedTools = __assign(__assign({}, DEFAULT_CONFIG.tools), ((raw === null || raw === void 0 ? void 0 : raw.tools) || {}));
                        return [2 /*return*/, __assign(__assign(__assign({}, DEFAULT_CONFIG), (raw || {})), { marketId: marketId, safety: __assign(__assign({}, DEFAULT_CONFIG.safety), ((raw === null || raw === void 0 ? void 0 : raw.safety) || {})), tools: mergedTools, updatedAt: (raw === null || raw === void 0 ? void 0 : raw.updatedAt) || firestore_1.Timestamp.now() })];
                }
            });
        });
    },
    /**
     * Check if a specific tool is enabled
     */
    isToolEnabled: function (marketId, toolName) {
        return __awaiter(this, void 0, void 0, function () {
            var config, toolConfig;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getMerveConfig(marketId)];
                    case 1:
                        config = _b.sent();
                        if (!config.enabled)
                            return [2 /*return*/, false];
                        toolConfig = config.tools[toolName];
                        return [2 /*return*/, (_a = toolConfig === null || toolConfig === void 0 ? void 0 : toolConfig.enabled) !== null && _a !== void 0 ? _a : false];
                }
            });
        });
    },
    /**
     * Get configuration for a specific tool
     */
    getToolPolicy: function (marketId, toolName) {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.getMerveConfig(marketId)];
                    case 1:
                        config = _b.sent();
                        return [2 /*return*/, (_a = config.tools[toolName]) !== null && _a !== void 0 ? _a : null];
                }
            });
        });
    },
    /**
     * Check if a tool requires confirmation
     */
    requiresConfirmation: function (marketId, toolName) {
        return __awaiter(this, void 0, void 0, function () {
            var config, toolConfig;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getMerveConfig(marketId)];
                    case 1:
                        config = _a.sent();
                        toolConfig = config.tools[toolName];
                        if ((toolConfig === null || toolConfig === void 0 ? void 0 : toolConfig.requireConfirmation) !== undefined) {
                            return [2 /*return*/, toolConfig.requireConfirmation];
                        }
                        // Fall back to global safety list
                        return [2 /*return*/, config.safety.requireConfirmFor.includes(toolName)];
                }
            });
        });
    },
    /**
     * Update Merve config
     */
    updateConfig: function (marketId, updates, updatedBy) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db.doc("markets/".concat(marketId, "/merve/config")).set(__assign(__assign({}, updates), { marketId: marketId, updatedAt: firestore_1.Timestamp.now(), updatedBy: updatedBy }), { merge: true })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Enable or disable a tool
     */
    setToolEnabled: function (marketId, toolName, enabled) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, db.doc("markets/".concat(marketId, "/merve/config")).set((_a = {},
                            _a["tools.".concat(toolName, ".enabled")] = enabled,
                            _a.updatedAt = firestore_1.Timestamp.now(),
                            _a), { merge: true })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/];
                }
            });
        });
    },
    /**
     * Initialize default config for a market
     */
    initializeConfig: function (marketId, adminId) {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        config = __assign(__assign({}, DEFAULT_CONFIG), { marketId: marketId, updatedAt: firestore_1.Timestamp.now(), updatedBy: adminId });
                        return [4 /*yield*/, db.doc("markets/".concat(marketId, "/merve/config")).set(config)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, config];
                }
            });
        });
    },
};
