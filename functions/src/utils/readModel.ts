/**
 * Read Model for Discovery (PERF-01)
 *
 * Denormalized read model to eliminate N+1 queries on hot paths.
 *
 * INVARIANTS:
 * - Source of truth remains normalized collections.
 * - Read model is derived and fully rebuildable.
 * - Fallback to source when read model stale/missing.
 * - All read model ops logged with traceId, version.
 *
 * DESIGN:
 * - Listing cards stored in `listing_cards` collection
 * - Updated via Firestore triggers on source collections
 * - Version tracked for cache coherence
 *
 * @see Living Document Section 18.3 for invariants.
 */

import * as logger from 'firebase-functions/logger';
import { db } from '../config/firebase';

/**
 * Listing card (denormalized read model).
 */
export interface ListingCard {
    id: string;
    name: string;
    placeType: string;
    imageUrl?: string;
    rating?: number;
    priceRange?: string;
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    merveEnabled: boolean;
    isOpen?: boolean;
    distance?: number;
    readModelVersion: number;
    sourceUpdatedAt: Date;
    readModelUpdatedAt: Date;
}

/**
 * Read model collection name.
 */
const READ_MODEL_COLLECTION = 'listing_cards';

/**
 * Current read model version.
 */
const READ_MODEL_VERSION = 1;

/**
 * Projects a listing to a card (denormalized shape).
 */
export function projectListingToCard(
    listing: Record<string, unknown>
): Omit<ListingCard, 'readModelUpdatedAt'> {
    return {
        id: listing.id as string,
        name: (listing.name as string) || 'Unknown',
        placeType: (listing.placeType as string) || 'other',
        imageUrl: listing.imageUrl as string | undefined,
        rating: listing.rating as number | undefined,
        priceRange: listing.priceRange as string | undefined,
        location: {
            lat: (listing.lat as number) || 0,
            lng: (listing.lng as number) || 0,
            address: listing.address as string | undefined,
        },
        merveEnabled: (listing.merveEnabled as boolean) ?? false,
        isOpen: listing.isOpen as boolean | undefined,
        readModelVersion: READ_MODEL_VERSION,
        sourceUpdatedAt: (listing.updatedAt as Date) || new Date(),
    };
}

/**
 * Updates the read model for a listing.
 * Call from Firestore trigger on listings collection.
 */
export async function updateReadModel(
    listingId: string,
    listingData: Record<string, unknown>,
    traceId: string
): Promise<void> {
    const card = projectListingToCard({ id: listingId, ...listingData });
    const cardWithTimestamp: ListingCard = {
        ...card,
        readModelUpdatedAt: new Date(),
    };

    await db.collection(READ_MODEL_COLLECTION).doc(listingId).set(cardWithTimestamp);

    logger.info('ReadModel: Updated', {
        component: 'readModel',
        event: 'read_model_updated',
        traceId,
        listingId,
        readModelVersion: READ_MODEL_VERSION,
    });
}

/**
 * Deletes the read model for a listing.
 */
export async function deleteReadModel(
    listingId: string,
    traceId: string
): Promise<void> {
    await db.collection(READ_MODEL_COLLECTION).doc(listingId).delete();

    logger.info('ReadModel: Deleted', {
        component: 'readModel',
        event: 'read_model_deleted',
        traceId,
        listingId,
    });
}

/**
 * Fetches listing cards with fallback to source.
 */
export async function getListingCards(
    listingIds: string[],
    traceId: string
): Promise<ListingCard[]> {
    if (listingIds.length === 0) return [];

    // Batch fetch from read model
    const cardRefs = listingIds.map((id) =>
        db.collection(READ_MODEL_COLLECTION).doc(id)
    );

    const cardDocs = await db.getAll(...cardRefs);

    const cards: ListingCard[] = [];
    const missingIds: string[] = [];

    cardDocs.forEach((doc, index) => {
        if (doc.exists) {
            cards.push(doc.data() as ListingCard);
        } else {
            missingIds.push(listingIds[index]);
        }
    });

    // Fallback for missing cards
    if (missingIds.length > 0) {
        logger.warn('ReadModel: Fallback to source', {
            component: 'readModel',
            event: 'fallback_used',
            traceId,
            missingCount: missingIds.length,
        });

        const listingRefs = missingIds.map((id) =>
            db.collection('listings').doc(id)
        );

        const listingDocs = await db.getAll(...listingRefs);

        for (const doc of listingDocs) {
            if (doc.exists) {
                const card = projectListingToCard({ id: doc.id, ...doc.data() });
                cards.push({
                    ...card,
                    readModelUpdatedAt: new Date(),
                });
            }
        }
    }

    logger.info('ReadModel: Cards fetched', {
        component: 'readModel',
        event: 'cards_fetched',
        traceId,
        requested: listingIds.length,
        fromReadModel: listingIds.length - missingIds.length,
        fromFallback: missingIds.length,
    });

    return cards;
}

/**
 * Rebuilds the entire read model from source.
 * Use for initial population or recovery.
 */
export async function rebuildReadModel(
    traceId: string,
    batchSize: number = 100
): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;
    let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    logger.info('ReadModel: Rebuild started', {
        component: 'readModel',
        event: 'rebuild_started',
        traceId,
    });

    while (true) {
        let query: FirebaseFirestore.Query = db
            .collection('listings')
            .orderBy('__name__')
            .limit(batchSize);

        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();

        if (snapshot.empty) break;

        const batch = db.batch();

        for (const doc of snapshot.docs) {
            try {
                const card = projectListingToCard({ id: doc.id, ...doc.data() });
                const cardRef = db.collection(READ_MODEL_COLLECTION).doc(doc.id);
                batch.set(cardRef, { ...card, readModelUpdatedAt: new Date() });
                processed++;
            } catch (error) {
                errors++;
                logger.error('ReadModel: Rebuild error for listing', {
                    component: 'readModel',
                    event: 'rebuild_error',
                    traceId,
                    listingId: doc.id,
                    error: String(error),
                });
            }
        }

        await batch.commit();
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    logger.info('ReadModel: Rebuild completed', {
        component: 'readModel',
        event: 'rebuild_completed',
        traceId,
        processed,
        errors,
    });

    return { processed, errors };
}
