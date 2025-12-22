import { getErrorMessage } from '../../../utils/errors';
/**
 * Merchant Session Auth Middleware
 * 
 * Verifies merchant session JWT and attaches session info to request.
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.MERCHANT_JWT_SECRET || 'dev-secret-do-not-use-in-prod';

export interface MerchantSessionPayload {
    sid: string;
    listingId: string;
    scopes: string[];
    jobId?: string;
}

/**
 * Middleware that verifies merchant session JWT.
 * Expects: Authorization: Bearer <SESSION_JWT>
 */
export async function authenticateMerchant(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const traceId = (req as any).traceId || 'unknown';
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            error: {
                code: 'MISSING_SESSION_TOKEN',
                message: 'Authorization header with Bearer token is required',
                traceId,
            },
        });
        return;
    }

    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            audience: 'askmerve-merchant',
        }) as MerchantSessionPayload;

        (req as any).merchantSession = decoded;
        next();
    } catch (error: unknown) {
        console.error('[MerchantAuth] JWT verification failed:', getErrorMessage(error));

        res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_SESSION_TOKEN',
                message: 'Invalid or expired session',
                traceId,
            },
        });
    }
}
