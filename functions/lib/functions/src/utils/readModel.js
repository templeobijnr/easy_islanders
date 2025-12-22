"use strict";
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
exports.projectListingToCard = projectListingToCard;
exports.updateReadModel = updateReadModel;
exports.deleteReadModel = deleteReadModel;
exports.getListingCards = getListingCards;
exports.rebuildReadModel = rebuildReadModel;
const logger = __importStar(require("firebase-functions/logger"));
const firebase_1 = require("../config/firebase");
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
function projectListingToCard(listing) {
    var _a;
    return {
        id: listing.id,
        name: listing.name || 'Unknown',
        placeType: listing.placeType || 'other',
        imageUrl: listing.imageUrl,
        rating: listing.rating,
        priceRange: listing.priceRange,
        location: {
            lat: listing.lat || 0,
            lng: listing.lng || 0,
            address: listing.address,
        },
        merveEnabled: (_a = listing.merveEnabled) !== null && _a !== void 0 ? _a : false,
        isOpen: listing.isOpen,
        readModelVersion: READ_MODEL_VERSION,
        sourceUpdatedAt: listing.updatedAt || new Date(),
    };
}
/**
 * Updates the read model for a listing.
 * Call from Firestore trigger on listings collection.
 */
async function updateReadModel(listingId, listingData, traceId) {
    const card = projectListingToCard(Object.assign({ id: listingId }, listingData));
    const cardWithTimestamp = Object.assign(Object.assign({}, card), { readModelUpdatedAt: new Date() });
    await firebase_1.db.collection(READ_MODEL_COLLECTION).doc(listingId).set(cardWithTimestamp);
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
async function deleteReadModel(listingId, traceId) {
    await firebase_1.db.collection(READ_MODEL_COLLECTION).doc(listingId).delete();
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
async function getListingCards(listingIds, traceId) {
    if (listingIds.length === 0)
        return [];
    // Batch fetch from read model
    const cardRefs = listingIds.map((id) => firebase_1.db.collection(READ_MODEL_COLLECTION).doc(id));
    const cardDocs = await firebase_1.db.getAll(...cardRefs);
    const cards = [];
    const missingIds = [];
    cardDocs.forEach((doc, index) => {
        if (doc.exists) {
            cards.push(doc.data());
        }
        else {
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
        const listingRefs = missingIds.map((id) => firebase_1.db.collection('listings').doc(id));
        const listingDocs = await firebase_1.db.getAll(...listingRefs);
        for (const doc of listingDocs) {
            if (doc.exists) {
                const card = projectListingToCard(Object.assign({ id: doc.id }, doc.data()));
                cards.push(Object.assign(Object.assign({}, card), { readModelUpdatedAt: new Date() }));
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
async function rebuildReadModel(traceId, batchSize = 100) {
    let processed = 0;
    let errors = 0;
    let lastDoc = null;
    logger.info('ReadModel: Rebuild started', {
        component: 'readModel',
        event: 'rebuild_started',
        traceId,
    });
    while (true) {
        let query = firebase_1.db
            .collection('listings')
            .orderBy('__name__')
            .limit(batchSize);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }
        const snapshot = await query.get();
        if (snapshot.empty)
            break;
        const batch = firebase_1.db.batch();
        for (const doc of snapshot.docs) {
            try {
                const card = projectListingToCard(Object.assign({ id: doc.id }, doc.data()));
                const cardRef = firebase_1.db.collection(READ_MODEL_COLLECTION).doc(doc.id);
                batch.set(cardRef, Object.assign(Object.assign({}, card), { readModelUpdatedAt: new Date() }));
                processed++;
            }
            catch (error) {
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
//# sourceMappingURL=readModel.js.map