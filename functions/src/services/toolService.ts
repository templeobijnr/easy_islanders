import * as admin from 'firebase-admin';
import { listingRepository } from '../repositories/listing.repository';

const db = admin.firestore();

const LOCATION_SYNONYMS: { [key: string]: string } = {
    "girne": "Kyrenia",
    "lefkosa": "Nicosia",
    "magusa": "Famagusta",
    "iskele": "Iskele",
    "guzelyurt": "Guzelyurt"
};

export const toolResolvers = {

    // TypeSense-powered marketplace search
    searchMarketplace: async (args: any) => {
        console.log("🔍 [Search] TypeSense Search Args:", args);

        // Normalize location (e.g., Girne -> Kyrenia)
        let location = args.location;
        if (location) {
            const normalized = LOCATION_SYNONYMS[location.toLowerCase()];
            if (normalized) {
                console.log(`📍 [Search] Normalized location '${location}' to '${normalized}'`);
                location = normalized;
            }
        }

        try {
            const { searchListings } = await import('./typesense.service');
            const result = await searchListings({
                query: args.query || '*',
                domain: args.domain,
                category: args.category,
                subCategory: args.subCategory,
                location: location,
                minPrice: args.minPrice,
                maxPrice: args.maxPrice,
                perPage: 20
            });

            console.log(`🔍 [Search] Found ${result.found} items via TypeSense`);

            return result.hits.map((hit: any) => ({
                id: hit.id,
                title: hit.title,
                price: hit.price,
                location: hit.location,
                amenities: hit.metadata?.amenities || [],
                description: hit.description,
                imageUrl: hit.metadata?.imageUrl,
                domain: hit.domain,
                category: hit.category,
                subCategory: hit.subCategory,
                type: hit.type
            }));

        } catch (error) {
            console.error("🔴 [Search] TypeSense Failed:", error);
            return [];
        }
    },

    // Secure booking creation with validation
    createBooking: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");

        // 1. VALIDATE: Does the item actually exist?
        const item = await listingRepository.getById(args.itemId);

        if (!item) {
            throw new Error(`Item not found: ${args.itemId}`);
        }

        // 2. HYDRATE: Use DB data for price/title (Security)
        const bookingData = {
            id: `ORD-${Date.now()}`, // In prod, let Firestore gen ID or use UUID
            userId: userId,

            // Core Links
            itemId: item.id,
            domain: item.domain,

            // Snapshot Data (So it doesn't change if listing changes)
            itemTitle: item.title,
            itemImage: item.imageUrl,
            totalPrice: item.price, // Using REAL price from DB
            currency: item.currency,

            // User Inputs
            customerName: args.customerName,
            customerContact: args.customerContact,
            specialRequests: args.specialRequests || '',
            needsPickup: args.needsPickup || false,

            // Logistics
            checkIn: args.checkInDate || null,
            checkOut: args.checkOutDate || null,
            viewingTime: args.viewingSlot || null,

            // System
            status: 'payment_pending', // Matches frontend Enum
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 3. WRITE
        await db.collection('bookings').doc(bookingData.id).set(bookingData);

        console.log(`✅ Booking created: ${bookingData.id} for ${item.title}`);
        return bookingData;
    },

    // --- NEW TOOLS ---
    consultEncyclopedia: async (args: any) => {
        console.log("Consulting Encyclopedia:", args);
        return {
            answer: `Here is some information about ${args.query}: North Cyprus has a rich history and follows British legal frameworks for property. Residency is easy to obtain for property owners.`
        };
    },

    getRealTimeInfo: async (args: any) => {
        console.log("Getting Real Time Info:", args);
        return {
            info: `Current info for ${args.category}: Weather is sunny, 25°C. GBP/TRY exchange rate is approx 40.0.`
        };
    },

    sendWhatsAppMessage: async (args: any) => {
        console.log("Sending WhatsApp:", args);
        return { success: true, status: 'sent' };
    },

    dispatchTaxi: async (args: any) => {
        console.log("Dispatching Taxi:", args);
        return {
            booking: { id: `TAXI-${Date.now()}`, status: 'confirmed' }
        };
    },

    createConsumerRequest: async (args: any) => {
        console.log("Creating Consumer Request:", args);
        return { success: true, requestId: `REQ-${Date.now()}` };
    }
};
