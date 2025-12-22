/**
 * Firebase Auth Middleware for Express
 * 
 * Verifies Firebase ID tokens and attaches user info to request.
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

/**
 * Authenticated user info attached to request.
 */
export interface AuthenticatedUser {
    uid: string;
    email?: string;
    phone?: string;
    emailVerified: boolean;
}

/**
 * Extended request with authenticated user.
 */
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
}

/**
 * Middleware that verifies Firebase ID token from Authorization header.
 * Expects: Authorization: Bearer <ID_TOKEN>
 * 
 * On success, attaches req.user with uid and claims.
 * On failure, returns 401.
 */
export async function authenticateUser(
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
                code: 'MISSING_AUTH_TOKEN',
                message: 'Authorization header with Bearer token is required',
                traceId,
            },
        });
        return;
    }

    const idToken = authHeader.slice(7); // Remove 'Bearer '

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        (req as AuthenticatedRequest).user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            phone: decodedToken.phone_number,
            emailVerified: decodedToken.email_verified ?? false,
        };

        next();
    } catch (error) {
        console.error('[Auth] Token verification failed:', error);

        res.status(401).json({
            success: false,
            error: {
                code: 'INVALID_AUTH_TOKEN',
                message: 'Invalid or expired authentication token',
                traceId,
            },
        });
    }
}

/**
 * Extracts user UID from authenticated request.
 * Throws if not authenticated (use after authenticateUser middleware).
 */
export function getUserId(req: Request): string {
    const user = (req as AuthenticatedRequest).user;
    if (!user?.uid) {
        throw new Error('User not authenticated');
    }
    return user.uid;
}
