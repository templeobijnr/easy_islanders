import { getErrorMessage } from '../../utils/errors';
/**
 * Consumer Tools: Food Ordering
 * 
 * Pattern: Read → Propose → Confirm → Apply/Dispatch
 * 
 * This tool searches restaurants, builds orders, and dispatches via WhatsApp.
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../../config/firebase';
import { merveListingsRepository } from '../../repositories/merveListings.repository';
import { listingDataRepository } from '../../repositories/listing-data.repository';
import { FoodOrder, COLLECTIONS } from '../../types/catalog.types';
import { ActionType, IngestKind } from '../../types/merve';
import { merveConfigRepository } from '../../repositories/merveConfig.repository';
import { renderTemplate } from '../domains/merve/template';

// ============================================================================
// TYPES
// ============================================================================

interface OrderFoodArgs {
    cuisine?: string;          // 'Turkish', 'Kebab', 'Seafood'
    restaurantName?: string;   // Specific restaurant
    area?: string;             // 'Girne', 'Lefkosa'
    items?: string[];          // ['Adana Kebab', 'Ayran']
    quantities?: number[];     // [2, 1]
    deliveryAddress?: string;
    specialInstructions?: string;
}

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: unknown;
}

// ============================================================================
// TOOL IMPLEMENTATION
// ============================================================================

export const foodTools = {
    /**
     * Search restaurants by cuisine, name, or area
     */
    searchRestaurants: async (args: {
        cuisine?: string;
        name?: string;
        area?: string;
    }, ctx?: { marketId?: string }): Promise<ToolResult> => {
        logger.info('[FoodTools] Searching restaurants', args);

        try {
            const restaurants = await merveListingsRepository.searchByAction({
                actionType: 'order_food',
                name: args.name,
                area: args.area,
                tag: args.cuisine,
                marketId: ctx?.marketId,
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
                    cuisines: ((r.merve.tags || r.tags || []) as string[]).join(', '),
                    address: (r.address || '') as string,
                    rating: (r as any).rating,
                    priceRange: (r as any).priceRange || (r as any).priceLevel,
                })),
                message: `Found ${restaurants.length} restaurant(s).`,
            };
        } catch (err: unknown) {
            logger.error('[FoodTools] Search failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Get menu for a specific restaurant
     */
    getRestaurantMenu: async (args: { restaurantId: string }, ctx?: { marketId?: string }): Promise<ToolResult> => {
        logger.info('[FoodTools] Getting menu', args);

        try {
            const restaurant = await merveListingsRepository.findById(args.restaurantId);
            if (!restaurant) {
                return { success: false, error: 'Restaurant not found' };
            }

            if (!restaurant.merve?.enabled) {
                return { success: false, error: 'Restaurant is not Merve-enabled' };
            }

            const action = merveListingsRepository.getEnabledAction(restaurant.merve, 'order_food');
            if (!action) {
                return { success: false, error: 'Restaurant does not support ordering' };
            }

            const kind: IngestKind = (action.data?.kind || 'menuItems') as IngestKind;
            const menu = await listingDataRepository.listItems(args.restaurantId, kind);

            // Group by category
            const grouped: Record<string, any[]> = {};
            for (const item of menu) {
                const category = item.category || 'Uncategorized';
                if (!grouped[category]) grouped[category] = [];
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
        } catch (err: unknown) {
            logger.error('[FoodTools] Menu fetch failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Create a food order (proposal phase)
     * 
     * This creates a PENDING order that requires YES confirmation to dispatch.
     * Returns pendingAction for the confirmation gate.
     */
    orderFood: async (
        args: OrderFoodArgs,
        context: { userId: string; sessionId: string; location?: { lat: number; lng: number }; marketId?: string }
    ): Promise<ToolResult> => {
        logger.info('[FoodTools] Creating food order', { args, userId: context.userId });

        try {
            // Get user info
            const userSnap = await db.collection('users').doc(context.userId).get();
            const userData = userSnap.data() || {};
            const customerName = userData.displayName || 'Guest';
            const customerPhone = userData.phone || userData.phoneE164 || '';

            // 1. Find restaurant
            let restaurant: Awaited<ReturnType<typeof merveListingsRepository.searchByAction>>[0] | null = null;

            if (args.restaurantName) {
                const restaurants = await merveListingsRepository.searchByAction({
                    actionType: 'order_food',
                    name: args.restaurantName,
                    area: args.area,
                    tag: args.cuisine,
                    marketId: context.marketId,
                    limit: 5,
                });
                restaurant = restaurants[0] || null;
            } else if (args.cuisine) {
                const restaurants = await merveListingsRepository.searchByAction({
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
            const action = merveListingsRepository.getEnabledAction(restaurant.merve, 'order_food');
            if (!action) {
                return { success: false, error: 'This listing does not support ordering.' };
            }

            const kind: IngestKind = (action.data?.kind || 'menuItems') as IngestKind;
            const menu = await listingDataRepository.listItems(restaurant.id, kind);

            if (action.data?.required && menu.length === 0) {
                return { success: false, error: 'This listing requires a menu to place orders, but no menu items are published yet.' };
            }

            const orderItems: { menuItemId: string; name: string; quantity: number; price: number }[] = [];
            let total = 0;

            if (args.items && args.items.length > 0) {
                for (let i = 0; i < args.items.length; i++) {
                    const itemName = args.items[i].toLowerCase();
                    const qty = args.quantities?.[i] || 1;

                    // Fuzzy match menu item
                    const match = menu.find(m =>
                        (m.name || '').toLowerCase().includes(itemName) ||
                        itemName.includes((m.name || '').toLowerCase())
                    );

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
            const currency = (menu[0]?.currency as string) || 'TRY';

            const order: FoodOrder = {
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
                actionType: 'order_food' as ActionType,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            await db.collection(COLLECTIONS.foodOrders).doc(orderId).set(order);

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
                    kind: 'confirm_order' as const,
                    orderId,
                    holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
                    summary,
                    expectedUserId: context.userId,
                    createdAt: new Date(),
                },
            };
        } catch (err: unknown) {
            logger.error('[FoodTools] Order creation failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Confirm and dispatch a food order via WhatsApp
     * 
     * Called when user replies YES to the proposal.
     */
    confirmFoodOrder: async (orderId: string): Promise<ToolResult> => {
        logger.info('[FoodTools] Confirming order', { orderId });

        try {
            const orderRef = db.collection(COLLECTIONS.foodOrders).doc(orderId);
            const orderSnap = await orderRef.get();

            if (!orderSnap.exists) {
                return { success: false, error: 'Order not found' };
            }

            const order = orderSnap.data() as FoodOrder;

            if (order.status !== 'pending') {
                return { success: false, error: `Order already ${order.status}` };
            }

            // Get listing for WhatsApp number and template
            const restaurant = await merveListingsRepository.findById(order.restaurantId);
            if (!restaurant) {
                return { success: false, error: 'Restaurant not found' };
            }

            const itemsList = order.items.map(i => `• ${i.quantity}x ${i.name}`).join('\n');
            const merve = restaurant.merve;
            if (!merve?.enabled) {
                return { success: false, error: 'Listing is not Merve-enabled' };
            }

            const actionType = (order.actionType as ActionType) || 'order_food';
            const action = merveListingsRepository.getEnabledAction(merve, actionType);
            if (!action) {
                return { success: false, error: `Listing does not support ${actionType}` };
            }

            const to = merveListingsRepository.getWhatsAppTarget(merve, action);
            if (!to) {
                return { success: false, error: 'Missing WhatsApp target for dispatch' };
            }

            const marketId = order.marketId || 'nc';
            const toolPolicy = await merveConfigRepository.getToolPolicy(marketId, 'orderFood');
            const defaultTemplate = toolPolicy?.defaultTemplate || `🆕 New Order!\n\nCustomer: {customerName}\nPhone: {customerPhone}\n\nOrder:\n{items}\n\nTotal: {total}\nDeliver to: {address}\n{notes}`;
            const template = action.dispatch?.template || defaultTemplate;

            const message = renderTemplate(template, {
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                items: itemsList,
                total: `${order.currency} ${order.totalAmount}`,
                address: order.deliveryAddress,
                notes: order.notes || '',
            });

            // Send WhatsApp
            const { sendWhatsApp } = await import('../../services/twilio.service');
            const result = await sendWhatsApp(to, message);

            // Update order status
            await orderRef.update({
                status: 'confirmed',
                dispatchMessageSid: result.sid,
                updatedAt: Timestamp.now(),
            });

            return {
                success: true,
                orderId,
                status: 'confirmed',
                message: `✅ Order sent! They will contact you shortly.`,
            };
        } catch (err: unknown) {
            logger.error('[FoodTools] Order confirmation failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },
};
