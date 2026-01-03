import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

function makeTraceId(): string {
    return `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sendAuthError(res: Response, status: number, message: string) {
    res.status(status).json({
        error: {
            code: status === 401 ? 'PERMISSION_DENIED' : 'PERMISSION_DENIED',
            message,
            traceId: makeTraceId(),
        },
    });
}

// Extend Express Request type to include our User
declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                email?: string;
                role?: 'user' | 'business' | 'owner' | 'admin';
                businessId?: string;
            };
        }
    }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendAuthError(res, 401, 'Unauthorized: No token provided');
        return; // Ensure we return to stop execution
    }

    const token = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            // We will set custom claims (roles) in a future script, defaulting to 'user' for now
            role: (decodedToken.role as 'user' | 'business' | 'owner' | 'admin') || 'user',
            businessId: decodedToken.businessId as string | undefined
        };

        next();
    } catch (error) {
        console.error('Auth Error:', error);
        sendAuthError(res, 403, 'Unauthorized: Invalid token');
        return;
    }
};

// Optional: Business Only Guard
export const isBusiness = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'business' && req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Business access required' });
        return;
    }
    next();
};
