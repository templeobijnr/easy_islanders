/**
 * Entitlements Service
 * 
 * Manages /entitlements/{uid} for business limits and future paywall.
 * Default: maxBusinesses = 1 for all users.
 */

import { db } from '../../../config/firebase';
import * as admin from 'firebase-admin';
import { log } from '../../../utils/log';

export interface Entitlements {
    maxBusinesses: number;
    plan: 'free' | 'pro' | 'multi';
    stripeCustomerId?: string;
    updatedAt: admin.firestore.Timestamp;
}

const DEFAULT_ENTITLEMENTS: Omit<Entitlements, 'updatedAt'> = {
    maxBusinesses: 1,
    plan: 'free'
};

/**
 * Get entitlements for a user.
 * Creates default entitlements if none exist.
 */
export async function getEntitlements(uid: string): Promise<Entitlements> {
    const docRef = db.doc(`entitlements/${uid}`);
    const doc = await docRef.get();

    if (!doc.exists) {
        // Create default entitlements
        const entitlements = {
            ...DEFAULT_ENTITLEMENTS,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await docRef.set(entitlements);
        log.info('[Entitlements] Created default entitlements', { uid });
        return { ...DEFAULT_ENTITLEMENTS, updatedAt: admin.firestore.Timestamp.now() };
    }

    return doc.data() as Entitlements;
}

/**
 * Check if user can add another business.
 */
export async function canAddBusiness(uid: string, currentCount: number): Promise<{ allowed: boolean; reason?: string }> {
    const entitlements = await getEntitlements(uid);

    if (currentCount >= entitlements.maxBusinesses) {
        return {
            allowed: false,
            reason: `LIMIT_REACHED: You can own up to ${entitlements.maxBusinesses} business(es) on the ${entitlements.plan} plan.`
        };
    }

    return { allowed: true };
}

/**
 * Update entitlements (called by Stripe webhook or admin).
 */
export async function updateEntitlements(
    uid: string,
    updates: Partial<Pick<Entitlements, 'maxBusinesses' | 'plan' | 'stripeCustomerId'>>
): Promise<void> {
    await db.doc(`entitlements/${uid}`).set({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    log.info('[Entitlements] Updated', { uid, updates });
}

export const entitlementsService = {
    getEntitlements,
    canAddBusiness,
    updateEntitlements
};
