"use strict";
/**
 * Consumer Tools: Food Ordering
 *
 * Pattern: Read → Propose → Confirm → Apply/Dispatch
 *
 * This tool searches restaurants, builds orders, and dispatches via WhatsApp.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.foodTools = void 0;
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../../config/firebase");
const merveListings_repository_1 = require("../../repositories/merveListings.repository");
const listing_data_repository_1 = require("../../repositories/listing-data.repository");
const catalog_types_1 = require("../../types/catalog.types");
const merveConfig_repository_1 = require("../domains/merve/merveConfig.repository");
const template_1 = require("../domains/merve/template");
// ============================================================================
// TOOL IMPLEMENTATION
// ============================================================================
exports.foodTools = {
    /**
     * Search restaurants by cuisine, name, or area
     */
    searchRestaurants: async (args, ctx) => {
        logger.info('[FoodTools] Searching restaurants', args);
        try {
            const restaurants = await merveListings_repository_1.merveListingsRepository.searchByAction({
                actionType: 'order_food',
                name: args.name,
                area: args.area,
                tag: args.cuisine,
                marketId: ctx === null || ctx === void 0 ? void 0 : ctx.marketId,
                limit: 10,
            });
            if (restaurants.length === 0) {
                return {
                    success: true,
                    restaurants: [],
                    message: 'No restaurants found matching your criteria.',
                };
            }
            return {
                success: true,
                restaurants: restaurants.map(r => ({
                    id: r.id,
                    name: (r.title || r.name || '').trim(),
                    cuisines: (r.merve.tags || r.tags || []).join(', '),
                    address: (r.address || ''),
                    rating: r.rating,
                    priceRange: r.priceRange || r.priceLevel,
                })),
                message: `Found ${restaurants.length} restaurant(s).`,
            };
        }
        catch (err) {
            logger.error('[FoodTools] Search failed', err);
            return { success: false, error: err.message };
        }
    },
    /**
     * Get menu for a specific restaurant
     */
    getRestaurantMenu: async (args, ctx) => {
        var _a, _b;
        logger.info('[FoodTools] Getting menu', args);
        try {
            const restaurant = await merveListings_repository_1.merveListingsRepository.findById(args.restaurantId);
            if (!restaurant) {
                return { success: false, error: 'Restaurant not found' };
            }
            if (!((_a = restaurant.merve) === null || _a === void 0 ? void 0 : _a.enabled)) {
                return { success: false, error: 'Restaurant is not Merve-enabled' };
            }
            const action = merveListings_repository_1.merveListingsRepository.getEnabledAction(restaurant.merve, 'order_food');
            if (!action) {
                return { success: false, error: 'Restaurant does not support ordering' };
            }
            const kind = (((_b = action.data) === null || _b === void 0 ? void 0 : _b.kind) || 'menuItems');
            const menu = await listing_data_repository_1.listingDataRepository.listItems(args.restaurantId, kind);
            // Group by category
            const grouped = {};
            for (const item of menu) {
                const category = item.category || 'Uncategorized';
                if (!grouped[category])
                    grouped[category] = [];
                grouped[category].push(item);
            }
            return {
                success: true,
                restaurantName: (restaurant.title || restaurant.name || '').trim(),
                menu: grouped,
                menuItems: menu.map(m => ({
                    id: m.id,
                    name: m.name,
                    price: m.price,
                    currency: m.currency,
                    category: m.category,
                    description: m.description,
                })),
            };
        }
        catch (err) {
            logger.error('[FoodTools] Menu fetch failed', err);
            return { success: false, error: err.message };
        }
    },
    /**
     * Create a food order (proposal phase)
     *
     * This creates a PENDING order that requires YES confirmation to dispatch.
     * Returns pendingAction for the confirmation gate.
     */
    orderFood: async (args, context) => {
        var _a, _b, _c, _d;
        logger.info('[FoodTools] Creating food order', { args, userId: context.userId });
        try {
            // Get user info
            const userSnap = await firebase_1.db.collection('users').doc(context.userId).get();
            const userData = userSnap.data() || {};
            const customerName = userData.displayName || 'Guest';
            const customerPhone = userData.phone || userData.phoneE164 || '';
            // 1. Find restaurant
            let restaurant = null;
            if (args.restaurantName) {
                const restaurants = await merveListings_repository_1.merveListingsRepository.searchByAction({
                    actionType: 'order_food',
                    name: args.restaurantName,
                    area: args.area,
                    tag: args.cuisine,
                    marketId: context.marketId,
                    limit: 5,
                });
                restaurant = restaurants[0] || null;
            }
            else if (args.cuisine) {
                const restaurants = await merveListings_repository_1.merveListingsRepository.searchByAction({
                    actionType: 'order_food',
                    tag: args.cuisine,
                    area: args.area,
                    marketId: context.marketId,
                    limit: 5,
                });
                restaurant = restaurants[0] || null;
            }
            if (!restaurant) {
                return {
                    success: false,
                    error: 'Could not find a matching restaurant. Please specify the restaurant name.',
                };
            }
            // 2. Resolve menu items
            const action = merveListings_repository_1.merveListingsRepository.getEnabledAction(restaurant.merve, 'order_food');
            if (!action) {
                return { success: false, error: 'This listing does not support ordering.' };
            }
            const kind = (((_a = action.data) === null || _a === void 0 ? void 0 : _a.kind) || 'menuItems');
            const menu = await listing_data_repository_1.listingDataRepository.listItems(restaurant.id, kind);
            if (((_b = action.data) === null || _b === void 0 ? void 0 : _b.required) && menu.length === 0) {
                return { success: false, error: 'This listing requires a menu to place orders, but no menu items are published yet.' };
            }
            const orderItems = [];
            let total = 0;
            if (args.items && args.items.length > 0) {
                for (let i = 0; i < args.items.length; i++) {
                    const itemName = args.items[i].toLowerCase();
                    const qty = ((_c = args.quantities) === null || _c === void 0 ? void 0 : _c[i]) || 1;
                    // Fuzzy match menu item
                    const match = menu.find(m => (m.name || '').toLowerCase().includes(itemName) ||
                        itemName.includes((m.name || '').toLowerCase()));
                    if (match) {
                        orderItems.push({
                            menuItemId: match.id,
                            name: match.name,
                            quantity: qty,
                            price: Number(match.price || 0),
                        });
                        total += Number(match.price || 0) * qty;
                    }
                }
            }
            if (!args.deliveryAddress) {
                return {
                    success: false,
                    error: 'Please provide a delivery address.',
                };
            }
            // 3. Create order doc (pending state)
            const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const currency = ((_d = menu[0]) === null || _d === void 0 ? void 0 : _d.currency) || 'TRY';
            const order = {
                id: orderId,
                restaurantId: restaurant.id,
                restaurantName: (restaurant.title || restaurant.name || '').trim(),
                userId: context.userId,
                customerName,
                customerPhone,
                deliveryAddress: args.deliveryAddress,
                items: orderItems,
                totalAmount: total,
                currency,
                status: 'pending',
                notes: args.specialInstructions,
                marketId: context.marketId || 'nc',
                actionType: 'order_food',
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            };
            await firebase_1.db.collection(catalog_types_1.COLLECTIONS.foodOrders).doc(orderId).set(order);
            // 4. Build summary for confirmation
            const itemsSummary = orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
            const restaurantTitle = (restaurant.title || restaurant.name || '').trim();
            const summary = `📋 Order from ${restaurantTitle}\n` +
                `🍽️ ${itemsSummary || 'General order'}\n` +
                `💰 Total: ${currency} ${total.toFixed(2)}\n` +
                `📍 Deliver to: ${args.deliveryAddress}`;
            // 5. Return pendingAction for confirmation gate
            return {
                success: true,
                proposal: true,
                orderId,
                restaurantName: restaurantTitle,
                items: orderItems,
                total: `${currency} ${total.toFixed(2)}`,
                deliveryAddress: args.deliveryAddress,
                summary,
                // This tells the orchestrator to set up confirmation gate
                pendingAction: {
                    kind: 'confirm_order',
                    orderId,
                    holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
                    summary,
                    expectedUserId: context.userId,
                    createdAt: new Date(),
                },
            };
        }
        catch (err) {
            logger.error('[FoodTools] Order creation failed', err);
            return { success: false, error: err.message };
        }
    },
    /**
     * Confirm and dispatch a food order via WhatsApp
     *
     * Called when user replies YES to the proposal.
     */
    confirmFoodOrder: async (orderId) => {
        var _a;
        logger.info('[FoodTools] Confirming order', { orderId });
        try {
            const orderRef = firebase_1.db.collection(catalog_types_1.COLLECTIONS.foodOrders).doc(orderId);
            const orderSnap = await orderRef.get();
            if (!orderSnap.exists) {
                return { success: false, error: 'Order not found' };
            }
            const order = orderSnap.data();
            if (order.status !== 'pending') {
                return { success: false, error: `Order already ${order.status}` };
            }
            // Get listing for WhatsApp number and template
            const restaurant = await merveListings_repository_1.merveListingsRepository.findById(order.restaurantId);
            if (!restaurant) {
                return { success: false, error: 'Restaurant not found' };
            }
            const itemsList = order.items.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
            const merve = restaurant.merve;
            if (!(merve === null || merve === void 0 ? void 0 : merve.enabled)) {
                return { success: false, error: 'Listing is not Merve-enabled' };
            }
            const actionType = order.actionType || 'order_food';
            const action = merveListings_repository_1.merveListingsRepository.getEnabledAction(merve, actionType);
            if (!action) {
                return { success: false, error: `Listing does not support ${actionType}` };
            }
            const to = merveListings_repository_1.merveListingsRepository.getWhatsAppTarget(merve, action);
            if (!to) {
                return { success: false, error: 'Missing WhatsApp target for dispatch' };
            }
            const marketId = order.marketId || 'nc';
            const toolPolicy = await merveConfig_repository_1.merveConfigRepository.getToolPolicy(marketId, 'orderFood');
            const defaultTemplate = (toolPolicy === null || toolPolicy === void 0 ? void 0 : toolPolicy.defaultTemplate) || `🆕 New Order!\n\nCustomer: {customerName}\nPhone: {customerPhone}\n\nOrder:\n{items}\n\nTotal: {total}\nDeliver to: {address}\n{notes}`;
            const template = ((_a = action.dispatch) === null || _a === void 0 ? void 0 : _a.template) || defaultTemplate;
            const message = (0, template_1.renderTemplate)(template, {
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                items: itemsList,
                total: `${order.currency} ${order.totalAmount}`,
                address: order.deliveryAddress,
                notes: order.notes || '',
            });
            // Send WhatsApp
            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../../services/twilio.service')));
            const result = await sendWhatsApp(to, message);
            // Update order status
            await orderRef.update({
                status: 'confirmed',
                dispatchMessageSid: result.sid,
                updatedAt: firestore_1.Timestamp.now(),
            });
            return {
                success: true,
                orderId,
                status: 'confirmed',
                message: `✅ Order sent! They will contact you shortly.`,
            };
        }
        catch (err) {
            logger.error('[FoodTools] Order confirmation failed', err);
            return { success: false, error: err.message };
        }
    },
};
//# sourceMappingURL=food.tools.js.map