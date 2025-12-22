/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL CONTRACT — unifiedListingsService.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Layer: Domain Service
 * Collection: listings
 * Status: Stable
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OWNS (Authoritative):
 * ─────────────────────────────────────────────────────────────────────────────
 * - Listings CRUD (create, read, update, delete)
 * - Listings queries (by type, category, region, approved status)
 * - Map visibility filtering
 * - Booking presets for categories
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOES NOT OWN (Forbidden — owned elsewhere):
 * ─────────────────────────────────────────────────────────────────────────────
 * - Check-ins → connectService.ts
 * - User profiles → social.service.ts
 * - Activities → activities.service.ts (separate collection)
 * - Events → events.service.ts (separate collection)
 * - Experiences → experiences.service.ts (separate collection)
 * - Places → places.service.ts (separate collection)
 * - Stays → stays.service.ts (separate collection)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANTI-PATTERN WARNING:
 * ─────────────────────────────────────────────────────────────────────────────
 * Do NOT use this service as a catch-all for all item types.
 * Do NOT introduce polymorphic 'type' fields that collapse domain boundaries.
 * Each domain has its own collection and lifecycle.
 *
 * The separation between activities, experiences, events, and listings
 * is INTENTIONAL. Similar code patterns do NOT indicate duplication.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ WARNING: Do NOT expand without architecture review.
 * ─────────────────────────────────────────────────────────────────────────────
 * Potential rename to `listings.service.ts` is deferred — see DEFERRED.md.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { db } from './firebaseConfig';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import {
    UnifiedListing,
    ListingType,
    DEFAULT_BOOKING_OPTIONS,
    DEFAULT_LISTING_ACTIONS,
    CATEGORY_BOOKING_PRESETS
} from '../types/UnifiedListing';

const COLLECTION = 'listings';

// Helper: remove undefined values so Firestore doesn't receive them
const removeUndefined = <T extends Record<string, any>>(obj: T): T => {
    const cleaned: any = {};

    Object.entries(obj).forEach(([key, value]) => {
        if (value === undefined) return;

        if (Array.isArray(value)) {
            // Recursively clean objects inside arrays
            cleaned[key] = value.map(item => {
                if (item && typeof item === 'object' && !(item instanceof Timestamp)) {
                    return removeUndefined(item);
                }
                return item;
            });
        } else if (
            value &&
            typeof value === 'object' &&
            !(value instanceof Timestamp)
        ) {
            cleaned[key] = removeUndefined(value as any);
        } else {
            cleaned[key] = value;
        }
    });

    return cleaned;
};

/**
 * UnifiedListingsService
 * Single service for all listing types (places, activities, events, stays, experiences)
 */
export const UnifiedListingsService = {
    /**
     * Create a new listing
     */
    async create(listing: Omit<UnifiedListing, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const payload = removeUndefined({
            ...listing,
            approved: listing.approved ?? true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        const docRef = await addDoc(collection(db, COLLECTION), payload);
        return docRef.id;
    },

    /**
     * Update an existing listing
     */
    async update(id: string, updates: Partial<UnifiedListing>): Promise<void> {
        const docRef = doc(db, COLLECTION, id);
        const payload = removeUndefined({
            ...updates,
            updatedAt: serverTimestamp(),
        });
        await updateDoc(docRef, payload);
    },

    /**
     * Delete a listing
     */
    async delete(id: string): Promise<void> {
        await deleteDoc(doc(db, COLLECTION, id));
    },

    /**
     * Get a single listing by ID
     */
    async getById(id: string): Promise<UnifiedListing | null> {
        const { getDoc } = await import('firebase/firestore');
        const docRef = doc(db, COLLECTION, id);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return { id: snapshot.id, ...snapshot.data() } as UnifiedListing;
    },

    /**
     * Get all listings
     */
    async getAll(): Promise<UnifiedListing[]> {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UnifiedListing[];
    },

    /**
     * Get listings by type
     */
    async getByType(type: ListingType): Promise<UnifiedListing[]> {
        const q = query(
            collection(db, COLLECTION),
            where('type', '==', type),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UnifiedListing[];
    },

    /**
     * Get listings by category
     */
    async getByCategory(category: string): Promise<UnifiedListing[]> {
        const q = query(
            collection(db, COLLECTION),
            where('category', '==', category),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UnifiedListing[];
    },

    /**
     * Get listings by region
     */
    async getByRegion(region: string): Promise<UnifiedListing[]> {
        const q = query(
            collection(db, COLLECTION),
            where('region', '==', region),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UnifiedListing[];
    },

    /**
     * Get approved listings for public display
     */
    async getApproved(): Promise<UnifiedListing[]> {
        const q = query(
            collection(db, COLLECTION),
            where('approved', '==', true),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UnifiedListing[];
    },

    /**
     * Get listings that should be shown on the map
     * Uses simpler query to avoid composite index requirement
     */
    async getForMap(): Promise<UnifiedListing[]> {
        // Simple query - just get approved listings, filter showOnMap client-side
        const q = query(
            collection(db, COLLECTION),
            where('approved', '==', true)
        );
        const snapshot = await getDocs(q);
        const allApproved = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UnifiedListing[];

        // Client-side filter for showOnMap
        return allApproved.filter(listing => listing.showOnMap !== false);
    },

    /**
     * Get booking options preset for a category
     */
    getBookingPreset(category: string) {
        return {
            ...DEFAULT_BOOKING_OPTIONS,
            ...(CATEGORY_BOOKING_PRESETS[category] || {}),
        };
    },

    /**
     * Create default listing object (for form initialization)
     */
    getDefaultListing(type: ListingType = 'place', category: string = 'restaurants'): Omit<UnifiedListing, 'id' | 'createdAt' | 'updatedAt'> {
        return {
            type,
            category,
            title: '',
            description: '',
            address: '',
            lat: 35.33,
            lng: 33.32,
            region: 'Kyrenia',
            cityId: 'north-cyprus',
            images: [],
            bookingEnabled: true,
            bookingOptions: this.getBookingPreset(category),
            actions: { ...DEFAULT_LISTING_ACTIONS },
            approved: true,
            showOnMap: true,
        };
    },
};

export default UnifiedListingsService;
