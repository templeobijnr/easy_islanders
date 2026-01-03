"use strict";
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
exports.foodTools = void 0;
var errors_1 = require("../../utils/errors");
/**
 * Consumer Tools: Food Ordering
 *
 * Pattern: Read → Propose → Confirm → Apply/Dispatch
 *
 * This tool searches restaurants, builds orders, and dispatches via WhatsApp.
 */
var firestore_1 = require("firebase-admin/firestore");
var logger = __importStar(require("firebase-functions/logger"));
var firebase_1 = require("../../config/firebase");
var merveListings_repository_1 = require("../../repositories/merveListings.repository");
var listing_data_repository_1 = require("../../repositories/listing-data.repository");
var catalog_types_1 = require("../../types/catalog.types");
var merveConfig_repository_1 = require("../../repositories/merveConfig.repository");
var template_1 = require("../domains/merve/template");
// ============================================================================
// TOOL IMPLEMENTATION
// ============================================================================
exports.foodTools = {
    /**
     * Search restaurants by cuisine, name, or area
     */
    searchRestaurants: function (args, ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var restaurants, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger.info('[FoodTools] Searching restaurants', args);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.searchByAction({
                            actionType: 'order_food',
                            name: args.name,
                            area: args.area,
                            tag: args.cuisine,
                            marketId: ctx === null || ctx === void 0 ? void 0 : ctx.marketId,
                            limit: 10,
                        })];
                case 2:
                    restaurants = _a.sent();
                    if (restaurants.length === 0) {
                        return [2 /*return*/, {
                                success: true,
                                restaurants: [],
                                message: 'No restaurants found matching your criteria.',
                            }];
                    }
                    return [2 /*return*/, {
                            success: true,
                            restaurants: restaurants.map(function (r) { return ({
                                id: r.id,
                                name: (r.title || r.name || '').trim(),
                                cuisines: (r.merve.tags || r.tags || []).join(', '),
                                address: (r.address || ''),
                                rating: r.rating,
                                priceRange: r.priceRange || r.priceLevel,
                            }); }),
                            message: "Found ".concat(restaurants.length, " restaurant(s)."),
                        }];
                case 3:
                    err_1 = _a.sent();
                    logger.error('[FoodTools] Search failed', err_1);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_1) }];
                case 4: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Get menu for a specific restaurant
     */
    getRestaurantMenu: function (args, ctx) { return __awaiter(void 0, void 0, void 0, function () {
        var restaurant, action, kind, menu, grouped, _i, menu_1, item, category, err_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    logger.info('[FoodTools] Getting menu', args);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.findById(args.restaurantId)];
                case 2:
                    restaurant = _c.sent();
                    if (!restaurant) {
                        return [2 /*return*/, { success: false, error: 'Restaurant not found' }];
                    }
                    if (!((_a = restaurant.merve) === null || _a === void 0 ? void 0 : _a.enabled)) {
                        return [2 /*return*/, { success: false, error: 'Restaurant is not Merve-enabled' }];
                    }
                    action = merveListings_repository_1.merveListingsRepository.getEnabledAction(restaurant.merve, 'order_food');
                    if (!action) {
                        return [2 /*return*/, { success: false, error: 'Restaurant does not support ordering' }];
                    }
                    kind = (((_b = action.data) === null || _b === void 0 ? void 0 : _b.kind) || 'menuItems');
                    return [4 /*yield*/, listing_data_repository_1.listingDataRepository.listItems(args.restaurantId, kind)];
                case 3:
                    menu = _c.sent();
                    grouped = {};
                    for (_i = 0, menu_1 = menu; _i < menu_1.length; _i++) {
                        item = menu_1[_i];
                        category = item.category || 'Uncategorized';
                        if (!grouped[category])
                            grouped[category] = [];
                        grouped[category].push(item);
                    }
                    return [2 /*return*/, {
                            success: true,
                            restaurantName: (restaurant.title || restaurant.name || '').trim(),
                            menu: grouped,
                            menuItems: menu.map(function (m) { return ({
                                id: m.id,
                                name: m.name,
                                price: m.price,
                                currency: m.currency,
                                category: m.category,
                                description: m.description,
                            }); }),
                        }];
                case 4:
                    err_2 = _c.sent();
                    logger.error('[FoodTools] Menu fetch failed', err_2);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_2) }];
                case 5: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Create a food order (proposal phase)
     *
     * This creates a PENDING order that requires YES confirmation to dispatch.
     * Returns pendingAction for the confirmation gate.
     */
    orderFood: function (args, context) { return __awaiter(void 0, void 0, void 0, function () {
        var userSnap, userData, customerName, customerPhone, restaurant, restaurants, restaurants, action, kind, menu, orderItems, total, _loop_1, i, orderId, currency, order, itemsSummary, restaurantTitle, summary, err_3;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    logger.info('[FoodTools] Creating food order', { args: args, userId: context.userId });
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, firebase_1.db.collection('users').doc(context.userId).get()];
                case 2:
                    userSnap = _e.sent();
                    userData = userSnap.data() || {};
                    customerName = userData.displayName || 'Guest';
                    customerPhone = userData.phone || userData.phoneE164 || '';
                    restaurant = null;
                    if (!args.restaurantName) return [3 /*break*/, 4];
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.searchByAction({
                            actionType: 'order_food',
                            name: args.restaurantName,
                            area: args.area,
                            tag: args.cuisine,
                            marketId: context.marketId,
                            limit: 5,
                        })];
                case 3:
                    restaurants = _e.sent();
                    restaurant = restaurants[0] || null;
                    return [3 /*break*/, 6];
                case 4:
                    if (!args.cuisine) return [3 /*break*/, 6];
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.searchByAction({
                            actionType: 'order_food',
                            tag: args.cuisine,
                            area: args.area,
                            marketId: context.marketId,
                            limit: 5,
                        })];
                case 5:
                    restaurants = _e.sent();
                    restaurant = restaurants[0] || null;
                    _e.label = 6;
                case 6:
                    if (!restaurant) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Could not find a matching restaurant. Please specify the restaurant name.',
                            }];
                    }
                    action = merveListings_repository_1.merveListingsRepository.getEnabledAction(restaurant.merve, 'order_food');
                    if (!action) {
                        return [2 /*return*/, { success: false, error: 'This listing does not support ordering.' }];
                    }
                    kind = (((_a = action.data) === null || _a === void 0 ? void 0 : _a.kind) || 'menuItems');
                    return [4 /*yield*/, listing_data_repository_1.listingDataRepository.listItems(restaurant.id, kind)];
                case 7:
                    menu = _e.sent();
                    if (((_b = action.data) === null || _b === void 0 ? void 0 : _b.required) && menu.length === 0) {
                        return [2 /*return*/, { success: false, error: 'This listing requires a menu to place orders, but no menu items are published yet.' }];
                    }
                    orderItems = [];
                    total = 0;
                    if (args.items && args.items.length > 0) {
                        _loop_1 = function (i) {
                            var itemName = args.items[i].toLowerCase();
                            var qty = ((_c = args.quantities) === null || _c === void 0 ? void 0 : _c[i]) || 1;
                            // Fuzzy match menu item
                            var match = menu.find(function (m) {
                                return (m.name || '').toLowerCase().includes(itemName) ||
                                    itemName.includes((m.name || '').toLowerCase());
                            });
                            if (match) {
                                orderItems.push({
                                    menuItemId: match.id,
                                    name: match.name,
                                    quantity: qty,
                                    price: Number(match.price || 0),
                                });
                                total += Number(match.price || 0) * qty;
                            }
                        };
                        for (i = 0; i < args.items.length; i++) {
                            _loop_1(i);
                        }
                    }
                    if (!args.deliveryAddress) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Please provide a delivery address.',
                            }];
                    }
                    orderId = "ORD-".concat(Date.now(), "-").concat(Math.random().toString(36).slice(2, 8));
                    currency = ((_d = menu[0]) === null || _d === void 0 ? void 0 : _d.currency) || 'TRY';
                    order = {
                        id: orderId,
                        restaurantId: restaurant.id,
                        restaurantName: (restaurant.title || restaurant.name || '').trim(),
                        userId: context.userId,
                        customerName: customerName,
                        customerPhone: customerPhone,
                        deliveryAddress: args.deliveryAddress,
                        items: orderItems,
                        totalAmount: total,
                        currency: currency,
                        status: 'pending',
                        notes: args.specialInstructions,
                        marketId: context.marketId || 'nc',
                        actionType: 'order_food',
                        createdAt: firestore_1.Timestamp.now(),
                        updatedAt: firestore_1.Timestamp.now(),
                    };
                    return [4 /*yield*/, firebase_1.db.collection(catalog_types_1.COLLECTIONS.foodOrders).doc(orderId).set(order)];
                case 8:
                    _e.sent();
                    itemsSummary = orderItems.map(function (i) { return "".concat(i.quantity, "x ").concat(i.name); }).join(', ');
                    restaurantTitle = (restaurant.title || restaurant.name || '').trim();
                    summary = "\uD83D\uDCCB Order from ".concat(restaurantTitle, "\n") +
                        "\uD83C\uDF7D\uFE0F ".concat(itemsSummary || 'General order', "\n") +
                        "\uD83D\uDCB0 Total: ".concat(currency, " ").concat(total.toFixed(2), "\n") +
                        "\uD83D\uDCCD Deliver to: ".concat(args.deliveryAddress);
                    // 5. Return pendingAction for confirmation gate
                    return [2 /*return*/, {
                            success: true,
                            proposal: true,
                            orderId: orderId,
                            restaurantName: restaurantTitle,
                            items: orderItems,
                            total: "".concat(currency, " ").concat(total.toFixed(2)),
                            deliveryAddress: args.deliveryAddress,
                            summary: summary,
                            // This tells the orchestrator to set up confirmation gate
                            pendingAction: {
                                kind: 'confirm_order',
                                orderId: orderId,
                                holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
                                summary: summary,
                                expectedUserId: context.userId,
                                createdAt: new Date(),
                            },
                        }];
                case 9:
                    err_3 = _e.sent();
                    logger.error('[FoodTools] Order creation failed', err_3);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_3) }];
                case 10: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Confirm and dispatch a food order via WhatsApp
     *
     * Called when user replies YES to the proposal.
     */
    confirmFoodOrder: function (orderId) { return __awaiter(void 0, void 0, void 0, function () {
        var orderRef, orderSnap, order, restaurant, itemsList, merve, actionType, action, to, marketId, toolPolicy, defaultTemplate, template, message, sendWhatsApp, result, err_4;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    logger.info('[FoodTools] Confirming order', { orderId: orderId });
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 8, , 9]);
                    orderRef = firebase_1.db.collection(catalog_types_1.COLLECTIONS.foodOrders).doc(orderId);
                    return [4 /*yield*/, orderRef.get()];
                case 2:
                    orderSnap = _b.sent();
                    if (!orderSnap.exists) {
                        return [2 /*return*/, { success: false, error: 'Order not found' }];
                    }
                    order = orderSnap.data();
                    if (order.status !== 'pending') {
                        return [2 /*return*/, { success: false, error: "Order already ".concat(order.status) }];
                    }
                    return [4 /*yield*/, merveListings_repository_1.merveListingsRepository.findById(order.restaurantId)];
                case 3:
                    restaurant = _b.sent();
                    if (!restaurant) {
                        return [2 /*return*/, { success: false, error: 'Restaurant not found' }];
                    }
                    itemsList = order.items.map(function (i) { return "\u2022 ".concat(i.quantity, "x ").concat(i.name); }).join('\n');
                    merve = restaurant.merve;
                    if (!(merve === null || merve === void 0 ? void 0 : merve.enabled)) {
                        return [2 /*return*/, { success: false, error: 'Listing is not Merve-enabled' }];
                    }
                    actionType = order.actionType || 'order_food';
                    action = merveListings_repository_1.merveListingsRepository.getEnabledAction(merve, actionType);
                    if (!action) {
                        return [2 /*return*/, { success: false, error: "Listing does not support ".concat(actionType) }];
                    }
                    to = merveListings_repository_1.merveListingsRepository.getWhatsAppTarget(merve, action);
                    if (!to) {
                        return [2 /*return*/, { success: false, error: 'Missing WhatsApp target for dispatch' }];
                    }
                    marketId = order.marketId || 'nc';
                    return [4 /*yield*/, merveConfig_repository_1.merveConfigRepository.getToolPolicy(marketId, 'orderFood')];
                case 4:
                    toolPolicy = _b.sent();
                    defaultTemplate = (toolPolicy === null || toolPolicy === void 0 ? void 0 : toolPolicy.defaultTemplate) || "\uD83C\uDD95 New Order!\n\nCustomer: {customerName}\nPhone: {customerPhone}\n\nOrder:\n{items}\n\nTotal: {total}\nDeliver to: {address}\n{notes}";
                    template = ((_a = action.dispatch) === null || _a === void 0 ? void 0 : _a.template) || defaultTemplate;
                    message = (0, template_1.renderTemplate)(template, {
                        customerName: order.customerName,
                        customerPhone: order.customerPhone,
                        items: itemsList,
                        total: "".concat(order.currency, " ").concat(order.totalAmount),
                        address: order.deliveryAddress,
                        notes: order.notes || '',
                    });
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../services/twilio.service')); })];
                case 5:
                    sendWhatsApp = (_b.sent()).sendWhatsApp;
                    return [4 /*yield*/, sendWhatsApp(to, message)];
                case 6:
                    result = _b.sent();
                    // Update order status
                    return [4 /*yield*/, orderRef.update({
                            status: 'confirmed',
                            dispatchMessageSid: result.sid,
                            updatedAt: firestore_1.Timestamp.now(),
                        })];
                case 7:
                    // Update order status
                    _b.sent();
                    return [2 /*return*/, {
                            success: true,
                            orderId: orderId,
                            status: 'confirmed',
                            message: "\u2705 Order sent! They will contact you shortly.",
                        }];
                case 8:
                    err_4 = _b.sent();
                    logger.error('[FoodTools] Order confirmation failed', err_4);
                    return [2 /*return*/, { success: false, error: (0, errors_1.getErrorMessage)(err_4) }];
                case 9: return [2 /*return*/];
            }
        });
    }); },
};
