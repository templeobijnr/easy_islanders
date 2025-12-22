"use strict";
/**
 * Consumer Tools: Service Booking
 *
 * Pattern: Read → Propose → Confirm → Apply/Dispatch
 *
 * Books plumbers, electricians, handymen, AC technicians, etc.
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
exports.serviceTools = void 0;
const firestore_1 = require("firebase-admin/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../../config/firebase");
const merveListings_repository_1 = require("../../repositories/merveListings.repository");
const catalog_types_1 = require("../../types/catalog.types");
const merveConfig_repository_1 = require("../domains/merve/merveConfig.repository");
const template_1 = require("../domains/merve/template");
// ============================================================================
// TOOL IMPLEMENTATION
// ============================================================================
exports.serviceTools = {
    /**
     * Find service providers by type and area
     */
    findServiceProviders: async (args, ctx) => {
        logger.info('[ServiceTools] Finding providers', args);
        try {
            let providers = await merveListings_repository_1.merveListingsRepository.searchByAction({
                actionType: 'request_service',
                area: args.area,
                tag: args.serviceType,
                marketId: ctx === null || ctx === void 0 ? void 0 : ctx.marketId,
                limit: 15,
            });
            if (providers.length === 0) {
                providers = await merveListings_repository_1.merveListingsRepository.searchByAction({
                    actionType: 'book_service',
                    area: args.area,
                    tag: args.serviceType,
                    marketId: ctx === null || ctx === void 0 ? void 0 : ctx.marketId,
                    limit: 15,
                });
            }
            if (providers.length === 0) {
                return {
                    success: true,
                    providers: [],
                    message: `No ${args.serviceType} providers found in your area.`,
                };
            }
            return {
                success: true,
                providers: providers.map(p => ({
                    id: p.id,
                    name: (p.title || p.name || '').trim(),
                    services: (p.merve.tags || p.tags || []).join(', '),
                    areas: (p.merve.coverageAreas || []).join(', '),
                    rating: p.rating,
                    responseTime: p.responseTime,
                })),
                message: `Found ${providers.length} ${args.serviceType} provider(s).`,
            };
        }
        catch (err) {
            logger.error('[ServiceTools] Search failed', err);
            return { success: false, error: err.message };
        }
    },
    /**
     * Book a service (proposal phase)
     * Returns pendingAction for confirmation gate.
     */
    bookService: async (args, context) => {
        logger.info('[ServiceTools] Booking service', { args, userId: context.userId });
        try {
            // Get user info
            const userSnap = await firebase_1.db.collection('users').doc(context.userId).get();
            const userData = userSnap.data() || {};
            const customerName = userData.displayName || 'Guest';
            const customerPhone = userData.phone || userData.phoneE164 || '';
            // 1. Find provider
            let chosenActionType = 'request_service';
            let providers = await merveListings_repository_1.merveListingsRepository.searchByAction({
                actionType: 'request_service',
                area: args.area,
                tag: args.serviceType,
                marketId: context.marketId,
                limit: 10,
            });
            if (providers.length === 0) {
                chosenActionType = 'book_service';
                providers = await merveListings_repository_1.merveListingsRepository.searchByAction({
                    actionType: 'book_service',
                    area: args.area,
                    tag: args.serviceType,
                    marketId: context.marketId,
                    limit: 10,
                });
            }
            if (providers.length === 0) {
                return {
                    success: false,
                    error: `No ${args.serviceType} providers available in your area.`,
                };
            }
            // Pick first available (could enhance with rating/availability logic)
            const provider = providers[0];
            // 2. Create service request (pending state)
            const requestId = `SRV-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const request = {
                id: requestId,
                providerId: provider.id,
                providerName: (provider.title || provider.name || '').trim(),
                userId: context.userId,
                customerName,
                customerPhone,
                serviceType: args.serviceType,
                address: args.address,
                description: args.description,
                urgency: args.urgency || 'flexible',
                status: 'pending',
                marketId: context.marketId || 'nc',
                actionType: chosenActionType,
                createdAt: firestore_1.Timestamp.now(),
                updatedAt: firestore_1.Timestamp.now(),
            };
            await firebase_1.db.collection(catalog_types_1.COLLECTIONS.serviceRequests).doc(requestId).set(request);
            // 3. Build summary
            const urgencyLabels = {
                emergency: '🚨 Emergency',
                today: '📅 Today',
                this_week: '📆 This week',
                flexible: '🔄 Flexible',
            };
            const summary = `🔧 Service: ${args.serviceType}\n` +
                `👷 Provider: ${(provider.title || provider.name || '').trim()}\n` +
                `📍 Address: ${args.address}\n` +
                `⏰ Urgency: ${urgencyLabels[args.urgency || 'flexible']}\n` +
                `📝 Issue: ${args.description}`;
            // 4. Return pendingAction for confirmation gate
            return {
                success: true,
                proposal: true,
                requestId,
                providerName: provider.name,
                serviceType: args.serviceType,
                summary,
                pendingAction: {
                    kind: 'confirm_service',
                    requestId,
                    holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
                    summary,
                    expectedUserId: context.userId,
                    createdAt: new Date(),
                },
            };
        }
        catch (err) {
            logger.error('[ServiceTools] Booking failed', err);
            return { success: false, error: err.message };
        }
    },
    /**
     * Confirm and dispatch service request via WhatsApp
     */
    confirmServiceRequest: async (requestId) => {
        var _a;
        logger.info('[ServiceTools] Confirming request', { requestId });
        try {
            const requestRef = firebase_1.db.collection(catalog_types_1.COLLECTIONS.serviceRequests).doc(requestId);
            const requestSnap = await requestRef.get();
            if (!requestSnap.exists) {
                return { success: false, error: 'Request not found' };
            }
            const request = requestSnap.data();
            if (request.status !== 'pending') {
                return { success: false, error: `Request already ${request.status}` };
            }
            // Get listing
            const provider = await merveListings_repository_1.merveListingsRepository.findById(request.providerId);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }
            const merve = provider.merve;
            if (!(merve === null || merve === void 0 ? void 0 : merve.enabled)) {
                return { success: false, error: 'Listing is not Merve-enabled' };
            }
            const actionType = request.actionType || 'request_service';
            const action = merveListings_repository_1.merveListingsRepository.getEnabledAction(merve, actionType);
            if (!action) {
                return { success: false, error: `Listing does not support ${actionType}` };
            }
            const to = merveListings_repository_1.merveListingsRepository.getWhatsAppTarget(merve, action);
            if (!to) {
                return { success: false, error: 'Missing WhatsApp target for dispatch' };
            }
            // Build WhatsApp message
            const urgencyLabels = {
                emergency: '🚨 EMERGENCY',
                today: 'Today',
                this_week: 'This week',
                flexible: 'Flexible timing',
            };
            const marketId = request.marketId || 'nc';
            const toolPolicy = await merveConfig_repository_1.merveConfigRepository.getToolPolicy(marketId, 'bookService');
            const defaultTemplate = (toolPolicy === null || toolPolicy === void 0 ? void 0 : toolPolicy.defaultTemplate) || `🆕 New Service Request!\n\nService: {serviceType}\nCustomer: {customerName}\nPhone: {customerPhone}\nAddress: {address}\nUrgency: {urgency}\n\nIssue: {description}`;
            const template = ((_a = action.dispatch) === null || _a === void 0 ? void 0 : _a.template) || defaultTemplate;
            const message = (0, template_1.renderTemplate)(template, {
                customerName: request.customerName,
                customerPhone: request.customerPhone,
                serviceType: request.serviceType,
                address: request.address,
                description: request.description,
                urgency: urgencyLabels[request.urgency],
            });
            // Send WhatsApp
            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('../../services/twilio.service')));
            const result = await sendWhatsApp(to, message);
            // Update request status
            await requestRef.update({
                status: 'confirmed',
                dispatchMessageSid: result.sid,
                updatedAt: firestore_1.Timestamp.now(),
            });
            return {
                success: true,
                requestId,
                status: 'confirmed',
                message: `✅ Request sent! They will contact you shortly.`,
            };
        }
        catch (err) {
            logger.error('[ServiceTools] Confirmation failed', err);
            return { success: false, error: err.message };
        }
    },
};
//# sourceMappingURL=service.tools.js.map