/**
 * Auth Anon Middleware
 * 
 * Middleware for public routes that accept both anonymous
 * and authenticated users.
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { log } from '../../utils/log';

/**
 * Require some form of authentication (anonymous or full).
 * Accepts Firebase Anonymous Auth tokens.
 */
export async function requireAuth(
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

        // Attach user info
        (req as any).user = decodedToken;
        const signInProvider = (decodedToken as any).firebase?.sign_in_provider;
        (req as any).isAnonymous = signInProvider === 'anonymous';

        next();
    } catch (error) {
        log.error('[AuthAnon] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}

/**
 * Require anonymous auth specifically.
 * Rejects fully authenticated users (for public-only endpoints if needed).
 */
export async function requireAnonymous(
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

        const signInProvider = (decodedToken as any).firebase?.sign_in_provider;
        if (signInProvider !== 'anonymous') {
            res.status(403).json({
                error: 'This endpoint requires anonymous authentication'
            });
            return;
        }

        (req as any).user = decodedToken;
        (req as any).isAnonymous = true;

        next();
    } catch (error) {
        log.error('[AuthAnon] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}

export { requireAuth as authAnon };
