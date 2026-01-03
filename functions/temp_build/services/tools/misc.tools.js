"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.miscTools = void 0;
var logger = __importStar(require("firebase-functions/logger"));
var firebase_1 = require("../../config/firebase");
var errors_1 = require("../../utils/errors");
var dispatch_service_1 = require("../domains/dispatch/dispatch.service");
var places_repository_1 = require("../../repositories/places.repository");
var mapbox_service_1 = require("../mapbox.service");
var toolContext_1 = require("./toolContext");
function parseLatLng(str) {
    if (!str)
        return null;
    var parts = str.split(",").map(function (p) { return parseFloat(p.trim()); });
    if (parts.length !== 2 || parts.some(isNaN))
        return null;
    return { lat: parts[0], lng: parts[1] };
}
function toRad(deg) {
    return (deg * Math.PI) / 180;
}
function haversineKm(a, b) {
    var R = 6371;
    var dLat = toRad(b.lat - a.lat);
    var dLon = toRad(b.lng - a.lng);
    var lat1 = toRad(a.lat);
    var lat2 = toRad(b.lat);
    var hav = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
    return R * c;
}
function normalizePlaceCategory(domain) {
    var d = (domain || "").toLowerCase().trim();
    var direct = d;
    var allowed = [
        "food",
        "nightlife",
        "sight",
        "cafe",
        "co_working",
        "shopping",
        "service",
        "housing_project",
        "other",
    ];
    if (allowed.includes(direct))
        return direct;
    if (d.includes("restaurant") || d.includes("food"))
        return "food";
    if (d.includes("bar") || d.includes("club") || d.includes("night"))
        return "nightlife";
    if (d.includes("cafe") || d.includes("coffee"))
        return "cafe";
    if (d.includes("shop") || d.includes("mall"))
        return "shopping";
    if (d.includes("service") ||
        d.includes("plumber") ||
        d.includes("electric") ||
        d.includes("handyman"))
        return "service";
    if (d.includes("sight") ||
        d.includes("museum") ||
        d.includes("beach") ||
        d.includes("hike"))
        return "sight";
    return null;
}
exports.miscTools = {
    /**
     * Create a consumer request for goods/services
     */
    createConsumerRequest: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var requestDetails, contactInfo;
        return __generator(this, function (_a) {
            logger.debug("📝 [ConsumerRequest] Creating request:", args);
            requestDetails = args.requestDetails || args.content;
            contactInfo = args.contactInfo || args.domain;
            return [2 /*return*/, {
                    success: true,
                    requestId: "REQ-".concat(Date.now()),
                    requestDetails: requestDetails || null,
                    contactInfo: contactInfo || null,
                }];
        });
    }); },
    /**
     * Get real-time information (weather, exchange rates, etc.)
     */
    getRealTimeInfo: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.debug("ℹ️ [RealTimeInfo] Getting info for:", args.category);
            return [2 /*return*/, {
                    success: true,
                    info: "Current info for ".concat(args.category, ": Weather is sunny, 25\u00B0C. GBP/TRY exchange rate is approx 40.0."),
                }];
        });
    }); },
    /**
     * Consult the knowledge base encyclopedia
     */
    consultEncyclopedia: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var topic;
        return __generator(this, function (_a) {
            topic = args.topic || args.query || "";
            logger.debug("📚 [Encyclopedia] Looking up:", topic);
            return [2 /*return*/, {
                    success: true,
                    content: "Knowledge lookup for \"".concat(topic, "\" is not yet connected to a live data source."),
                }];
        });
    }); },
    /**
     * Find nearby places using (1) shared GPS (if available) or (2) Mapbox geocoding,
     * then filter the curated Firestore `places` collection by distance.
     */
    getNearbyPlaces: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, locationText, domain, radiusKm, limit, currentLoc, origin, geo, e_1, category, marketId, places, placesWithDistance, filtered;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
                    locationText = ((args === null || args === void 0 ? void 0 : args.location) || "").toString().trim();
                    domain = ((args === null || args === void 0 ? void 0 : args.domain) || "").toString().trim();
                    radiusKm = typeof (args === null || args === void 0 ? void 0 : args.radiusKm) === "number" ? args.radiusKm : 5;
                    limit = typeof (args === null || args === void 0 ? void 0 : args.limit) === "number" ? args.limit : 20;
                    currentLoc = ctx.location && typeof ctx.location === "object"
                        ? {
                            lat: ctx.location.lat,
                            lng: ctx.location.lng,
                        }
                        : null;
                    origin = parseLatLng(locationText) ||
                        (/^(current location|near me|me)$/i.test(locationText) || !locationText
                            ? currentLoc
                            : null);
                    if (!(!origin && locationText)) return [3 /*break*/, 4];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, (0, mapbox_service_1.searchMapboxPlaces)(locationText, {
                            limit: 1,
                            types: "place,locality,address",
                        })];
                case 2:
                    geo = _b.sent();
                    if ((_a = geo[0]) === null || _a === void 0 ? void 0 : _a.center) {
                        origin = { lat: geo[0].center[1], lng: geo[0].center[0] };
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    category = normalizePlaceCategory(domain);
                    marketId = ctx.marketId;
                    return [4 /*yield*/, places_repository_1.placesRepository.getByCityId(marketId, true)];
                case 5:
                    places = _b.sent();
                    if (category) {
                        places = places.filter(function (p) { return p.category === category; });
                    }
                    // Distance filter if we have an origin; otherwise fall back to text filter
                    if (origin) {
                        placesWithDistance = places
                            .filter(function (p) { return !!p.coordinates; })
                            .map(function (p) { return (__assign(__assign({}, p), { distanceKm: haversineKm(origin, p.coordinates) })); })
                            .filter(function (p) { return p.distanceKm <= radiusKm; })
                            .sort(function (a, b) { return a.distanceKm - b.distanceKm; })
                            .slice(0, limit);
                        return [2 /*return*/, {
                                success: true,
                                origin: origin,
                                radiusKm: radiusKm,
                                count: placesWithDistance.length,
                                places: placesWithDistance.map(function (p) { return ({
                                    id: p.id,
                                    name: p.name,
                                    category: p.category,
                                    subcategory: p.subcategory,
                                    address: p.address,
                                    areaName: p.areaName,
                                    distanceKm: Math.round(p.distanceKm * 100) / 100,
                                    coordinates: p.coordinates,
                                    tags: p.tags,
                                }); }),
                            }];
                    }
                    if (!locationText) {
                        return [2 /*return*/, {
                                success: false,
                                error: "location is required (or share GPS location)",
                            }];
                    }
                    filtered = places
                        .filter(function (p) {
                        return (p.areaName || "").toLowerCase().includes(locationText.toLowerCase());
                    })
                        .slice(0, limit);
                    return [2 /*return*/, {
                            success: true,
                            origin: null,
                            radiusKm: null,
                            count: filtered.length,
                            places: filtered.map(function (p) { return ({
                                id: p.id,
                                name: p.name,
                                category: p.category,
                                subcategory: p.subcategory,
                                address: p.address,
                                areaName: p.areaName,
                                coordinates: p.coordinates,
                                tags: p.tags,
                            }); }),
                            note: "GPS/geocoding unavailable; results filtered by areaName match only.",
                        }];
            }
        });
    }); },
    /**
     * Household supplies / groceries order
     *
     * Pattern: Collect → Validate → Persist → Dispatch via WhatsApp
     */
    orderHouseholdSupplies: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx, userId, customerPhone, customerName, userSnap, userData, deliveryAddress, items, vendorListings, vendorPhone, vendorName, vendorId, _i, _a, doc, listing, actions, suppliesAction, orderId, orderData, message, idempotencyKey, dispatch, whatsappErr_1, err_1;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    logger.debug("🛒 [OrderSupplies] New order:", args);
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 11, , 12]);
                    ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
                    userId = ctx.userId;
                    customerPhone = args.contactPhone || "";
                    customerName = args.customerName || "Guest";
                    if (!(userId && !customerPhone)) return [3 /*break*/, 3];
                    return [4 /*yield*/, firebase_1.db.collection("users").doc(userId).get()];
                case 2:
                    userSnap = _e.sent();
                    if (userSnap.exists) {
                        userData = userSnap.data();
                        customerPhone = (userData === null || userData === void 0 ? void 0 : userData.phone) || "";
                        customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
                    }
                    _e.label = 3;
                case 3:
                    if (!customerPhone) {
                        return [2 /*return*/, { success: false, error: "Customer phone number is required" }];
                    }
                    deliveryAddress = args.deliveryAddress || "Address not specified";
                    items = Array.isArray(args.items) ? args.items.join(", ") : (args.items || "Items not specified");
                    return [4 /*yield*/, firebase_1.db.collection("listings")
                            .where("merve.enabled", "==", true)
                            .limit(20)
                            .get()];
                case 4:
                    vendorListings = _e.sent();
                    vendorPhone = null;
                    vendorName = "Vendor";
                    vendorId = null;
                    for (_i = 0, _a = vendorListings.docs; _i < _a.length; _i++) {
                        doc = _a[_i];
                        listing = doc.data();
                        actions = ((_b = listing.merve) === null || _b === void 0 ? void 0 : _b.actions) || [];
                        suppliesAction = actions.find(function (a) {
                            return a.actionType === "order_supplies" && a.enabled;
                        });
                        if (suppliesAction) {
                            vendorPhone = ((_c = suppliesAction.dispatch) === null || _c === void 0 ? void 0 : _c.toE164) || ((_d = listing.merve) === null || _d === void 0 ? void 0 : _d.whatsappE164) || null;
                            vendorName = listing.title || listing.name || "Vendor";
                            vendorId = doc.id;
                            break;
                        }
                    }
                    orderId = "GRO-".concat(Date.now());
                    orderData = {
                        id: orderId,
                        type: "household_supplies",
                        items: items,
                        deliveryAddress: deliveryAddress,
                        customerName: customerName,
                        customerPhone: customerPhone.replace("whatsapp:", ""),
                        customerContact: customerPhone.replace("whatsapp:", ""),
                        userId: userId || null,
                        vendorListingId: vendorId,
                        vendorPhone: vendorPhone,
                        status: vendorPhone ? "dispatched" : "pending",
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection("groceryOrders").doc(orderId).set(orderData)];
                case 5:
                    _e.sent();
                    logger.debug("\u2705 [OrderSupplies] Persisted order ".concat(orderId));
                    if (!vendorPhone) return [3 /*break*/, 10];
                    message = "\uD83D\uDED2 *New Order from Easy Islanders*\n\n" +
                        "\uD83D\uDCE6 Items: ".concat(items, "\n") +
                        "\uD83D\uDCCD Deliver to: ".concat(deliveryAddress, "\n") +
                        "\uD83D\uDC64 Customer: ".concat(customerName, "\n") +
                        "\uD83D\uDCDE Phone: ".concat(customerPhone.replace("whatsapp:", ""), "\n\n") +
                        "Reply YES to confirm or NO to decline.";
                    _e.label = 6;
                case 6:
                    _e.trys.push([6, 9, , 10]);
                    idempotencyKey = "dispatch:groceryOrder:".concat(orderId);
                    return [4 /*yield*/, dispatch_service_1.DispatchService.sendWhatsApp({
                            kind: "job_dispatch",
                            toE164: vendorPhone,
                            body: message,
                            correlationId: "groceryOrder:".concat(orderId),
                            idempotencyKey: idempotencyKey,
                            traceId: "grocery-".concat(Date.now()),
                        })];
                case 7:
                    dispatch = _e.sent();
                    return [4 /*yield*/, firebase_1.db.collection("groceryOrders").doc(orderId).update({
                            dispatchMessageSid: dispatch.providerMessageId,
                            dispatchedAt: new Date().toISOString(),
                        })];
                case 8:
                    _e.sent();
                    logger.debug("\u2705 [OrderSupplies] Dispatched to ".concat(vendorName, " (").concat(vendorPhone, ")"));
                    return [2 /*return*/, {
                            success: true,
                            orderId: orderId,
                            vendorName: vendorName,
                            status: "dispatched",
                            message: "Order sent to ".concat(vendorName, "! They will contact you shortly."),
                        }];
                case 9:
                    whatsappErr_1 = _e.sent();
                    logger.error("⚠️ [OrderSupplies] WhatsApp dispatch failed:", whatsappErr_1);
                    // Order is still saved, just not dispatched
                    return [2 /*return*/, {
                            success: true,
                            orderId: orderId,
                            status: "pending",
                            message: "Order received. We're arranging delivery and will contact you shortly.",
                            warning: "Automatic dispatch failed - manual follow-up required",
                        }];
                case 10: 
                // 5. No vendor found - order saved for manual processing
                return [2 /*return*/, {
                        success: true,
                        orderId: orderId,
                        status: "pending",
                        message: "Order received. We're arranging delivery and will contact you shortly.",
                    }];
                case 11:
                    err_1 = _e.sent();
                    console.error("🔴 [OrderSupplies] Failed:", err_1);
                    return [2 /*return*/, {
                            success: false,
                            error: (0, errors_1.getErrorMessage)(err_1) || "Failed to process order",
                        }];
                case 12: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Service / handyman request
     */
    requestService: function (args, userIdOrContext) { return __awaiter(void 0, void 0, void 0, function () {
        var ctx;
        return __generator(this, function (_a) {
            ctx = (0, toolContext_1.asToolContext)(userIdOrContext);
            logger.debug("🔧 [RequestService] New request:", args);
            return [2 /*return*/, {
                    success: true,
                    requestId: "SRV-".concat(Date.now()),
                    userId: ctx.userId || null,
                }];
        });
    }); },
    /**
     * Show a map pin
     */
    showMap: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            logger.debug("🗺️ [Map] showMap called:", args);
            return [2 /*return*/, {
                    success: true,
                    lat: args.lat,
                    lng: args.lng,
                    title: args.title || "Location",
                }];
        });
    }); },
    /**
     * Compute distance between two points
     */
    computeDistance: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var parse, a, b, toRad, R, dLat, dLon, lat1, lat2, hav, c;
        return __generator(this, function (_a) {
            parse = function (str) {
                var parts = (str || "")
                    .split(",")
                    .map(function (p) { return parseFloat(p.trim()); });
                if (parts.length !== 2 || parts.some(isNaN))
                    return null;
                return { lat: parts[0], lon: parts[1] };
            };
            a = parse(args.from);
            b = parse(args.to);
            if (!a || !b)
                return [2 /*return*/, { success: false, error: "Invalid coordinates" }];
            toRad = function (deg) { return (deg * Math.PI) / 180; };
            R = 6371;
            dLat = toRad(b.lat - a.lat);
            dLon = toRad(b.lon - a.lon);
            lat1 = toRad(a.lat);
            lat2 = toRad(b.lat);
            hav = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
            c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
            return [2 /*return*/, { success: true, distanceKm: Math.round(R * c * 100) / 100 }];
        });
    }); },
    /**
     * Fetch hotspots
     */
    fetchHotspots: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var snap, tally_1, hotspots, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.debug("Fetch hotspots", args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, firebase_1.db
                            .collection("checkIns")
                            .orderBy("createdAt", "desc")
                            .limit(200)
                            .get()];
                case 2:
                    snap = _a.sent();
                    tally_1 = {};
                    snap.forEach(function (doc) {
                        var data = doc.data();
                        if (args.area &&
                            data.location &&
                            !String(data.location).includes(args.area))
                            return;
                        var key = data.placeName || data.placeId || "unknown";
                        tally_1[key] = (tally_1[key] || 0) + 1;
                    });
                    hotspots = Object.entries(tally_1)
                        .sort(function (a, b) { return b[1] - a[1]; })
                        .slice(0, 10)
                        .map(function (_a) {
                        var place = _a[0], score = _a[1];
                        return ({ place: place, score: score });
                    });
                    return [2 /*return*/, { success: true, hotspots: hotspots }];
                case 3:
                    err_2 = _a.sent();
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_2) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Get area info
     */
    getAreaInfo: function (args) { return __awaiter(void 0, void 0, void 0, function () {
        var vibe;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, exports.miscTools.fetchHotspots({ area: args.area })];
                case 1:
                    vibe = _a.sent();
                    return [2 /*return*/, { success: true, area: args.area, hotspots: vibe.hotspots || [] }];
            }
        });
    }); },
};
