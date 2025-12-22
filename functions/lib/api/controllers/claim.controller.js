"use strict";
/**
 * Claim Controller
 *
 * Handles business claiming via Firebase Phone Auth verification.
 *
 * V1 posture:
 * - Client verifies OTP using Firebase Phone Auth and links phoneNumber to the user.
 * - Server confirms claim by matching user.phoneNumber with business.businessPhoneE164.
 * Controllers are thin: validate → call service → respond.
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
exports.claimStart = claimStart;
exports.claimConfirm = claimConfirm;
exports.claimDevBypass = claimDevBypass;
const business_repository_1 = require("../../repositories/business.repository");
const membership_repository_1 = require("../../repositories/membership.repository");
const entitlements_service_1 = require("../../services/entitlements.service");
const admin = __importStar(require("firebase-admin"));
const request_context_1 = require("../../utils/request-context");
const log_1 = require("../../utils/log");
const claims_1 = require("../../utils/claims");
function normalizeE164(phone) {
    const cleaned = phone.trim().replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+'))
        return null;
    const normalized = `+${cleaned.slice(1).replace(/\D/g, '')}`;
    if (!/^\+[1-9]\d{6,14}$/.test(normalized))
        return null;
    return normalized;
}
/**
 * POST /v1/claim/start
 * Start the claim process for a business.
 */
async function claimStart(req, res) {
    var _a;
    const { businessId } = req.body;
    const user = req.user;
    if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }
    try {
        (0, request_context_1.setRequestContext)({ businessId });
        // Start claim in repository (transactional)
        const result = await business_repository_1.businessRepository.startClaim(businessId, user.uid);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
                message: getClaimErrorMessage(result.error)
            });
            return;
        }
        const businessPhone = (_a = result.business) === null || _a === void 0 ? void 0 : _a.businessPhoneE164;
        if (!businessPhone) {
            res.status(400).json({
                success: false,
                error: 'NO_BUSINESS_PHONE',
                message: 'This business has no phone number on file to verify'
            });
            return;
        }
        // Client must verify this phone via Firebase Phone Auth and link it to their account.
        // We do NOT send OTP from the server in V1.
        res.json({
            success: true,
            message: 'Verify this phone number via Firebase Phone Auth, then confirm claim.',
            businessPhoneE164: businessPhone
        });
    }
    catch (error) {
        log_1.log.error('[ClaimController] claimStart error', error);
        res.status(500).json({ success: false, error: 'Failed to start claim process' });
    }
}
/**
 * POST /v1/claim/confirm
 * Confirm claim after Firebase Phone Auth verification (server-side match).
 */
async function claimConfirm(req, res) {
    const { businessId } = req.body;
    const user = req.user;
    if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }
    try {
        (0, request_context_1.setRequestContext)({ businessId });
        const business = await business_repository_1.businessRepository.getById(businessId);
        if (!business) {
            res.status(404).json({
                success: false,
                error: 'BUSINESS_NOT_FOUND',
                message: 'Business not found'
            });
            return;
        }
        const expectedPhone = normalizeE164(business.businessPhoneE164);
        if (!expectedPhone) {
            res.status(400).json({
                success: false,
                error: 'NO_BUSINESS_PHONE',
                message: 'Business phone is missing or invalid'
            });
            return;
        }
        const userRecord = await admin.auth().getUser(user.uid);
        const actualPhone = userRecord.phoneNumber ? normalizeE164(userRecord.phoneNumber) : null;
        if (!actualPhone) {
            res.status(400).json({
                success: false,
                error: 'NO_VERIFIED_PHONE',
                message: 'No verified phone number on this account'
            });
            return;
        }
        if (actualPhone !== expectedPhone) {
            res.status(403).json({
                success: false,
                error: 'PHONE_MISMATCH',
                message: 'Verified phone does not match business phone'
            });
            return;
        }
        // CHECK ENTITLEMENT LIMITS before allowing claim
        const currentCount = await membership_repository_1.membershipRepository.countUserOwnedBusinesses(user.uid);
        const entitlementCheck = await entitlements_service_1.entitlementsService.canAddBusiness(user.uid, currentCount);
        if (!entitlementCheck.allowed) {
            log_1.log.warn('[Claim] Limit reached', { uid: user.uid, currentCount });
            res.status(403).json({
                success: false,
                error: 'LIMIT_REACHED',
                message: entitlementCheck.reason,
                upgradeRequired: true,
                currentCount,
                maxAllowed: (await entitlements_service_1.entitlementsService.getEntitlements(user.uid)).maxBusinesses
            });
            return;
        }
        // Confirm claim in repository (transactional)
        const result = await business_repository_1.businessRepository.confirmClaim(businessId, user.uid, actualPhone);
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
                message: getClaimErrorMessage(result.error)
            });
            return;
        }
        // Set owner claims using centralized claims module
        await (0, claims_1.setOwnerClaims)(user.uid, businessId);
        // Signal client to refresh token (best-effort, RTDB optional)
        try {
            await admin.database().ref(`metadata/${user.uid}`).set({ refreshTime: Date.now() });
        }
        catch (_a) {
            // ignore (RTDB may not be configured)
        }
        log_1.log.info('[Claim] Business claimed', { businessId, uid: user.uid });
        res.json({
            success: true,
            message: 'Business claimed successfully',
            businessId,
            claimsUpdated: true,
            forceTokenRefresh: true // Client MUST call getIdToken(true) after this
        });
    }
    catch (error) {
        log_1.log.error('[ClaimController] claimConfirm error', error);
        res.status(500).json({ success: false, error: 'Failed to confirm claim' });
    }
}
function getClaimErrorMessage(errorCode) {
    const messages = {
        'BUSINESS_NOT_FOUND': 'Business not found',
        'ALREADY_CLAIMED': 'This business has already been claimed',
        'BUSINESS_INACTIVE': 'This business is no longer active',
        'CLAIM_IN_PROGRESS': 'Another user is currently claiming this business',
        'NO_BUSINESS_PHONE': 'This business has no phone number on file for verification',
        'NO_PENDING_CLAIM': 'No pending claim found',
        'WRONG_USER': 'This claim belongs to another user',
        'CLAIM_EXPIRED': 'Claim verification has expired. Please start again.',
        'NO_VERIFIED_PHONE': 'Please verify your phone number before confirming the claim',
        'PHONE_MISMATCH': 'Your verified phone number does not match the business phone',
        'TRANSACTION_FAILED': 'Please try again',
        'USER_ALREADY_HAS_BUSINESS': 'You have already claimed a different business',
        'DEV_BYPASS_DISABLED': 'Dev bypass is not enabled on server'
    };
    const message = messages[errorCode];
    if (!message) {
        log_1.log.warn('[Claim] Unmapped error code', { errorCode });
    }
    return message || `An error occurred: ${errorCode}`;
}
/**
 * POST /v1/claim/dev-bypass
 * DEV ONLY: Skip phone verification and claim directly.
 * Only works when ENABLE_DEV_BYPASS=true in environment
 */
async function claimDevBypass(req, res) {
    // Block unless explicitly enabled via env variable
    const devBypassEnabled = process.env.ENABLE_DEV_BYPASS === 'true';
    if (!devBypassEnabled) {
        res.status(403).json({
            success: false,
            error: 'DEV_BYPASS_DISABLED',
            message: 'Dev bypass is not enabled. Set ENABLE_DEV_BYPASS=true in .env'
        });
        return;
    }
    const { businessId } = req.body;
    const user = req.user;
    if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }
    try {
        (0, request_context_1.setRequestContext)({ businessId });
        log_1.log.info('[Claim] DEV BYPASS: Claiming without phone verification', { businessId, uid: user.uid });
        // CHECK ENTITLEMENT LIMITS (admins can bypass)
        const isAdmin = (user === null || user === void 0 ? void 0 : user.admin) === true;
        if (!isAdmin) {
            const currentCount = await membership_repository_1.membershipRepository.countUserOwnedBusinesses(user.uid);
            const entitlementCheck = await entitlements_service_1.entitlementsService.canAddBusiness(user.uid, currentCount);
            if (!entitlementCheck.allowed) {
                log_1.log.warn('[Claim] Limit reached (dev bypass)', { uid: user.uid, currentCount });
                res.status(403).json({
                    success: false,
                    error: 'LIMIT_REACHED',
                    message: entitlementCheck.reason,
                    upgradeRequired: true,
                    currentCount,
                    maxAllowed: (await entitlements_service_1.entitlementsService.getEntitlements(user.uid)).maxBusinesses
                });
                return;
            }
        }
        // Use adminAssignOwner which bypasses phone verification
        const result = await business_repository_1.businessRepository.adminAssignOwner(businessId, user.uid, { force: true });
        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
                message: getClaimErrorMessage(result.error)
            });
            return;
        }
        // Set owner claims using centralized claims module
        await (0, claims_1.setOwnerClaims)(user.uid, businessId);
        // Signal client to refresh token (best-effort, RTDB optional)
        try {
            await admin.database().ref(`metadata/${user.uid}`).set({ refreshTime: Date.now() });
        }
        catch (_a) {
            // ignore (RTDB may not be configured)
        }
        log_1.log.info('[Claim] DEV BYPASS: Business claimed successfully', { businessId, uid: user.uid });
        res.json({
            success: true,
            message: '[DEV] Business claimed successfully (phone verification bypassed)',
            businessId,
            claimsUpdated: true,
            forceTokenRefresh: true
        });
    }
    catch (error) {
        log_1.log.error('[ClaimController] devBypass error', error);
        res.status(500).json({ success: false, error: 'Failed to claim business' });
    }
}
//# sourceMappingURL=claim.controller.js.map