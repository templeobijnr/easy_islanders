/**
 * Auth Owner Middleware
 * 
 * Middleware for owner routes that require authenticated access
 * to a specific business. Derives businessId ONLY from custom claims.
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { TenantContext } from '../../types/tenant';
import { setRequestContext } from '../../utils/request-context';
import { log } from '../../utils/log';

/**
 * Basic authentication check.
 * Verifies Firebase ID token and attaches user to request.
 */
export async function isAuthenticated(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        (req as any).user = decodedToken;
        next();
    } catch (error) {
        log.error('[AuthOwner] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Owner authentication middleware (V1).
 *
 * Non-negotiable: owner scope is derived ONLY from trusted Auth claims:
 * - request.auth.token.role == 'owner'
 * - request.auth.token.businessId is present
 *
 * NEVER accepts businessId from request body/params for owner routes.
 */
export async function requireOwner(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    try {
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        const uid = decodedToken.uid;

        // Debug: Log claims for troubleshooting
        const roleClaim = (decodedToken as any).role as string | undefined;
        const isAdmin = (decodedToken as any).admin === true;
        const businessId = decodedToken.businessId as string | undefined;

        log.info('[AuthOwner] Token claims', {
            uid,
            role: roleClaim,
            admin: isAdmin,
            businessId: businessId ? businessId.substring(0, 8) + '...' : 'MISSING',
        });

        // Non-negotiable: owner scope is derived ONLY from trusted Auth claims.
        // Never accept businessId from request body/params for owner routes.
        if (roleClaim !== 'owner') {
            log.warn('[AuthOwner] NOT_OWNER', { role: roleClaim, uid });
            res.status(403).json({
                error: 'Owner role required',
                code: 'NOT_OWNER',
                hint: 'Your token is missing the owner role. Try logging out and back in, or re-claim your business.'
            });
            return;
        }

        if (!businessId) {
            log.warn('[AuthOwner] NO_BUSINESS_CLAIM', { uid });
            res.status(403).json({
                error: 'Missing businessId claim',
                code: 'NO_BUSINESS_CLAIM',
                hint: 'Your token is missing businessId. Try logging out and back in, or re-claim your business.'
            });
            return;
        }

        // Attach TenantContext
        const ctx: TenantContext = {
            businessId,
            uid,
            role: 'owner'
        };

        (req as any).user = decodedToken;
        (req as any).tenantContext = ctx;
        setRequestContext({ businessId });

        next();
    } catch (error) {
        log.error('[AuthOwner] requireOwner failed', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
}

export { requireOwner as authOwner };
