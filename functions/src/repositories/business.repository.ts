import { getErrorMessage } from '../utils/errors';
/**
 * Business Repository
 * Handles business entity CRUD and claiming transactions.
 * 
 * Collection: businesses/{businessId}
 */

import { db } from '../config/firebase';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Business, ClaimStatus, BusinessMember } from '../types/tenant';
import { log } from '../utils/log';

const COLLECTION = 'businesses';
const MEMBERS_SUBCOLLECTION = 'members';
const LISTINGS_COLLECTION = 'listings';

function normalizeE164(phone: unknown): string | null {
    if (typeof phone !== 'string') return null;
    const cleaned = phone.trim().replace(/[^\d+]/g, '');
    if (!cleaned) return null;

    // Accept +E.164; reject everything else for V1.
    if (!cleaned.startsWith('+')) return null;
    const normalized = `+${cleaned.slice(1).replace(/\D/g, '')}`;
    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) return null;
    return normalized;
}

export const businessRepository = {
    /**
     * Get a business by ID.
     */
    getById: async (businessId: string): Promise<Business | null> => {
        const doc = await db.collection(COLLECTION).doc(businessId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as Business;
    },

    /**
     * Get a business by ID with fallback to listings collection.
     * This maintains backward compatibility where listings are treated as businesses.
     * 
     * Returns a "virtual" Business object constructed from listing data if
     * the business doesn't exist in the businesses collection.
     */
    getByIdWithListingFallback: async (businessId: string): Promise<Business | null> => {
        // First try the businesses collection
        const businessDoc = await db.collection(COLLECTION).doc(businessId).get();
        if (businessDoc.exists) {
            return { id: businessDoc.id, ...businessDoc.data() } as Business;
        }

        // Fallback to listings collection
        const listingDoc = await db.collection(LISTINGS_COLLECTION).doc(businessId).get();
        if (!listingDoc.exists) {
            return null;
        }

        // Construct a virtual Business from listing data
        const listing = listingDoc.data() as any;
        const now = new Date();
        return {
            id: businessId,
            displayName: listing.title || listing.displayName || listing.name || 'Business',
            placeId: listing.placeId || listing.place_id,
            businessPhoneE164: listing.businessPhoneE164 || listing.phone || listing.phoneE164,
            claimStatus: listing.isClaimed ? 'claimed' : 'unclaimed',
            claimedByUid: listing.ownerUid,
            status: 'active',
            createdAt: listing.createdAt || now,
            updatedAt: listing.updatedAt || now,
            // Include extra listing fields for chat context
            description: listing.description,
            location: listing.address || listing.region || listing.location,
            category: listing.category || listing.domain,
            imageUrl: listing.imageUrl || listing.images?.[0],
        } as unknown as Business;
    },


    /**
     * Get business by owner UID.
     */
    getByOwnerUid: async (uid: string): Promise<Business | null> => {
        const snapshot = await db.collection(COLLECTION)
            .where('claimedByUid', '==', uid)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Business;
    },

    /**
     * Start a claim attempt (transactional).
     * Returns success if claim can proceed, or error reason.
     */
    startClaim: async (
        businessId: string,
        uid: string,
        expiryMinutes: number = 10
    ): Promise<{ success: boolean; error?: string; business?: Business }> => {
        try {
            const result = await db.runTransaction(async (transaction) => {
                const docRef = db.collection(COLLECTION).doc(businessId);
                const doc = await transaction.get(docRef);

                // NOTE: Firestore transactions require reads before writes.
                // We must not `get()` this doc after we `set()` it in the same transaction.
                let data: Omit<Business, 'id'>;

                // Backfill bridge (legacy listings -> businesses) so claim flow can work
                // for imported listings without a separate migration step.
                if (!doc.exists) {
                    const listingRef = db.collection(LISTINGS_COLLECTION).doc(businessId);
                    const listingDoc = await transaction.get(listingRef);
                    if (!listingDoc.exists) {
                        return { success: false, error: 'BUSINESS_NOT_FOUND' };
                    }

                    const listing: any = listingDoc.data() || {};
                    const displayName =
                        listing.displayName ||
                        listing.title ||
                        listing.name ||
                        'Business';

                    const phoneRaw =
                        listing.businessPhoneE164 ||
                        listing.agentPhone ||
                        listing.phoneE164 ||
                        listing.phoneNumber ||
                        listing.phone ||
                        listing.international_phone_number;

                    const businessPhoneE164 = normalizeE164(phoneRaw);
                    if (!businessPhoneE164) {
                        return { success: false, error: 'NO_BUSINESS_PHONE' };
                    }

                    const placeId = listing.placeId || listing.place_id || null;
                    const now = Timestamp.now();

                    data = {
                        displayName,
                        businessPhoneE164,
                        claimStatus: 'unclaimed' as ClaimStatus,
                        status: 'active',
                        createdAt: now,
                        updatedAt: now
                    };
                    // Add optional fields only if they have values
                    if (placeId) (data as any).placeId = placeId;

                    // Build doc to save (filter undefined/null optional fields)
                    const docToSave: Record<string, any> = {
                        displayName,
                        businessPhoneE164,
                        claimStatus: 'unclaimed' as ClaimStatus,
                        status: 'active',
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp()
                    };
                    if (placeId) docToSave.placeId = placeId;

                    transaction.set(docRef, docToSave, { merge: true });
                } else {
                    data = doc.data() as Omit<Business, 'id'>;
                }

                // Check if already claimed
                if (data.claimStatus === 'claimed') {
                    return { success: false, error: 'ALREADY_CLAIMED' };
                }

                // Check if status is active
                if (data.status !== 'active') {
                    return { success: false, error: 'BUSINESS_INACTIVE' };
                }

                // Check if pending by another user
                if (data.claimStatus === 'pending' && data.pendingClaimUid !== uid) {
                    const now = Timestamp.now();
                    if (data.pendingExpiresAt && data.pendingExpiresAt.toMillis() > now.toMillis()) {
                        return { success: false, error: 'CLAIM_IN_PROGRESS' };
                    }
                    // Expired pending claim - can proceed
                }

                // Set pending claim
                const expiresAt = Timestamp.fromMillis(Date.now() + expiryMinutes * 60 * 1000);

                transaction.update(docRef, {
                    claimStatus: 'pending' as ClaimStatus,
                    pendingClaimUid: uid,
                    pendingExpiresAt: expiresAt,
                    updatedAt: FieldValue.serverTimestamp()
                });

                return {
                    success: true,
                    business: {
                        id: businessId,
                        ...data,
                        claimStatus: 'pending' as ClaimStatus,
                        pendingClaimUid: uid,
                        pendingExpiresAt: expiresAt
                    } as Business
                };
            });

            return result;
        } catch (error) {
            log.error('[BusinessRepo] startClaim error', error, { businessId, uid });
            return { success: false, error: 'TRANSACTION_FAILED' };
        }
    },

    /**
     * Confirm a claim (transactional).
     * Sets claimedByUid, creates member doc, clears pending fields.
     */
    confirmClaim: async (
        businessId: string,
        uid: string,
        verifiedPhoneE164: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            await db.runTransaction(async (transaction) => {
                const docRef = db.collection(COLLECTION).doc(businessId);
                const doc = await transaction.get(docRef);

                if (!doc.exists) {
                    throw new Error('BUSINESS_NOT_FOUND');
                }

                const data = doc.data() as Omit<Business, 'id'>;

                // Firestore transactions require all reads to be executed before all writes.
                // Read the legacy listing doc up-front so we can safely sync it later.
                const listingRef = db.collection(LISTINGS_COLLECTION).doc(businessId);
                const listingDoc = await transaction.get(listingRef);

                // Verify pending claim belongs to this user
                if (data.claimStatus !== 'pending') {
                    throw new Error('NO_PENDING_CLAIM');
                }

                if (data.pendingClaimUid !== uid) {
                    throw new Error('WRONG_USER');
                }

                // Check expiry
                const now = Timestamp.now();
                if (data.pendingExpiresAt && data.pendingExpiresAt.toMillis() < now.toMillis()) {
                    throw new Error('CLAIM_EXPIRED');
                }

                // Update business
                transaction.update(docRef, {
                    claimStatus: 'claimed' as ClaimStatus,
                    claimedByUid: uid,
                    verifiedPhoneE164,
                    pendingClaimUid: FieldValue.delete(),
                    pendingExpiresAt: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Best-effort: keep legacy listing fields in sync for older UI paths.
                if (listingDoc.exists) {
                    transaction.set(listingRef, {
                        ownerUid: uid,
                        isClaimed: true,
                        claimedAt: FieldValue.serverTimestamp()
                    }, { merge: true });
                }

                // Create member doc
                const memberRef = docRef.collection(MEMBERS_SUBCOLLECTION).doc(uid);
                transaction.set(memberRef, {
                    uid,
                    role: 'owner',
                    status: 'active',
                    createdAt: FieldValue.serverTimestamp()
                } as Omit<BusinessMember, 'createdAt'> & { createdAt: FieldValue });

                // Update user doc with businessId
                const userRef = db.collection('users').doc(uid);
                transaction.set(userRef, {
                    businessId: businessId,
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });

                // Maintain the userBusinesses index for multi-business support.
                const userBusinessRef = db.doc(`userBusinesses/${uid}/businesses/${businessId}`);
                transaction.set(
                    userBusinessRef,
                    {
                        businessId,
                        role: 'owner',
                        businessName: (data as any).displayName || null,
                        joinedAt: FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
            });

            return { success: true };
        } catch (error: unknown) {
            log.error('[BusinessRepo] confirmClaim error', error, { businessId, uid });
            return { success: false, error: getErrorMessage(error) || 'TRANSACTION_FAILED' };
        }
    },

    /**
     * Create a new business (for manual creation flow).
     */
    create: async (business: Omit<Business, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        const docRef = await db.collection(COLLECTION).add({
            ...business,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });
        return docRef.id;
    },

    /**
     * Check if a user is a member of a business.
     */
    isMember: async (businessId: string, uid: string): Promise<boolean> => {
        const memberDoc = await db.collection(COLLECTION)
            .doc(businessId)
            .collection(MEMBERS_SUBCOLLECTION)
            .doc(uid)
            .get();

        return memberDoc.exists && memberDoc.data()?.status === 'active';
    },

    /**
     * Admin-only: forcibly assign an owner to a business (no phone verification).
     *
     * Use cases:
     * - Development / staging: bypass OTP to unblock dashboard testing.
     * - Manual support: recover a claim when OTP cannot be completed.
     *
     * Safety:
     * - Enforces "one business ↔ one owner" unless force=true.
     * - Enforces "one owner ↔ one business" unless force=true.
     */
    adminAssignOwner: async (
        businessId: string,
        uid: string,
        opts: { force?: boolean } = {}
    ): Promise<{ success: boolean; error?: string }> => {
        const force = opts.force === true;

        try {
            await db.runTransaction(async (transaction) => {
                // ============================================
                // PHASE 1: ALL READS (Firestore requirement)
                // ============================================
                const businessRef = db.collection(COLLECTION).doc(businessId);
                const businessSnap = await transaction.get(businessRef);

                const listingRef = db.collection(LISTINGS_COLLECTION).doc(businessId);
                const listingSnap = await transaction.get(listingRef);

                const userRef = db.collection('users').doc(uid);
                const userSnap = await transaction.get(userRef);

                // ============================================
                // PHASE 2: VALIDATION & DATA PREPARATION
                // ============================================
                let business: Omit<Business, 'id'>;
                let needsBusinessCreate = false;

                if (!businessSnap.exists) {
                    // Backfill from listings
                    if (!listingSnap.exists) {
                        throw new Error('BUSINESS_NOT_FOUND');
                    }

                    const listing: any = listingSnap.data() || {};
                    const displayName =
                        listing.displayName ||
                        listing.title ||
                        listing.name ||
                        'Business';

                    const phoneRaw =
                        listing.businessPhoneE164 ||
                        listing.agentPhone ||
                        listing.phoneE164 ||
                        listing.phoneNumber ||
                        listing.phone ||
                        listing.international_phone_number;

                    const businessPhoneE164 = normalizeE164(phoneRaw);
                    if (!businessPhoneE164) {
                        throw new Error('NO_BUSINESS_PHONE');
                    }

                    const placeId = listing.placeId || listing.place_id || null;
                    const now = Timestamp.now();

                    business = {
                        displayName,
                        businessPhoneE164,
                        claimStatus: 'unclaimed' as ClaimStatus,
                        status: 'active',
                        createdAt: now,
                        updatedAt: now
                    };
                    if (placeId) (business as any).placeId = placeId;
                    needsBusinessCreate = true;
                } else {
                    business = businessSnap.data() as Omit<Business, 'id'>;
                }

                if (!business.businessPhoneE164) {
                    throw new Error('NO_BUSINESS_PHONE');
                }

                if (!force && business.claimStatus === 'claimed' && business.claimedByUid && business.claimedByUid !== uid) {
                    throw new Error('ALREADY_CLAIMED');
                }

                if (!force && business.status !== 'active') {
                    throw new Error('BUSINESS_INACTIVE');
                }

                const existingBusinessId = userSnap.exists ? (userSnap.data() as any)?.businessId : undefined;
                if (!force && existingBusinessId && existingBusinessId !== businessId) {
                    throw new Error('USER_ALREADY_HAS_BUSINESS');
                }

                const verifiedPhoneE164 = (business as any).verifiedPhoneE164 || business.businessPhoneE164;

                // ============================================
                // PHASE 3: ALL WRITES
                // ============================================

                // Create business doc if needed (backfill)
                if (needsBusinessCreate) {
                    const docToSave: Record<string, any> = {
                        displayName: (business as any).displayName,
                        businessPhoneE164: business.businessPhoneE164,
                        claimStatus: 'unclaimed' as ClaimStatus,
                        status: 'active',
                        createdAt: FieldValue.serverTimestamp(),
                        updatedAt: FieldValue.serverTimestamp()
                    };
                    if ((business as any).placeId) docToSave.placeId = (business as any).placeId;
                    transaction.set(businessRef, docToSave, { merge: true });
                }

                // Update business with claim info
                transaction.update(businessRef, {
                    claimStatus: 'claimed' as ClaimStatus,
                    claimedByUid: uid,
                    verifiedPhoneE164,
                    pendingClaimUid: FieldValue.delete(),
                    pendingExpiresAt: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Sync legacy listing
                if (listingSnap.exists) {
                    transaction.set(
                        listingRef,
                        {
                            ownerUid: uid,
                            isClaimed: true,
                            claimedAt: FieldValue.serverTimestamp()
                        },
                        { merge: true }
                    );
                }

                // Create/update member doc
                const memberRef = businessRef.collection(MEMBERS_SUBCOLLECTION).doc(uid);
                transaction.set(memberRef, {
                    uid,
                    role: 'owner',
                    status: 'active',
                    createdAt: FieldValue.serverTimestamp()
                } as Omit<BusinessMember, 'createdAt'> & { createdAt: FieldValue });

                // Update user doc
                transaction.set(
                    userRef,
                    {
                        businessId: businessId,
                        updatedAt: FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );

                // Maintain the userBusinesses index for multi-business support.
                const userBusinessRef = db.doc(`userBusinesses/${uid}/businesses/${businessId}`);
                transaction.set(
                    userBusinessRef,
                    {
                        businessId,
                        role: 'owner',
                        businessName: (business as any).displayName || null,
                        joinedAt: FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
            });

            return { success: true };
        } catch (error: unknown) {
            log.error('[BusinessRepo] adminAssignOwner error', error, { businessId, uid });
            return { success: false, error: getErrorMessage(error) || 'TRANSACTION_FAILED' };
        }
    }
};
