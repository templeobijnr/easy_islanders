/**
 * Require Claimed Middleware
 * 
 * Blocks access to owner endpoints if the business is not yet claimed.
 * Must be used AFTER requireOwner middleware.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/firebase';
import { Business } from '../../types/tenant';
import { log } from '../../utils/log';

/**
 * Require that the business is claimed before allowing access.
 * Rejects with 403 if business is unclaimed or pending.
 */
export async function requireClaimed(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const ctx = (req as any).tenantContext;

    if (!ctx?.businessId) {
        res.status(403).json({
            error: 'No business context available',
            code: 'NO_CONTEXT'
        });
        return;
    }

    try {
        const businessDoc = await db.collection('businesses').doc(ctx.businessId).get();

        if (!businessDoc.exists) {
            res.status(404).json({
                error: 'Business not found',
                code: 'BUSINESS_NOT_FOUND'
            });
            return;
        }

        const business = businessDoc.data() as Business;

        if (business.claimStatus !== 'claimed') {
            res.status(403).json({
                error: 'Business must be claimed to access this resource',
                code: 'NOT_CLAIMED',
                claimStatus: business.claimStatus
            });
            return;
        }

        if (business.claimedByUid && business.claimedByUid !== ctx.uid) {
            res.status(403).json({
                error: 'Business is claimed by another account',
                code: 'NOT_BUSINESS_OWNER'
            });
            return;
        }

        // Attach business to request for downstream use
        (req as any).business = business;

        next();
    } catch (error) {
        log.error('[RequireClaimed] Error checking business', error);
        res.status(500).json({ error: 'Failed to verify business status' });
    }
}
