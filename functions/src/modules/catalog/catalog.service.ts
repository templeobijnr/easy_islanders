/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CATALOG MODULE — SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Business logic + Firestore access.
 * NO HTTP, NO callable context, NO auth logic.
 *
 * BORING CODE ONLY:
 * - Explicit > clever
 * - Repetition > abstraction
 * - Readable in one pass
 */

import { Timestamp } from "firebase-admin/firestore";
import { db } from "../../config/firebase";
import type {
    Listing,
    CreateListingInput,
    UpdateListingInput,
    ListingQuery,
    ListingType,
} from "./catalog.schema";

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE REFERENCE
// ─────────────────────────────────────────────────────────────────────────────

const LISTINGS_COLLECTION = "listings";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (boring and explicit)
// ─────────────────────────────────────────────────────────────────────────────

function timestampToDate(ts: Timestamp | undefined): Date | undefined {
    if (!ts) {
        return undefined;
    }
    return ts.toDate();
}

function docToListing(doc: FirebaseFirestore.DocumentSnapshot): Listing | null {
    if (!doc.exists) {
        return null;
    }

    const data = doc.data()!;

    const listing: Listing = {
        id: doc.id,
        title: data.title,
        description: data.description,
        type: data.type,
        category: data.category,
        subcategory: data.subcategory,
        tags: data.tags,
        region: data.region,
        address: data.address,
        coordinates: data.coordinates,
        images: data.images,
        heroImage: data.heroImage,
        phone: data.phone,
        email: data.email,
        website: data.website,
        openingHours: data.openingHours,
        price: data.price,
        currency: data.currency || "GBP",
        priceLabel: data.priceLabel,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        status: data.status || "draft",
        approved: data.approved ?? false,
        showOnMap: data.showOnMap ?? false,
        featured: data.featured,
        merve: data.merve,
        createdAt: timestampToDate(data.createdAt) || new Date(),
        updatedAt: timestampToDate(data.updatedAt) || new Date(),
        approvedAt: timestampToDate(data.approvedAt),
        approvedBy: data.approvedBy,
    };

    return listing;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export const CatalogService = {
    /**
     * Get a listing by ID
     */
    async getListing(listingId: string): Promise<Listing | null> {
        const doc = await db.collection(LISTINGS_COLLECTION).doc(listingId).get();
        return docToListing(doc);
    },

    /**
     * Create a new listing
     */
    async createListing(ownerId: string, input: CreateListingInput): Promise<string> {
        const now = Timestamp.now();
        const ref = db.collection(LISTINGS_COLLECTION).doc();

        const listingData = {
            title: input.title,
            description: input.description || null,
            type: input.type,
            category: input.category,
            subcategory: input.subcategory || null,
            tags: input.tags || [],
            region: input.region,
            address: input.address || null,
            coordinates: input.coordinates,
            images: input.images || [],
            heroImage: input.heroImage || null,
            phone: input.phone || null,
            email: input.email || null,
            website: input.website || null,
            openingHours: input.openingHours || null,
            price: input.price || null,
            currency: input.currency || "GBP",
            priceLabel: input.priceLabel || null,
            merve: input.merve || null,
            ownerId: ownerId,
            ownerName: null,
            status: "pending",
            approved: false,
            showOnMap: false,
            featured: false,
            createdAt: now,
            updatedAt: now,
            approvedAt: null,
            approvedBy: null,
        };

        await ref.set(listingData);

        return ref.id;
    },

    /**
     * Update an existing listing
     */
    async updateListing(listingId: string, updates: UpdateListingInput): Promise<Listing | null> {
        const docRef = db.collection(LISTINGS_COLLECTION).doc(listingId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const updateData: Record<string, unknown> = {
            updatedAt: Timestamp.now(),
        };

        // Explicit field updates (boring but clear)
        if (updates.title !== undefined) {
            updateData.title = updates.title;
        }
        if (updates.description !== undefined) {
            updateData.description = updates.description;
        }
        if (updates.category !== undefined) {
            updateData.category = updates.category;
        }
        if (updates.subcategory !== undefined) {
            updateData.subcategory = updates.subcategory;
        }
        if (updates.tags !== undefined) {
            updateData.tags = updates.tags;
        }
        if (updates.region !== undefined) {
            updateData.region = updates.region;
        }
        if (updates.address !== undefined) {
            updateData.address = updates.address;
        }
        if (updates.coordinates !== undefined) {
            updateData.coordinates = updates.coordinates;
        }
        if (updates.images !== undefined) {
            updateData.images = updates.images;
        }
        if (updates.heroImage !== undefined) {
            updateData.heroImage = updates.heroImage;
        }
        if (updates.phone !== undefined) {
            updateData.phone = updates.phone;
        }
        if (updates.email !== undefined) {
            updateData.email = updates.email;
        }
        if (updates.website !== undefined) {
            updateData.website = updates.website;
        }
        if (updates.openingHours !== undefined) {
            updateData.openingHours = updates.openingHours;
        }
        if (updates.price !== undefined) {
            updateData.price = updates.price;
        }
        if (updates.currency !== undefined) {
            updateData.currency = updates.currency;
        }
        if (updates.priceLabel !== undefined) {
            updateData.priceLabel = updates.priceLabel;
        }
        if (updates.showOnMap !== undefined) {
            updateData.showOnMap = updates.showOnMap;
        }
        if (updates.featured !== undefined) {
            updateData.featured = updates.featured;
        }
        if (updates.merve !== undefined) {
            updateData.merve = updates.merve;
        }

        await docRef.update(updateData);

        const updatedDoc = await docRef.get();
        return docToListing(updatedDoc);
    },

    /**
     * Get listings by query
     */
    async getListings(query: ListingQuery): Promise<Listing[]> {
        let ref: FirebaseFirestore.Query = db.collection(LISTINGS_COLLECTION);

        // Apply filters (explicit, no magic)
        if (query.type !== undefined) {
            ref = ref.where("type", "==", query.type);
        }
        if (query.category !== undefined) {
            ref = ref.where("category", "==", query.category);
        }
        if (query.region !== undefined) {
            ref = ref.where("region", "==", query.region);
        }
        if (query.approved !== undefined) {
            ref = ref.where("approved", "==", query.approved);
        }
        if (query.ownerId !== undefined) {
            ref = ref.where("ownerId", "==", query.ownerId);
        }

        // Apply limit
        const limit = query.limit || 50;
        ref = ref.limit(limit);

        const snapshot = await ref.get();

        const listings: Listing[] = [];
        for (const doc of snapshot.docs) {
            const listing = docToListing(doc);
            if (listing !== null) {
                listings.push(listing);
            }
        }

        return listings;
    },

    /**
     * Approve a listing
     */
    async approveListing(listingId: string, adminId: string): Promise<Listing | null> {
        const docRef = db.collection(LISTINGS_COLLECTION).doc(listingId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const now = Timestamp.now();

        await docRef.update({
            status: "approved",
            approved: true,
            showOnMap: true,
            approvedAt: now,
            approvedBy: adminId,
            updatedAt: now,
        });

        const updatedDoc = await docRef.get();
        return docToListing(updatedDoc);
    },

    /**
     * Reject a listing
     */
    async rejectListing(listingId: string, adminId: string): Promise<Listing | null> {
        const docRef = db.collection(LISTINGS_COLLECTION).doc(listingId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        await docRef.update({
            status: "rejected",
            approved: false,
            showOnMap: false,
            approvedBy: adminId,
            updatedAt: Timestamp.now(),
        });

        const updatedDoc = await docRef.get();
        return docToListing(updatedDoc);
    },

    /**
     * Archive a listing (soft delete)
     */
    async archiveListing(listingId: string): Promise<boolean> {
        const docRef = db.collection(LISTINGS_COLLECTION).doc(listingId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return false;
        }

        await docRef.update({
            status: "archived",
            approved: false,
            showOnMap: false,
            updatedAt: Timestamp.now(),
        });

        return true;
    },

    /**
     * Check if a listing exists
     */
    async listingExists(listingId: string): Promise<boolean> {
        const doc = await db.collection(LISTINGS_COLLECTION).doc(listingId).get();
        return doc.exists;
    },

    /**
     * Get listing owner ID
     */
    async getListingOwnerId(listingId: string): Promise<string | null> {
        const doc = await db.collection(LISTINGS_COLLECTION).doc(listingId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data()?.ownerId || null;
    },
};
