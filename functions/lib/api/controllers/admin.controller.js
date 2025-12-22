"use strict";
/**
 * Admin Controller (V1)
 *
 * Admin-only recovery / dev tooling endpoints.
 * Kept intentionally small; avoid mixing with owner endpoints.
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
exports.assignOwner = assignOwner;
exports.updateEntitlements = updateEntitlements;
const admin = __importStar(require("firebase-admin"));
const business_repository_1 = require("../../repositories/business.repository");
const entitlements_service_1 = require("../../services/entitlements.service");
const request_context_1 = require("../../utils/request-context");
const log_1 = require("../../utils/log");
const claims_1 = require("../../utils/claims");
function mapAssignErrorToStatus(code) {
    switch (code) {
        case 'BUSINESS_NOT_FOUND':
            return 404;
        case 'ALREADY_CLAIMED':
            return 409;
        case 'USER_ALREADY_HAS_BUSINESS':
            return 409;
        case 'NO_BUSINESS_PHONE':
            return 400;
        case 'BUSINESS_INACTIVE':
            return 400;
        default:
            return 400;
    }
}
/**
 * POST /v1/admin/assign-owner
 *
 * Force-assign `businessId` to a user as the owner (no OTP).
 *
 * Body:
 * - businessId: string (required)
 * - targetUid?: string
 * - targetEmail?: string
 * - force?: boolean (allow overriding existing assignments)
 */
async function assignOwner(req, res) {
    const caller = req.user;
    const { businessId, targetUid, targetEmail, force } = req.body || {};
    if (!businessId || typeof businessId !== 'string') {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }
    (0, request_context_1.setRequestContext)({ businessId });
    try {
        let uid = typeof targetUid === 'string' ? targetUid : undefined;
        if (!uid && typeof targetEmail === 'string') {
            const userRecord = await admin.auth().getUserByEmail(targetEmail);
            uid = userRecord.uid;
        }
        if (!uid) {
            uid = caller.uid;
        }
        const result = await business_repository_1.businessRepository.adminAssignOwner(businessId, uid, { force: force === true });
        if (!result.success) {
            const status = mapAssignErrorToStatus(result.error || 'UNKNOWN');
            res.status(status).json({
                success: false,
                error: result.error || 'FAILED',
                message: result.error
            });
            return;
        }
        // Update Auth claims using centralized claims module
        await (0, claims_1.setOwnerClaims)(uid, businessId);
        // Best-effort token refresh signal (optional).
        try {
            await admin.database().ref(`metadata/${uid}`).set({ refreshTime: Date.now() });
        }
        catch (_a) {
            // ignore (RTDB may not be configured)
        }
        log_1.log.info('[AdminV1] Assigned owner', {
            businessId,
            targetUid: uid,
            byUid: caller.uid,
            byEmail: caller.email
        });
        res.json({
            success: true,
            businessId,
            uid,
            force: force === true
        });
    }
    catch (error) {
        log_1.log.error('[AdminV1] assignOwner error', error, { businessId });
        res.status(500).json({ success: false, error: 'Failed to assign owner' });
    }
}
/**
 * POST /v1/admin/entitlements
 *
 * Update entitlements for a user (dev + support tooling).
 *
 * Body:
 * - targetUid?: string
 * - targetEmail?: string
 * - maxBusinesses?: number
 * - plan?: 'free' | 'pro' | 'multi'
 */
async function updateEntitlements(req, res) {
    const caller = req.user;
    const { targetUid, targetEmail, maxBusinesses, plan } = req.body || {};
    try {
        let uid = typeof targetUid === 'string' ? targetUid : undefined;
        if (!uid && typeof targetEmail === 'string') {
            const userRecord = await admin.auth().getUserByEmail(targetEmail);
            uid = userRecord.uid;
        }
        if (!uid) {
            res.status(400).json({ success: false, error: 'targetUid or targetEmail required' });
            return;
        }
        const updates = {};
        if (typeof maxBusinesses === 'number') {
            if (!Number.isFinite(maxBusinesses) || maxBusinesses < 0 || maxBusinesses > 1000) {
                res.status(400).json({ success: false, error: 'maxBusinesses must be a number between 0 and 1000' });
                return;
            }
            updates.maxBusinesses = Math.floor(maxBusinesses);
        }
        if (typeof plan === 'string') {
            if (!['free', 'pro', 'multi'].includes(plan)) {
                res.status(400).json({ success: false, error: 'plan must be one of: free, pro, multi' });
                return;
            }
            updates.plan = plan;
        }
        if (Object.keys(updates).length === 0) {
            res.status(400).json({ success: false, error: 'No updates provided' });
            return;
        }
        await entitlements_service_1.entitlementsService.updateEntitlements(uid, updates);
        log_1.log.info('[AdminV1] Updated entitlements', { uid, updates, byUid: caller.uid, byEmail: caller.email });
        res.json({ success: true, uid, updates });
    }
    catch (error) {
        log_1.log.error('[AdminV1] updateEntitlements error', error);
        res.status(500).json({ success: false, error: 'Failed to update entitlements' });
    }
}
//# sourceMappingURL=admin.controller.js.map