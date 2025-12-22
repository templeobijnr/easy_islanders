/**
 * Owner Controller (V1)
 * 
 * Handles business owner dashboard operations.
 * BusinessId comes from TenantContext, never from request body.
 * 
 * Note: Knowledge and Products have dedicated controllers.
 */

import { Request, Response } from 'express';
import { businessRepository } from '../../repositories/business.repository';
import { businessChatRepository } from '../../repositories/businessChat.repository';
import { leadRepository } from '../../repositories/lead.repository';
import { membershipRepository } from '../../repositories/membership.repository';
import { entitlementsService } from '../../services/entitlements.service';
import { TenantContext } from '../../types/tenant';
import { log } from '../../utils/log';
import { setOwnerClaims } from '../../utils/claims';
import * as admin from 'firebase-admin';

/**
 * GET /v1/owner/business
 * Get the owner's business profile.
 */
export async function getBusiness(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;

    try {
        const business = await businessRepository.getById(ctx.businessId);

        if (!business) {
            res.status(404).json({ success: false, error: 'Business not found' });
            return;
        }

        res.json({
            success: true,
            business: {
                id: business.id,
                displayName: business.displayName,
                businessPhoneE164: business.businessPhoneE164,
                claimStatus: business.claimStatus,
                status: business.status,
                createdAt: business.createdAt
            }
        });

    } catch (error: unknown) {
        log.error('[OwnerController] getBusiness error', error);
        res.status(500).json({ success: false, error: 'Failed to get business' });
    }
}

/**
 * GET /v1/owner/businesses
 * List all businesses the user is a member of.
 */
export async function listBusinesses(req: Request, res: Response): Promise<void> {
    const user = (req as any).user as { uid: string };

    try {
        const businesses = await membershipRepository.getUserBusinesses(user.uid);

        res.json({
            success: true,
            businesses: businesses.map(b => ({
                businessId: b.businessId,
                role: b.role,
                businessName: b.businessName,
                joinedAt: b.joinedAt
            }))
        });
    } catch (error: unknown) {
        log.error('[OwnerController] listBusinesses error', error);
        res.status(500).json({ success: false, error: 'Failed to list businesses' });
    }
}

/**
 * POST /v1/owner/switch-business
 * Switch active business context (updates claims).
 */
export async function switchBusiness(req: Request, res: Response): Promise<void> {
    const user = (req as any).user as { uid: string };
    const { businessId } = req.body || {};

    if (!businessId || typeof businessId !== 'string') {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }

    try {
        // Verify user is a member of this business
        const isMember = await membershipRepository.isMember(businessId, user.uid);
        const isAdmin = (req as any).user?.admin === true;

        if (!isMember && !isAdmin) {
            log.warn('[OwnerController] Switch denied - not a member', { uid: user.uid, businessId });
            res.status(403).json({
                success: false,
                error: 'NOT_A_MEMBER',
                message: 'You are not a member of this business'
            });
            return;
        }

        // Update claims to new business
        await setOwnerClaims(user.uid, businessId);

        // Signal client to refresh token (best-effort, RTDB optional)
        try {
            await admin.database().ref(`metadata/${user.uid}`).set({ refreshTime: Date.now() });
        } catch {
            // ignore (RTDB may not be configured)
        }

        log.info('[OwnerController] Business switched', { uid: user.uid, businessId });

        res.json({
            success: true,
            businessId,
            forceTokenRefresh: true,
            message: 'Business context switched. Please refresh your token.'
        });

    } catch (error: unknown) {
        log.error('[OwnerController] switchBusiness error', error);
        res.status(500).json({ success: false, error: 'Failed to switch business' });
    }
}

/**
 * GET /v1/owner/entitlements
 * Get user's entitlements (max businesses, plan).
 */
export async function getEntitlements(req: Request, res: Response): Promise<void> {
    const user = (req as any).user as { uid: string };

    try {
        const entitlements = await entitlementsService.getEntitlements(user.uid);
        const ownedCount = await membershipRepository.countUserOwnedBusinesses(user.uid);

        res.json({
            success: true,
            entitlements: {
                maxBusinesses: entitlements.maxBusinesses,
                plan: entitlements.plan,
                currentCount: ownedCount,
                canAddMore: ownedCount < entitlements.maxBusinesses
            }
        });
    } catch (error: unknown) {
        log.error('[OwnerController] getEntitlements error', error);
        res.status(500).json({ success: false, error: 'Failed to get entitlements' });
    }
}

/**
 * GET /v1/owner/inbox
 * List chat sessions for the business.
 */
export async function getInbox(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
        const sessions = await businessChatRepository.listSessions(ctx.businessId, { limit });

        res.json({
            success: true,
            sessions: sessions.map(session => ({
                id: session.id,
                kind: session.kind,
                customerName: session.customerName,
                lastMessage: session.lastMessage,
                lastMessageAt: session.lastMessageAt,
                messageCount: session.messageCount,
                leadCaptured: session.leadCaptured,
                status: session.status
            }))
        });

    } catch (error: unknown) {
        log.error('[OwnerController] getInbox error', error);
        res.status(500).json({ success: false, error: 'Failed to get inbox' });
    }
}

/**
 * GET /v1/owner/inbox/:sessionId/messages
 * Get message history for a specific session.
 */
export async function getInboxMessages(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId required' });
        return;
    }

    try {
        const messages = await businessChatRepository.getHistory(ctx.businessId, sessionId, limit);

        res.json({
            success: true,
            sessionId,
            messages: messages.map(m => ({
                id: m.id,
                role: m.role,
                text: m.text,
                createdAt: m.createdAt,
                sources: (m as any).sources,
                meta: (m as any).meta
            }))
        });
    } catch (error: unknown) {
        log.error('[OwnerController] getInboxMessages error', error, { sessionId });
        res.status(500).json({ success: false, error: 'Failed to load messages' });
    }
}

/**
 * GET /v1/owner/leads
 * List captured leads for the business.
 */
export async function getLeads(req: Request, res: Response): Promise<void> {
    const ctx: TenantContext = (req as any).tenantContext;
    const limit = parseInt(req.query.limit as string) || 50;

    try {
        const leads = await leadRepository.list(ctx.businessId, { limit });

        res.json({
            success: true,
            leads: leads.map(lead => ({
                id: lead.id,
                name: lead.name,
                phoneE164: lead.phoneE164,
                email: lead.email,
                message: lead.message,
                status: lead.status,
                createdAt: lead.createdAt
            }))
        });

    } catch (error: unknown) {
        log.error('[OwnerController] getLeads error', error);
        res.status(500).json({ success: false, error: 'Failed to get leads' });
    }
}
