"use strict";
/**
 * Centralized Claims Module
 *
 * SINGLE SOURCE OF TRUTH for setting custom claims.
 * All other claim-setting code MUST be removed or redirected here.
 *
 * Canonical claim shape:
 * - role: 'owner' | 'admin' | 'user'
 * - businessId: string (only for owners)
 * - admin: true (only for admins)
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
exports.setOwnerClaims = setOwnerClaims;
exports.setAdminClaims = setAdminClaims;
exports.clearClaims = clearClaims;
exports.getClaims = getClaims;
const admin = __importStar(require("firebase-admin"));
const log_1 = require("./log");
/**
 * Set owner claims for a user.
 * Preserves admin flag if user was previously admin.
 *
 * @param uid - Firebase Auth UID
 * @param businessId - The business being claimed
 * @returns The new claims object
 */
async function setOwnerClaims(uid, businessId) {
    const user = await admin.auth().getUser(uid);
    const current = (user.customClaims || {});
    // Preserve admin flag if it exists
    const next = Object.assign({ role: 'owner', businessId }, (current.admin === true ? { admin: true } : {}));
    log_1.log.info('[Claims] Setting owner claims', {
        uid,
        previousClaims: JSON.stringify(current),
        newClaims: JSON.stringify(next),
        source: 'setOwnerClaims'
    });
    await admin.auth().setCustomUserClaims(uid, next);
    return next;
}
/**
 * Set admin claims for a user.
 *
 * @param uid - Firebase Auth UID
 * @returns The new claims object
 */
async function setAdminClaims(uid) {
    const user = await admin.auth().getUser(uid);
    const current = (user.customClaims || {});
    const next = {
        role: 'admin',
        admin: true
    };
    log_1.log.info('[Claims] Setting admin claims', {
        uid,
        previousClaims: JSON.stringify(current),
        newClaims: JSON.stringify(next),
        source: 'setAdminClaims'
    });
    await admin.auth().setCustomUserClaims(uid, next);
    return next;
}
/**
 * Clear all custom claims for a user.
 * Used for testing or when revoking access.
 */
async function clearClaims(uid) {
    const user = await admin.auth().getUser(uid);
    const current = user.customClaims;
    log_1.log.info('[Claims] Clearing claims', {
        uid,
        previousClaims: JSON.stringify(current),
        source: 'clearClaims'
    });
    await admin.auth().setCustomUserClaims(uid, null);
}
/**
 * Get current claims for a user (for logging/debugging).
 */
async function getClaims(uid) {
    const user = await admin.auth().getUser(uid);
    return user.customClaims || null;
}
//# sourceMappingURL=claims.js.map