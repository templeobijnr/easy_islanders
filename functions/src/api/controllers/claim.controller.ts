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

import { Request, Response } from 'express';
import { businessRepository } from '../../repositories/business.repository';
import { membershipRepository } from '../../repositories/membership.repository';
import { entitlementsService } from '../../services/entitlements.service';
import * as admin from 'firebase-admin';
import { setRequestContext } from '../../utils/request-context';
import { log } from '../../utils/log';
import { setOwnerClaims } from '../../utils/claims';

function normalizeE164(phone: string): string | null {
    const cleaned = phone.trim().replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) return null;
    const normalized = `+${cleaned.slice(1).replace(/\D/g, '')}`;
    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) return null;
    return normalized;
}

/**
 * POST /v1/claim/start
 * Start the claim process for a business.
 */
export async function claimStart(req: Request, res: Response): Promise<void> {
    const { businessId } = req.body;
    const user = (req as any).user;

    if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }

    try {
        setRequestContext({ businessId });
        // Start claim in repository (transactional)
        const result = await businessRepository.startClaim(businessId, user.uid);

        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
                message: getClaimErrorMessage(result.error!)
            });
            return;
        }

        const businessPhone = result.business?.businessPhoneE164;
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

    } catch (error: unknown) {
        log.error('[ClaimController] claimStart error', error);
        res.status(500).json({ success: false, error: 'Failed to start claim process' });
    }
}

/**
 * POST /v1/claim/confirm
 * Confirm claim after Firebase Phone Auth verification (server-side match).
 */
export async function claimConfirm(req: Request, res: Response): Promise<void> {
    const { businessId } = req.body;
    const user = (req as any).user;

    if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }

    try {
        setRequestContext({ businessId });
        const business = await businessRepository.getById(businessId);
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
        const currentCount = await membershipRepository.countUserOwnedBusinesses(user.uid);
        const entitlementCheck = await entitlementsService.canAddBusiness(user.uid, currentCount);

        if (!entitlementCheck.allowed) {
            log.warn('[Claim] Limit reached', { uid: user.uid, currentCount });
            res.status(403).json({
                success: false,
                error: 'LIMIT_REACHED',
                message: entitlementCheck.reason,
                upgradeRequired: true,
                currentCount,
                maxAllowed: (await entitlementsService.getEntitlements(user.uid)).maxBusinesses
            });
            return;
        }

        // Confirm claim in repository (transactional)
        const result = await businessRepository.confirmClaim(businessId, user.uid, actualPhone);

        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
                message: getClaimErrorMessage(result.error!)
            });
            return;
        }

        // Set owner claims using centralized claims module
        await setOwnerClaims(user.uid, businessId);

        // Signal client to refresh token (best-effort, RTDB optional)
        try {
            await admin.database().ref(`metadata/${user.uid}`).set({ refreshTime: Date.now() });
        } catch {
            // ignore (RTDB may not be configured)
        }

        log.info('[Claim] Business claimed', { businessId, uid: user.uid });

        res.json({
            success: true,
            message: 'Business claimed successfully',
            businessId,
            claimsUpdated: true,
            forceTokenRefresh: true  // Client MUST call getIdToken(true) after this
        });

    } catch (error: unknown) {
        log.error('[ClaimController] claimConfirm error', error);
        res.status(500).json({ success: false, error: 'Failed to confirm claim' });
    }
}

function getClaimErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
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
        log.warn('[Claim] Unmapped error code', { errorCode });
    }
    return message || `An error occurred: ${errorCode}`;
}

/**
 * POST /v1/claim/dev-bypass
 * DEV ONLY: Skip phone verification and claim directly.
 * Only works when ENABLE_DEV_BYPASS=true in environment
 */
export async function claimDevBypass(req: Request, res: Response): Promise<void> {
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
    const user = (req as any).user;

    if (!businessId) {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }

    try {
        setRequestContext({ businessId });
        log.info('[Claim] DEV BYPASS: Claiming without phone verification', { businessId, uid: user.uid });

        // CHECK ENTITLEMENT LIMITS (admins can bypass)
        const isAdmin = user?.admin === true;
        if (!isAdmin) {
            const currentCount = await membershipRepository.countUserOwnedBusinesses(user.uid);
            const entitlementCheck = await entitlementsService.canAddBusiness(user.uid, currentCount);

            if (!entitlementCheck.allowed) {
                log.warn('[Claim] Limit reached (dev bypass)', { uid: user.uid, currentCount });
                res.status(403).json({
                    success: false,
                    error: 'LIMIT_REACHED',
                    message: entitlementCheck.reason,
                    upgradeRequired: true,
                    currentCount,
                    maxAllowed: (await entitlementsService.getEntitlements(user.uid)).maxBusinesses
                });
                return;
            }
        }

        // Use adminAssignOwner which bypasses phone verification
        const result = await businessRepository.adminAssignOwner(businessId, user.uid, { force: true });

        if (!result.success) {
            res.status(400).json({
                success: false,
                error: result.error,
                message: getClaimErrorMessage(result.error!)
            });
            return;
        }

        // Set owner claims using centralized claims module
        await setOwnerClaims(user.uid, businessId);

        // Signal client to refresh token (best-effort, RTDB optional)
        try {
            await admin.database().ref(`metadata/${user.uid}`).set({ refreshTime: Date.now() });
        } catch {
            // ignore (RTDB may not be configured)
        }

        log.info('[Claim] DEV BYPASS: Business claimed successfully', { businessId, uid: user.uid });

        res.json({
            success: true,
            message: '[DEV] Business claimed successfully (phone verification bypassed)',
            businessId,
            claimsUpdated: true,
            forceTokenRefresh: true
        });

    } catch (error: unknown) {
        log.error('[ClaimController] devBypass error', error);
        res.status(500).json({ success: false, error: 'Failed to claim business' });
    }
}
