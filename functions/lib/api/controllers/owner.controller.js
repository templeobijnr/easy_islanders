"use strict";
/**
 * Owner Controller (V1)
 *
 * Handles business owner dashboard operations.
 * BusinessId comes from TenantContext, never from request body.
 *
 * Note: Knowledge and Products have dedicated controllers.
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
exports.getBusiness = getBusiness;
exports.listBusinesses = listBusinesses;
exports.switchBusiness = switchBusiness;
exports.getEntitlements = getEntitlements;
exports.getInbox = getInbox;
exports.getInboxMessages = getInboxMessages;
exports.getLeads = getLeads;
const business_repository_1 = require("../../repositories/business.repository");
const businessChat_repository_1 = require("../../repositories/businessChat.repository");
const lead_repository_1 = require("../../repositories/lead.repository");
const membership_repository_1 = require("../../repositories/membership.repository");
const entitlements_service_1 = require("../../services/entitlements.service");
const log_1 = require("../../utils/log");
const claims_1 = require("../../utils/claims");
const admin = __importStar(require("firebase-admin"));
/**
 * GET /v1/owner/business
 * Get the owner's business profile.
 */
async function getBusiness(req, res) {
    const ctx = req.tenantContext;
    try {
        const business = await business_repository_1.businessRepository.getById(ctx.businessId);
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
    }
    catch (error) {
        log_1.log.error('[OwnerController] getBusiness error', error);
        res.status(500).json({ success: false, error: 'Failed to get business' });
    }
}
/**
 * GET /v1/owner/businesses
 * List all businesses the user is a member of.
 */
async function listBusinesses(req, res) {
    const user = req.user;
    try {
        const businesses = await membership_repository_1.membershipRepository.getUserBusinesses(user.uid);
        res.json({
            success: true,
            businesses: businesses.map(b => ({
                businessId: b.businessId,
                role: b.role,
                businessName: b.businessName,
                joinedAt: b.joinedAt
            }))
        });
    }
    catch (error) {
        log_1.log.error('[OwnerController] listBusinesses error', error);
        res.status(500).json({ success: false, error: 'Failed to list businesses' });
    }
}
/**
 * POST /v1/owner/switch-business
 * Switch active business context (updates claims).
 */
async function switchBusiness(req, res) {
    var _a;
    const user = req.user;
    const { businessId } = req.body || {};
    if (!businessId || typeof businessId !== 'string') {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }
    try {
        // Verify user is a member of this business
        const isMember = await membership_repository_1.membershipRepository.isMember(businessId, user.uid);
        const isAdmin = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.admin) === true;
        if (!isMember && !isAdmin) {
            log_1.log.warn('[OwnerController] Switch denied - not a member', { uid: user.uid, businessId });
            res.status(403).json({
                success: false,
                error: 'NOT_A_MEMBER',
                message: 'You are not a member of this business'
            });
            return;
        }
        // Update claims to new business
        await (0, claims_1.setOwnerClaims)(user.uid, businessId);
        // Signal client to refresh token (best-effort, RTDB optional)
        try {
            await admin.database().ref(`metadata/${user.uid}`).set({ refreshTime: Date.now() });
        }
        catch (_b) {
            // ignore (RTDB may not be configured)
        }
        log_1.log.info('[OwnerController] Business switched', { uid: user.uid, businessId });
        res.json({
            success: true,
            businessId,
            forceTokenRefresh: true,
            message: 'Business context switched. Please refresh your token.'
        });
    }
    catch (error) {
        log_1.log.error('[OwnerController] switchBusiness error', error);
        res.status(500).json({ success: false, error: 'Failed to switch business' });
    }
}
/**
 * GET /v1/owner/entitlements
 * Get user's entitlements (max businesses, plan).
 */
async function getEntitlements(req, res) {
    const user = req.user;
    try {
        const entitlements = await entitlements_service_1.entitlementsService.getEntitlements(user.uid);
        const ownedCount = await membership_repository_1.membershipRepository.countUserOwnedBusinesses(user.uid);
        res.json({
            success: true,
            entitlements: {
                maxBusinesses: entitlements.maxBusinesses,
                plan: entitlements.plan,
                currentCount: ownedCount,
                canAddMore: ownedCount < entitlements.maxBusinesses
            }
        });
    }
    catch (error) {
        log_1.log.error('[OwnerController] getEntitlements error', error);
        res.status(500).json({ success: false, error: 'Failed to get entitlements' });
    }
}
/**
 * GET /v1/owner/inbox
 * List chat sessions for the business.
 */
async function getInbox(req, res) {
    const ctx = req.tenantContext;
    const limit = parseInt(req.query.limit) || 50;
    try {
        const sessions = await businessChat_repository_1.businessChatRepository.listSessions(ctx.businessId, { limit });
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
    }
    catch (error) {
        log_1.log.error('[OwnerController] getInbox error', error);
        res.status(500).json({ success: false, error: 'Failed to get inbox' });
    }
}
/**
 * GET /v1/owner/inbox/:sessionId/messages
 * Get message history for a specific session.
 */
async function getInboxMessages(req, res) {
    const ctx = req.tenantContext;
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    if (!sessionId) {
        res.status(400).json({ success: false, error: 'sessionId required' });
        return;
    }
    try {
        const messages = await businessChat_repository_1.businessChatRepository.getHistory(ctx.businessId, sessionId, limit);
        res.json({
            success: true,
            sessionId,
            messages: messages.map(m => ({
                id: m.id,
                role: m.role,
                text: m.text,
                createdAt: m.createdAt,
                sources: m.sources,
                meta: m.meta
            }))
        });
    }
    catch (error) {
        log_1.log.error('[OwnerController] getInboxMessages error', error, { sessionId });
        res.status(500).json({ success: false, error: 'Failed to load messages' });
    }
}
/**
 * GET /v1/owner/leads
 * List captured leads for the business.
 */
async function getLeads(req, res) {
    const ctx = req.tenantContext;
    const limit = parseInt(req.query.limit) || 50;
    try {
        const leads = await lead_repository_1.leadRepository.list(ctx.businessId, { limit });
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
    }
    catch (error) {
        log_1.log.error('[OwnerController] getLeads error', error);
        res.status(500).json({ success: false, error: 'Failed to get leads' });
    }
}
//# sourceMappingURL=owner.controller.js.map