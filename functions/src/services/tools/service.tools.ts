import { getErrorMessage } from '../../utils/errors';
/**
 * Consumer Tools: Service Booking
 * 
 * Pattern: Read → Propose → Confirm → Apply/Dispatch
 * 
 * Books plumbers, electricians, handymen, AC technicians, etc.
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../../config/firebase';
import { merveListingsRepository } from '../../repositories/merveListings.repository';
import { ServiceRequest, ServiceType, COLLECTIONS } from '../../types/catalog.types';
import { ActionType } from '../../types/merve';
import { merveConfigRepository } from '../../repositories/merveConfig.repository';
import { renderTemplate } from '../domains/merve/template';

// ============================================================================
// TYPES
// ============================================================================

interface BookServiceArgs {
    serviceType: ServiceType;
    area?: string;
    description: string;
    address: string;
    urgency?: 'emergency' | 'today' | 'this_week' | 'flexible';
}

interface ToolResult {
    success: boolean;
    error?: string;
    [key: string]: unknown;
}

// ============================================================================
// TOOL IMPLEMENTATION
// ============================================================================

export const serviceTools = {
    /**
     * Find service providers by type and area
     */
    findServiceProviders: async (args: {
        serviceType: ServiceType;
        area?: string;
    }, ctx?: { marketId?: string }): Promise<ToolResult> => {
        logger.info('[ServiceTools] Finding providers', args);

        try {
            let providers = await merveListingsRepository.searchByAction({
                actionType: 'request_service',
                area: args.area,
                tag: args.serviceType,
                marketId: ctx?.marketId,
                limit: 15,
            });
            if (providers.length === 0) {
                providers = await merveListingsRepository.searchByAction({
                    actionType: 'book_service',
                    area: args.area,
                    tag: args.serviceType,
                    marketId: ctx?.marketId,
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
                    rating: (p as any).rating,
                    responseTime: (p as any).responseTime,
                })),
                message: `Found ${providers.length} ${args.serviceType} provider(s).`,
            };
        } catch (err: unknown) {
            logger.error('[ServiceTools] Search failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Book a service (proposal phase)
     * Returns pendingAction for confirmation gate.
     */
    bookService: async (
        args: BookServiceArgs,
        context: { userId: string; sessionId: string; location?: { lat: number; lng: number }; marketId?: string }
    ): Promise<ToolResult> => {
        logger.info('[ServiceTools] Booking service', { args, userId: context.userId });

        try {
            // Get user info
            const userSnap = await db.collection('users').doc(context.userId).get();
            const userData = userSnap.data() || {};
            const customerName = userData.displayName || 'Guest';
            const customerPhone = userData.phone || userData.phoneE164 || '';

            // 1. Find provider
            let chosenActionType: ActionType = 'request_service';
            let providers = await merveListingsRepository.searchByAction({
                actionType: 'request_service',
                area: args.area,
                tag: args.serviceType,
                marketId: context.marketId,
                limit: 10,
            });
            if (providers.length === 0) {
                chosenActionType = 'book_service';
                providers = await merveListingsRepository.searchByAction({
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

            const request: ServiceRequest = {
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
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            await db.collection(COLLECTIONS.serviceRequests).doc(requestId).set(request);

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
                    kind: 'confirm_service' as const,
                    requestId,
                    holdExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
                    summary,
                    expectedUserId: context.userId,
                    createdAt: new Date(),
                },
            };
        } catch (err: unknown) {
            logger.error('[ServiceTools] Booking failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },

    /**
     * Confirm and dispatch service request via WhatsApp
     */
    confirmServiceRequest: async (requestId: string): Promise<ToolResult> => {
        logger.info('[ServiceTools] Confirming request', { requestId });

        try {
            const requestRef = db.collection(COLLECTIONS.serviceRequests).doc(requestId);
            const requestSnap = await requestRef.get();

            if (!requestSnap.exists) {
                return { success: false, error: 'Request not found' };
            }

            const request = requestSnap.data() as ServiceRequest;

            if (request.status !== 'pending') {
                return { success: false, error: `Request already ${request.status}` };
            }

            // Get listing
            const provider = await merveListingsRepository.findById(request.providerId);
            if (!provider) {
                return { success: false, error: 'Provider not found' };
            }

            const merve = provider.merve;
            if (!merve?.enabled) {
                return { success: false, error: 'Listing is not Merve-enabled' };
            }

            const actionType = (request.actionType as ActionType) || 'request_service';
            const action = merveListingsRepository.getEnabledAction(merve, actionType);
            if (!action) {
                return { success: false, error: `Listing does not support ${actionType}` };
            }

            const to = merveListingsRepository.getWhatsAppTarget(merve, action);
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
            const toolPolicy = await merveConfigRepository.getToolPolicy(marketId, 'bookService');
            const defaultTemplate = toolPolicy?.defaultTemplate || `🆕 New Service Request!\n\nService: {serviceType}\nCustomer: {customerName}\nPhone: {customerPhone}\nAddress: {address}\nUrgency: {urgency}\n\nIssue: {description}`;
            const template = action.dispatch?.template || defaultTemplate;

            const message = renderTemplate(template, {
                customerName: request.customerName,
                customerPhone: request.customerPhone,
                serviceType: request.serviceType,
                address: request.address,
                description: request.description,
                urgency: urgencyLabels[request.urgency],
            });

            // Send WhatsApp
            const { sendWhatsApp } = await import('../../services/twilio.service');
            const result = await sendWhatsApp(to, message);

            // Update request status
            await requestRef.update({
                status: 'confirmed',
                dispatchMessageSid: result.sid,
                updatedAt: Timestamp.now(),
            });

            return {
                success: true,
                requestId,
                status: 'confirmed',
                message: `✅ Request sent! They will contact you shortly.`,
            };
        } catch (err: unknown) {
            logger.error('[ServiceTools] Confirmation failed', err);
            return { success: false, error: getErrorMessage(err) };
        }
    },
};
