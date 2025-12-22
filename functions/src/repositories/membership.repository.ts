/**
 * Membership Repository
 * 
 * Manages /businesses/{businessId}/members/{uid} subcollection
 * and /userBusinesses/{uid} index for multi-business support.
 */

import { db } from '../config/firebase';
import * as admin from 'firebase-admin';
import { log } from '../utils/log';

export interface Member {
    uid: string;
    role: 'owner' | 'manager' | 'staff';
    status: 'active' | 'invited';
    email?: string;
    createdAt: admin.firestore.Timestamp;
    invitedBy?: string;
}

export interface UserBusinessEntry {
    businessId: string;
    role: 'owner' | 'manager' | 'staff';
    businessName?: string;
    joinedAt: admin.firestore.Timestamp;
}

/**
 * Add a user as a member of a business.
 * Also updates the userBusinesses index.
 */
export async function addMember(
    businessId: string,
    uid: string,
    role: 'owner' | 'manager' | 'staff',
    options?: { email?: string; invitedBy?: string; businessName?: string }
): Promise<void> {
    const batch = db.batch();

    // Add member to business
    const memberRef = db.doc(`businesses/${businessId}/members/${uid}`);
    batch.set(memberRef, {
        uid,
        role,
        status: 'active',
        email: options?.email || null,
        invitedBy: options?.invitedBy || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add to userBusinesses index
    const userBusinessRef = db.doc(`userBusinesses/${uid}/businesses/${businessId}`);
    batch.set(userBusinessRef, {
        businessId,
        role,
        businessName: options?.businessName || null,
        joinedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    log.info('[Membership] Added member', { businessId, uid, role });
}

/**
 * Check if user is a member of a business.
 */
export async function isMember(businessId: string, uid: string): Promise<boolean> {
    const memberDoc = await db.doc(`businesses/${businessId}/members/${uid}`).get();
    return memberDoc.exists && memberDoc.data()?.status === 'active';
}

/**
 * Get member details.
 */
export async function getMember(businessId: string, uid: string): Promise<Member | null> {
    const memberDoc = await db.doc(`businesses/${businessId}/members/${uid}`).get();
    if (!memberDoc.exists) return null;
    return { uid, ...memberDoc.data() } as Member;
}

/**
 * Get all businesses a user is a member of.
 */
export async function getUserBusinesses(uid: string): Promise<UserBusinessEntry[]> {
    const snapshot = await db.collection(`userBusinesses/${uid}/businesses`).get();
    if (!snapshot.empty) {
        return snapshot.docs.map(doc => doc.data() as UserBusinessEntry);
    }

    // Backward-compatibility fallback: older flows only wrote `users/{uid}.businessId`.
    const userDoc = await db.collection('users').doc(uid).get();
    const legacyBusinessId = userDoc.exists ? (userDoc.data() as any)?.businessId : undefined;
    if (!legacyBusinessId) return [];

    const businessDoc = await db.collection('businesses').doc(legacyBusinessId).get();
    const businessName = businessDoc.exists ? (businessDoc.data() as any)?.displayName : undefined;

    return [
        {
            businessId: legacyBusinessId,
            role: 'owner',
            businessName,
            joinedAt: admin.firestore.Timestamp.now()
        }
    ];
}

/**
 * Count how many businesses a user owns.
 */
export async function countUserOwnedBusinesses(uid: string): Promise<number> {
    const snapshot = await db.collection(`userBusinesses/${uid}/businesses`)
        .where('role', '==', 'owner')
        .get();
    if (snapshot.size > 0) return snapshot.size;

    // Backward-compatibility fallback: older flows only wrote `users/{uid}.businessId`.
    // Treat that as "owns 1 business" for entitlement checks.
    const userDoc = await db.collection('users').doc(uid).get();
    const legacyBusinessId = userDoc.exists ? (userDoc.data() as any)?.businessId : undefined;
    return legacyBusinessId ? 1 : 0;
}

/**
 * Remove a member from a business.
 */
export async function removeMember(businessId: string, uid: string): Promise<void> {
    const batch = db.batch();

    batch.delete(db.doc(`businesses/${businessId}/members/${uid}`));
    batch.delete(db.doc(`userBusinesses/${uid}/businesses/${businessId}`));

    await batch.commit();

    log.info('[Membership] Removed member', { businessId, uid });
}

export const membershipRepository = {
    addMember,
    isMember,
    getMember,
    getUserBusinesses,
    countUserOwnedBusinesses,
    removeMember
};
