import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as typesenseService from "../services/typesense.service";

export const onListingWrite = onDocumentWritten(
    {
        document: "listings/{listingId}",
        database: "easy-db",
        region: "europe-west1"
    },
    async (event) => {
        const listingId = event.params.listingId;
        const newDoc = event.data?.after.data();

        // 1. Document Deleted
        if (!newDoc) {
            logger.info(`🗑️ Listing ${listingId} deleted from Firestore.`);
            try {
                await typesenseService.deleteListing(listingId);
            } catch (error) {
                logger.error(`Failed to delete from Typesense:`, error);
            }
            return;
        }

        // 2. Document Created or Updated
        logger.info(`🔄 Syncing Listing ${listingId} to Search Index...`);

        // Transform data for Search Engine (Flattening metadata)
        const searchRecord = {
            id: listingId,
            title: newDoc.title,
            description: newDoc.description,
            price: newDoc.price,
            domain: newDoc.domain,
            category: newDoc.category,
            subCategory: newDoc.subCategory,
            location: newDoc.location,
            type: newDoc.type,
            rating: newDoc.rating,
            ownerId: newDoc.ownerId,
            // Flatten metadata for searchability (e.g., bedrooms becomes a top-level field)
            metadata: newDoc.metadata,
            createdAt: newDoc.createdAt
        };

        try {
            await typesenseService.upsertListing(searchRecord);
            logger.info(`✅ Synced to Typesense:`, searchRecord);
        } catch (error) {
            logger.error(`Failed to sync to Typesense:`, error);
        }
    });
