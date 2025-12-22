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

import * as admin from 'firebase-admin';
import { log } from './log';

/**
 * Canonical owner claims shape.
 * No accessLevel, no 'business' role, no alternate shapes.
 */
export interface OwnerClaims {
    role: 'owner';
    businessId: string;
    admin?: true;
}

export interface AdminClaims {
    role: 'admin';
    admin: true;
}

export type CanonicalClaims = OwnerClaims | AdminClaims | { role: 'user' };

/**
 * Set owner claims for a user.
 * Preserves admin flag if user was previously admin.
 * 
 * @param uid - Firebase Auth UID
 * @param businessId - The business being claimed
 * @returns The new claims object
 */
export async function setOwnerClaims(uid: string, businessId: string): Promise<OwnerClaims> {
    const user = await admin.auth().getUser(uid);
    const current = (user.customClaims || {}) as Record<string, any>;

    // Preserve admin flag if it exists
    const next: OwnerClaims = {
        role: 'owner',
        businessId,
        ...(current.admin === true ? { admin: true as const } : {})
    };

    log.info('[Claims] Setting owner claims', {
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
export async function setAdminClaims(uid: string): Promise<AdminClaims> {
    const user = await admin.auth().getUser(uid);
    const current = (user.customClaims || {}) as Record<string, any>;

    const next: AdminClaims = {
        role: 'admin',
        admin: true
    };

    log.info('[Claims] Setting admin claims', {
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
export async function clearClaims(uid: string): Promise<void> {
    const user = await admin.auth().getUser(uid);
    const current = user.customClaims;

    log.info('[Claims] Clearing claims', {
        uid,
        previousClaims: JSON.stringify(current),
        source: 'clearClaims'
    });

    await admin.auth().setCustomUserClaims(uid, null);
}

/**
 * Get current claims for a user (for logging/debugging).
 */
export async function getClaims(uid: string): Promise<Record<string, any> | null> {
    const user = await admin.auth().getUser(uid);
    return user.customClaims || null;
}
