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
        logger.info(`🔄 Syncing Listing ${listingId} to Search Index...`, { title: newDoc.title, domain: newDoc.domain, location: newDoc.location });

        // Transform data for Search Engine - pass all domain-specific fields
        const searchRecord = {
            id: listingId,
            // Common fields
            title: newDoc.title,
            description: newDoc.description,
            price: newDoc.price,
            domain: newDoc.domain,
            category: newDoc.category,
            subCategory: newDoc.subCategory,
            location: newDoc.location,
            type: newDoc.type,
            rating: newDoc.rating,
            ownerId: newDoc.ownerId || newDoc.ownerUid,
            createdAt: newDoc.createdAt,

            // Real Estate fields
            rentalType: newDoc.rentalType,
            bedrooms: newDoc.bedrooms,
            bathrooms: newDoc.bathrooms,
            squareMeters: newDoc.squareMeters,
            amenities: newDoc.amenities,

            // Cars fields
            make: newDoc.make,
            model: newDoc.model,
            year: newDoc.year,
            transmission: newDoc.transmission,
            fuelType: newDoc.fuelType,
            seats: newDoc.seats,
            mileage: newDoc.mileage,

            // Hotels fields
            hotelType: newDoc.hotelType,
            stars: newDoc.stars,
            breakfastIncluded: newDoc.breakfastIncluded,
            roomTypes: newDoc.roomTypes,

            // Restaurants fields
            restaurantName: newDoc.restaurantName,
            cuisine: newDoc.cuisine,
            ingredients: newDoc.ingredients,

            // Events fields
            eventType: newDoc.eventType,
            date: newDoc.date,
            venue: newDoc.venue,
            totalTickets: newDoc.totalTickets,
            ticketsAvailable: newDoc.ticketsAvailable,

            // Services fields
            pricingModel: newDoc.pricingModel,
            durationMinutes: newDoc.durationMinutes,
            providerName: newDoc.providerName,
            serviceArea: newDoc.serviceArea,

            // Marketplace fields
            condition: newDoc.condition,
            stock: newDoc.stock,
            sellerName: newDoc.sellerName
        };

        try {
            await typesenseService.upsertListing(searchRecord);
            logger.info(`✅ Synced to Typesense:`, searchRecord);
        } catch (error) {
            logger.error(`Failed to sync to Typesense:`, error);
        }
    });
