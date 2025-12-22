/**
 * Admin Controller (V1)
 *
 * Admin-only recovery / dev tooling endpoints.
 * Kept intentionally small; avoid mixing with owner endpoints.
 */

import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { businessRepository } from '../../repositories/business.repository';
import { entitlementsService } from '../../services/entitlements.service';
import { setRequestContext } from '../../utils/request-context';
import { log } from '../../utils/log';
import { setOwnerClaims } from '../../utils/claims';

function mapAssignErrorToStatus(code: string): number {
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
export async function assignOwner(req: Request, res: Response): Promise<void> {
    const caller = (req as any).user as { uid: string; email?: string };
    const { businessId, targetUid, targetEmail, force } = req.body || {};

    if (!businessId || typeof businessId !== 'string') {
        res.status(400).json({ success: false, error: 'businessId required' });
        return;
    }

    setRequestContext({ businessId });

    try {
        let uid: string | undefined = typeof targetUid === 'string' ? targetUid : undefined;

        if (!uid && typeof targetEmail === 'string') {
            const userRecord = await admin.auth().getUserByEmail(targetEmail);
            uid = userRecord.uid;
        }

        if (!uid) {
            uid = caller.uid;
        }

        const result = await businessRepository.adminAssignOwner(businessId, uid, { force: force === true });

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
        await setOwnerClaims(uid, businessId);

        // Best-effort token refresh signal (optional).
        try {
            await admin.database().ref(`metadata/${uid}`).set({ refreshTime: Date.now() });
        } catch {
            // ignore (RTDB may not be configured)
        }

        log.info('[AdminV1] Assigned owner', {
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
    } catch (error: unknown) {
        log.error('[AdminV1] assignOwner error', error, { businessId });
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
export async function updateEntitlements(req: Request, res: Response): Promise<void> {
    const caller = (req as any).user as { uid: string; email?: string };
    const { targetUid, targetEmail, maxBusinesses, plan } = req.body || {};

    try {
        let uid: string | undefined = typeof targetUid === 'string' ? targetUid : undefined;

        if (!uid && typeof targetEmail === 'string') {
            const userRecord = await admin.auth().getUserByEmail(targetEmail);
            uid = userRecord.uid;
        }

        if (!uid) {
            res.status(400).json({ success: false, error: 'targetUid or targetEmail required' });
            return;
        }

        const updates: any = {};
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

        await entitlementsService.updateEntitlements(uid, updates);

        log.info('[AdminV1] Updated entitlements', { uid, updates, byUid: caller.uid, byEmail: caller.email });

        res.json({ success: true, uid, updates });
    } catch (error: unknown) {
        log.error('[AdminV1] updateEntitlements error', error);
        res.status(500).json({ success: false, error: 'Failed to update entitlements' });
    }
}
