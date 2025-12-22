"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearMaintenanceCache = clearMaintenanceCache;
exports.maintenanceMiddleware = maintenanceMiddleware;
const firebase_1 = require("../config/firebase");
const logger = __importStar(require("firebase-functions/logger"));
// Admin IPs allowed to bypass maintenance mode (for debugging)
// In production, consider loading from Secret Manager or Remote Config
const ADMIN_BYPASS_IPS = new Set([
    '127.0.0.1',
    '::1', // localhost IPv6
]);
// Cache maintenance status to avoid hitting Firestore on every request
let maintenanceCache = null;
const CACHE_TTL_MS = 10000; // 10 seconds
/**
 * Fetches maintenance status from Firestore with caching.
 * Fails open (returns false) if Firestore is unreachable.
 */
async function isMaintenanceMode() {
    const now = Date.now();
    // Return cached value if still valid
    if (maintenanceCache && maintenanceCache.expiry > now) {
        return maintenanceCache.value;
    }
    try {
        const configDoc = await firebase_1.db.collection('system').doc('config').get();
        const data = configDoc.data();
        const isMaintenanceEnabled = (data === null || data === void 0 ? void 0 : data.maintenance) === true;
        // Update cache
        maintenanceCache = {
            value: isMaintenanceEnabled,
            expiry: now + CACHE_TTL_MS,
        };
        return isMaintenanceEnabled;
    }
    catch (error) {
        // FAIL OPEN: If we can't check, assume NOT in maintenance to avoid blocking production
        logger.error('Maintenance mode check failed, failing open', { error });
        return false;
    }
}
/**
 * Clears the maintenance mode cache.
 * Call this when you need to force a re-check (e.g., after toggling maintenance).
 */
function clearMaintenanceCache() {
    maintenanceCache = null;
}
/**
 * Express middleware that blocks all requests if maintenance mode is enabled.
 * Admin IPs can bypass for debugging.
 */
async function maintenanceMiddleware(req, res, next) {
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
//# sourceMappingURL=maintenance.middleware.js.map