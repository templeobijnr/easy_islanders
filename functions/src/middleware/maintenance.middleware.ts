/**
 * Maintenance Mode Middleware (HUM-04)
 *
 * Checks `system/config.maintenance` in Firestore.
 * If true, returns 503 Service Unavailable for all non-whitelisted requests.
 *
 * INVARIANTS:
 * - MUST be added FIRST in middleware chain (after basic parsing).
 * - MUST fail closed (if Firestore check fails, assume maintenance is OFF to avoid blocking).
 * - Admin IPs can bypass for debugging.
 *
 * @see Living Document Section 15.3, 17.3 for invariants.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../config/firebase';
import * as logger from 'firebase-functions/logger';

// Admin IPs allowed to bypass maintenance mode (for debugging)
// In production, consider loading from Secret Manager or Remote Config
const ADMIN_BYPASS_IPS = new Set<string>([
    '127.0.0.1',
    '::1', // localhost IPv6
]);

// Cache maintenance status to avoid hitting Firestore on every request
let maintenanceCache: { value: boolean; expiry: number } | null = null;
const CACHE_TTL_MS = 10_000; // 10 seconds

/**
 * Fetches maintenance status from Firestore with caching.
 * Fails open (returns false) if Firestore is unreachable.
 */
async function isMaintenanceMode(): Promise<boolean> {
    const now = Date.now();

    // Return cached value if still valid
    if (maintenanceCache && maintenanceCache.expiry > now) {
        return maintenanceCache.value;
    }

    try {
        const configDoc = await db.collection('system').doc('config').get();
        const data = configDoc.data();
        const isMaintenanceEnabled = data?.maintenance === true;

        // Update cache
        maintenanceCache = {
            value: isMaintenanceEnabled,
            expiry: now + CACHE_TTL_MS,
        };

        return isMaintenanceEnabled;
    } catch (error) {
        // FAIL OPEN: If we can't check, assume NOT in maintenance to avoid blocking production
        logger.error('Maintenance mode check failed, failing open', { error });
        return false;
    }
}

/**
 * Clears the maintenance mode cache.
 * Call this when you need to force a re-check (e.g., after toggling maintenance).
 */
export function clearMaintenanceCache(): void {
    maintenanceCache = null;
}

/**
 * Express middleware that blocks all requests if maintenance mode is enabled.
 * Admin IPs can bypass for debugging.
 */
export async function maintenanceMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    // Always allow health checks
    if (req.path === '/health') {
        next();
        return;
    }

    // Check if caller is an admin IP (can bypass)
    const clientIp = req.ip || req.socket.remoteAddress || '';
    if (ADMIN_BYPASS_IPS.has(clientIp)) {
        next();
        return;
    }

    // Check maintenance mode
    const inMaintenance = await isMaintenanceMode();

    if (inMaintenance) {
        logger.info('Request blocked by maintenance mode', {
            path: req.path,
            method: req.method,
            ip: clientIp,
        });

        res.status(503).json({
            success: false,
            error: 'System temporarily unavailable for maintenance.',
            code: 'MAINTENANCE_MODE',
        });
        return;
    }

    next();
}
