/**
 * Auth Admin Middleware (V1)
 *
 * Admin endpoints are separate from owner endpoints.
 * Admin can perform manual recovery / dev tooling actions, but these must never
 * weaken owner-route invariants (owner routes remain claims-only).
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { log } from '../../utils/log';

export async function requireAdmin(
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

        if ((decodedToken as any).admin !== true) {
            res.status(403).json({
                error: 'Admin privileges required',
                code: 'NOT_ADMIN'
            });
            return;
        }

        (req as any).user = decodedToken;
        next();
    } catch (error) {
        log.error('[AuthAdmin] Token verification failed', error);
        res.status(401).json({ error: 'Invalid token' });
    }
}

