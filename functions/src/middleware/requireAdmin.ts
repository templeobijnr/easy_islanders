import type { NextFunction, Request, Response } from 'express';
import { auth } from '../config/firebase';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.slice('Bearer '.length);
    const decodedToken = await auth.verifyIdToken(token);

    if (!decodedToken.admin) {
      res.status(403).json({ error: 'Forbidden - Admin only' });
      return;
    }

    (req as any).user = decodedToken;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

