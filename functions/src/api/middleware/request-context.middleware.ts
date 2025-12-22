import { Request, Response, NextFunction } from 'express';
import { getOrCreateRequestId, runWithRequestContext } from '../../utils/request-context';

/**
 * Attach a per-request correlation id (requestId) and store it in AsyncLocalStorage.
 * All logs should include requestId via utils/log.ts.
 */
export function attachRequestContext(req: Request, res: Response, next: NextFunction): void {
    const requestId = getOrCreateRequestId(req.header('x-request-id') || undefined);
    res.setHeader('x-request-id', requestId);
    (req as any).requestId = requestId;

    runWithRequestContext({ requestId }, () => next());
}

