import { Request, Response, NextFunction } from 'express';

/**
 * Legacy safety net (P0): prevent cross-tenant access on routes that still accept a
 * businessId in params/body.
 *
 * Required behavior:
 * - If request includes businessId and it does not match request.auth.token.businessId → 403.
 */
export function requireBusinessMatch(req: Request, res: Response, next: NextFunction): void {
    const role = req.user?.role;
    const claimedBusinessId = req.user?.businessId;

    // Admin bypass for legacy/admin tooling.
    if (role === 'admin') {
        next();
        return;
    }

    const businessIdFromParams = (req.params as any)?.businessId as string | undefined;
    const businessIdFromBody = (req.body as any)?.businessId as string | undefined;
    const requestedBusinessId = businessIdFromParams || businessIdFromBody;

    if (!requestedBusinessId) {
        next();
        return;
    }

    if (!claimedBusinessId) {
        res.status(403).json({ error: 'Forbidden: Missing businessId claim' });
        return;
    }

    if (claimedBusinessId !== requestedBusinessId) {
        res.status(403).json({ error: 'Forbidden: businessId mismatch' });
        return;
    }

    next();
}

