import 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { listingRepository } from '../repositories/listing.repository';
import { db } from '../config/firebase';
import type {
    RequestTaxiArgs,
    DispatchTaxiArgs,
    ScheduleViewingArgs,
    SearchListingsArgs,
    SearchLocalPlacesArgs,
    SearchEventsArgs,
    SendWhatsAppArgs,
    CreatePaymentIntentArgs,
    CreateConsumerRequestArgs,
    GetRealTimeInfoArgs
} from '../types/tools';

const now = FieldValue.serverTimestamp;


export const toolResolvers = {

    // TypeSense-powered marketplace search
    searchMarketplace: async (args: SearchListingsArgs) => {
        console.log("🔍 [Search] TypeSense Search Args:", args);

        try {
            const { searchListings } = await import('./typesense.service');
            const result = await searchListings({
                query: args.query || '*',
                domain: args.domain,
                category: args.category,
                subCategory: args.subCategory,
                location: args.location,
                minPrice: args.minPrice,
                maxPrice: args.maxPrice,
                perPage: 20
            });

            console.log(`🔍 [Search] Found ${result.found} items via TypeSense`);

            let items = result.hits.map((hit: any) => ({
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

            // Fallback to Firestore if index is empty
            if (!items || items.length === 0) {
                console.warn("[Search] Typesense returned 0 items. Falling back to Firestore listings.");
                const fallback = await listingRepository.getAllActive({
                    domain: args.domain,
                    ownerUid: undefined,
                    businessId: undefined
                });
                items = fallback.map((doc: any) => ({
                    id: doc.id,
                    title: doc.title,
                    price: doc.price,
                    location: doc.location,
                    amenities: doc.amenities || doc.features || [],
                    description: doc.description,
                    imageUrl: doc.imageUrl,
                    domain: doc.domain,
                    category: doc.category,
                    subCategory: doc.subCategory || doc.rentalType,
                    type: doc.type
                }));
            }

            return items;

        } catch (error) {
            console.error("🔴 [Search] TypeSense Failed:", error);
            return [];
        }
    },

    // Secure booking creation with validation
    createBooking: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");

        const item = await listingRepository.getById(args.itemId);
        if (!item) {
            throw new Error(`Item not found: ${args.itemId}`);
        }

        const bookingId = `ORD-${Date.now()}`;
        const confirmationNumber = `CFM-${Date.now()}`;
        const currency = item.currency || 'GBP';
        const totalPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price as any) || 0;
        const bookingData = {
            id: bookingId,
            userId: userId,
            itemId: item.id,
            domain: item.domain,
            itemTitle: item.title,
            itemImage: item.imageUrl,
            totalPrice,
            currency,
            customerName: args.customerName,
            customerContact: args.customerContact,
            specialRequests: args.specialRequests || '',
            needsPickup: args.needsPickup || false,
            checkIn: args.checkInDate || null,
            checkOut: args.checkOutDate || null,
            viewingTime: args.viewingSlot || null,
            status: 'payment_pending',
            confirmationNumber,
            createdAt: now(),
            updatedAt: now()
        };

        await db.collection('bookings').doc(bookingId).set(bookingData);
        console.log(`✅ Booking created: ${bookingData.id} for ${item.title}`);
        return {
            ...bookingData,
            receipt: {
                bookingId,
                confirmationNumber,
                itemTitle: item.title,
                category: (item as any).category || (item as any).subCategory || item.domain,
                total: totalPrice,
                currency
            }
        };
    },

    // Encyclopedia and knowledge queries
    consultEncyclopedia: async (args: any) => {
        console.log("Consulting Encyclopedia:", args);
        return {
            answer: `Here is some information about ${args.query}: North Cyprus has a rich history and follows British legal frameworks for property. Residency is easy to obtain for property owners.`
        };

    },

    getRealTimeInfo: async (args: GetRealTimeInfoArgs) => {
        console.log("Getting Real Time Info:", args);
        return {
            info: `Current info for ${args.category}: Weather  is sunny, 25°C. GBP/TRY exchange rate is approx 40.0.`
        };
    },

    sendWhatsAppMessage: async (args: SendWhatsAppArgs) => {
        console.log("Sending WhatsApp:", args);
        try {
            const { sendWhatsApp } = await import('./twilio.service');
            const res = await sendWhatsApp(args.recipient, args.message);
            await db.collection('notifications').add({
                userId: args.userId || null,
                channel: 'whatsapp',
                message: args.message,
                to: args.recipient,
                status: res.status || 'sent',
                createdAt: now()
            });
            return { success: true, status: res.status, sid: res.sid };
        } catch (err: any) {
            console.error("🔴 [WhatsApp] Failed:", err);
            return { success: false, error: err.message || 'send failed' };
        }
    },

    // New taxi dispatch system
    requestTaxi: async (args: RequestTaxiArgs, userId?: string) => {
        console.log("🚕 [RequestTaxi] New System:", args);

        try {
            const { createAndBroadcastRequest } = await import('./taxi.service');

            // Get user profile for contact info if not provided
            let customerPhone = args.customerPhone || '';
            let customerName = args.customerName || 'Guest';

            if (userId && !customerPhone) {
                const userSnap = await db.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone = (userData as any)?.phone || (userData as any)?.email || '';
                    customerName = (userData as any)?.displayName || customerName;
                }
            }

            if (!customerPhone) {
                throw new Error('Customer phone number is required');
            }

            // Create and broadcast the request
            const requestId = await createAndBroadcastRequest({
                userId: userId || 'guest',
                customerName,
                customerPhone,
                pickup: {
                    address: args.pickupAddress,
                    location: {
                        lat: args.pickupLat || 0,
                        lng: args.pickupLng || 0,
                        district: args.pickupDistrict
                    }
                },
                dropoff: {
                    address: args.dropoffAddress
                },
                priceEstimate: args.priceEstimate
            });

            console.log(`✅ [RequestTaxi] Request created and broadcast: ${requestId}`);

            return {
                success: true,
                requestId,
                status: 'pending',
                message: 'Taxi request sent to available drivers. You will be notified when a driver accepts.'
            };
        } catch (err: any) {
            console.error("🔴 [RequestTaxi] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to request taxi'
            };
        }
    },

    dispatchTaxi: async (args: DispatchTaxiArgs, userId?: string) => {
        console.log("🚖 [DispatchTaxi] Redirecting to new system...", args);

        // Map legacy dispatchTaxi args to new RequestTaxi format
        // We need to infer district if not provided, or default to 'Unknown'
        // Ideally, we should use a geo-lookup service here, but for now we'll pass 'Unknown' 
        // and let the service/repository handle it or rely on the address.
        // However, the new system REQUIRES a district for broadcasting.

        // Simple heuristic for district based on location string if lat/lng not available
        let district = 'Unknown';
        const locationLower = (args.pickupLocation || '').toLowerCase();
        if (locationLower.includes('girne') || locationLower.includes('kyrenia')) district = 'Girne';
        else if (locationLower.includes('lefkoşa') || locationLower.includes('nicosia') || locationLower.includes('lefkosa')) district = 'Lefkosa';
        else if (locationLower.includes('magusa') || locationLower.includes('famagusta')) district = 'Famagusta';
        else if (locationLower.includes('iskele')) district = 'Iskele';
        else if (locationLower.includes('guzelyurt')) district = 'Guzelyurt';
        else if (locationLower.includes('lefke')) district = 'Lefke';

        return toolResolvers.requestTaxi({
            pickupAddress: args.pickupLocation,
            pickupDistrict: district,
            pickupLat: args.pickupLat,
            pickupLng: args.pickupLng,
            dropoffAddress: args.destination,
            customerName: args.customerName,
            customerPhone: args.customerContact,
            // notes: args.notes // Notes aren't in the new system yet, but we can add them later
        }, userId);
    },

    createConsumerRequest: async (args: CreateConsumerRequestArgs) => {
        console.log("Creating Consumer Request:", args);
        return { success: true, requestId: `REQ-${Date.now()}` };
    },

    createPaymentIntent: async (args: CreatePaymentIntentArgs, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        if (!args.bookingId) throw new Error("bookingId is required");
        const { paymentService } = await import('./payment.service');
        const intent = await paymentService.createPaymentIntent(args.bookingId, userId);
        return {
            success: true,
            bookingId: args.bookingId,
            payment: intent
        };
    },

    scheduleViewing: async (args: ScheduleViewingArgs, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const item = await listingRepository.getById(args.listingId);
        if (!item) {
            throw new Error(`Listing not found: ${args.listingId}`);
        }

        const vrId = `VR-${Date.now()}`;
        const ownerContact = (item as any).agentPhone || (item as any).ownerContact || (item as any).whatsappNumber;

        const payload = {
            id: vrId,
            listingId: args.listingId,
            listingTitle: item.title,
            listingLocation: item.location,
            listingOwnerContact: ownerContact,
            customerName: args.customerName,
            customerContact: args.customerContact,
            preferredSlot: args.preferredSlot,
            notes: args.notes || '',
            userId: userId,
            status: 'pending',
            createdAt: now()
        };

        await db.collection('viewingRequests').doc(vrId).set(payload);

        // Send WhatsApp notification to owner/agent if contact is available
        if (ownerContact) {
            try {
                const { sendViewingRequest } = await import('./twilio.service');
                await sendViewingRequest(ownerContact, {
                    listingTitle: item.title,
                    listingId: args.listingId,
                    listingLocation: item.location,
                    customerName: args.customerName,
                    customerContact: args.customerContact,
                    preferredSlot: args.preferredSlot,
                    notes: args.notes
                });
                console.log(`✅ Viewing request sent via WhatsApp to ${ownerContact}`);
            } catch (err: any) {
                console.error("⚠️ Failed to send WhatsApp notification:", err);
                // Don't fail the whole request if WhatsApp fails
            }
        }

        return { success: true, viewingRequest: payload };
    },

    searchLocalPlaces: async (args: SearchLocalPlacesArgs) => {
        console.log("🔍 [Search] Local Places (Mapbox):", args);
        try {
            const { searchMapboxPlaces } = await import('./mapbox.service');

            // Construct a query that includes location for better accuracy
            const query = args.location ? `${args.query || args.domain || ''} in ${args.location}` : (args.query || args.domain || 'places');

            const places = await searchMapboxPlaces(query, {
                types: 'poi',
                limit: 10
            });

            console.log(`🔍 [Search Local] Found ${places.length} items via Mapbox`);

            return places.map((place: any) => ({
                id: place.id,
                title: place.text,
                price: 0, // Mapbox doesn't provide price
                location: place.place_name,
                amenities: place.properties.category ? [place.properties.category] : [],
                description: place.properties.address || place.place_name,
                imageUrl: null, // Mapbox doesn't provide images directly
                domain: args.domain,
                category: place.properties.category || 'Place',
                subCategory: 'Mapbox POI',
                type: 'venue',
                coordinates: {
                    lat: place.center[1],
                    lng: place.center[0]
                }
            }));
        } catch (error) {
            console.error("🔴 [Search Local] Failed:", error);
            return [];
        }
    },

    searchEvents: async (args: SearchEventsArgs) => {
        console.log("🔍 [Search] Events:", args);
        try {
            const { searchListings } = await import('./typesense.service');
            const result = await searchListings({
                query: args.query || '*',
                domain: 'Events',
                location: args.location,
                perPage: 20
            });
            console.log(`🔍 [Search Events] Found ${result.found} events`);
            return result.hits.map((hit: any) => ({
                id: hit.id,
                title: hit.title,
                price: hit.price,
                location: hit.location,
                description: hit.description,
                imageUrl: hit.metadata?.imageUrl,
                startsAt: hit.metadata?.startsAt,
                endsAt: hit.metadata?.endsAt
            }));
        } catch (error) {
            console.error("🔴 [Search Events] Failed:", error);
            return [];
        }
    },

    getUserProfile: async (_args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const snap = await db.collection('users').doc(userId).get();
        return snap.exists ? snap.data() : {};
    },

    updateUserProfile: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const userRef = db.collection('users').doc(userId);
        await userRef.set({
            persona: args.persona || null,
            interests: args.interests || null,
            budget: args.budget || null,
            location: args.location || null,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return { success: true };
    },

    saveFavoriteItem: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const favRef = db.collection('users').doc(userId).collection('favorites').doc(args.itemId);
        await favRef.set({
            itemId: args.itemId,
            title: args.title,
            domain: args.domain || null,
            createdAt: new Date().toISOString()
        });
        return { success: true };
    },

    listFavorites: async (_args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const snap = await db.collection('users').doc(userId).collection('favorites').limit(50).get();
        return snap.docs.map(d => d.data());
    },

    createTribe: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const id = db.collection('tribes').doc().id;
        const payload = { id, name: args.name, description: args.description || '', tags: args.tags || [], ownerId: userId, createdAt: now() };
        await db.collection('tribes').doc(id).set(payload);
        return { success: true, tribe: payload };
    },

    joinTribe: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        await db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).set({ joinedAt: now() });
        return { success: true };
    },

    leaveTribe: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        await db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).delete();
        return { success: true };
    },

    postToTribe: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const postId = db.collection('tribes').doc(args.tribeId).collection('posts').doc().id;
        const payload = { id: postId, content: args.content, mediaUrl: args.mediaUrl || null, userId, createdAt: now() };
        await db.collection('tribes').doc(args.tribeId).collection('posts').doc(postId).set(payload);
        return { success: true, post: payload };
    },

    listTribeMessages: async (args: any) => {
        const snap = await db.collection('tribes').doc(args.tribeId).collection('posts').orderBy('createdAt', 'desc').limit(args.limit || 20).get();
        return snap.docs.map(d => d.data());
    },

    getTribeInfo: async (args: any) => {
        const snap = await db.collection('tribes').doc(args.tribeId).get();
        return snap.exists ? snap.data() : {};
    },

    listTrendingTribes: async (args: any) => {
        // Approximate trending by recent posts count
        const snap = await db.collection('tribes').orderBy('createdAt', 'desc').limit(50).get();
        return snap.docs.slice(0, args.limit || 10).map(d => d.data());
    },

    waveUser: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const waveId = db.collection('waves').doc().id;
        const payload = { id: waveId, from: userId, to: args.targetUserId, status: 'pending', createdAt: now() };
        await db.collection('waves').doc(waveId).set(payload);
        return { success: true, waveId };
    },

    acceptWave: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        await db.collection('waves').doc(args.waveId).set({ status: 'accepted', respondedAt: now() }, { merge: true });
        return { success: true };
    },

    listNearbyUsers: async (_args: any) => {
        // Approximate nearby users using recent check-ins (no geo radius yet)
        const snap = await db.collection('checkIns').orderBy('createdAt', 'desc').limit(50).get();
        const seen = new Set<string>();
        const users: any[] = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.userId && !seen.has(data.userId)) {
                seen.add(data.userId);
                users.push({ userId: data.userId, placeId: data.placeId, placeName: data.placeName, location: data.location });
            }
        });
        return users;
    },

    checkInToPlace: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const checkInId = db.collection('checkIns').doc().id;
        const payload = { id: checkInId, userId, placeId: args.placeId, placeName: args.placeName, location: args.location || null, createdAt: now() };
        await db.collection('checkIns').doc(checkInId).set(payload);
        return { success: true, checkInId };
    },

    getCheckInsForPlace: async (args: any) => {
        const snap = await db.collection('checkIns').where('placeId', '==', args.placeId).orderBy('createdAt', 'desc').limit(args.limit || 20).get();
        return snap.docs.map(d => d.data());
    },

    fetchVibeMapData: async (args: any) => {
        console.log("Fetching vibe map data for", args.area);
        return { area: args.area, hotspots: [] };
    },

    createItinerary: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const id = db.collection('itineraries').doc().id;
        const payload = { id, title: args.title, userId, items: [], createdAt: now() };
        await db.collection('itineraries').doc(id).set(payload);
        return { success: true, itineraryId: id };
    },

    addToItinerary: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const ref = db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
        await ref.set({ itemId: args.itemId, title: args.title, day: args.day || null, addedAt: now() });
        return { success: true };
    },

    removeFromItinerary: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const ref = db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
        await ref.delete();
        return { success: true };
    },

    getItinerary: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const base = await db.collection('itineraries').doc(args.itineraryId).get();
        const itemsSnap = await db.collection('itineraries').doc(args.itineraryId).collection('items').get();
        return { ...base.data(), items: itemsSnap.docs.map(d => d.data()) };
    },

    saveItinerary: async (_args: any, _userId: string) => {
        return { success: true };
    },

    updateBusinessInfo: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        await db.collection('businesses').doc(args.businessId).set({
            name: args.name,
            description: args.description,
            phone: args.phone,
            updatedAt: now()
        }, { merge: true });
        return { success: true };
    },

    updateBusinessAvailability: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        await db.collection('businesses').doc(args.businessId).set({
            availability: args.availability,
            updatedAt: now()
        }, { merge: true });
        return { success: true };
    },

    updateBusinessHours: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        await db.collection('businesses').doc(args.businessId).set({
            hours: args.hours,
            updatedAt: now()
        }, { merge: true });
        return { success: true };
    },

    uploadBusinessMedia: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const mediaId = db.collection('businesses').doc(args.businessId).collection('media').doc().id;
        await db.collection('businesses').doc(args.businessId).collection('media').doc(mediaId).set({
            mediaUrl: args.mediaUrl,
            uploadedAt: now()
        });
        return { success: true };
    },

    listBusinessLeads: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        const snap = await db.collection('businesses').doc(args.businessId).collection('leads').orderBy('createdAt', 'desc').limit(20).get();
        return snap.docs.map(d => d.data());
    },

    respondToLead: async (args: any, userId: string) => {
        if (!userId) throw new Error("Unauthorized: User ID required");
        await db.collection('businesses').doc(args.businessId).collection('leads').doc(args.leadId).set({
            response: args.message,
            respondedAt: now()
        }, { merge: true });
        return { success: true };
    },

    sendAppNotification: async (args: any) => {
        console.log("Send app notification", args);
        // Placeholder for FCM/local notifications
        return { success: true, enqueued: true };
    },

    sendEmailNotification: async (args: any) => {
        console.log("Send email", args);
        // Hook up to real provider later
        return { success: true, enqueued: true };
    },

    getNearbyPlaces: async (args: any) => {
        console.log("Get nearby places (Mapbox)", args);
        try {
            const { searchMapboxPlaces } = await import('./mapbox.service');

            // If location is coordinates "lat,lng", use proximity
            // If location is a name, use it in query
            const isCoords = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(args.location);

            let query = args.domain || 'places';
            let options: any = { limit: 10, types: 'poi' };

            if (isCoords) {
                const [lat, lng] = args.location.split(',');
                options.proximity = `${lng},${lat}`; // Mapbox expects lng,lat
            } else {
                query = `${args.domain || 'places'} near ${args.location}`;
            }

            const places = await searchMapboxPlaces(query, options);

            return places.map((place: any) => ({
                id: place.id,
                title: place.text,
                location: place.place_name,
                description: place.properties.address,
                imageUrl: null,
                coordinates: {
                    lat: place.center[1],
                    lng: place.center[0]
                }
            }));
        } catch (err) {
            console.error("🔴 [Nearby] Failed:", err);
            return [];
        }
    },

    computeDistance: async (args: any) => {
        const parse = (str: string) => {
            const parts = (str || '').split(',').map((p: string) => parseFloat(p.trim()));
            if (parts.length !== 2 || parts.some(isNaN)) return null;
            return { lat: parts[0], lon: parts[1] };
        };
        const a = parse(args.from);
        const b = parse(args.to);
        if (!a || !b) return { distanceKm: null };

        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const hav =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
        return { distanceKm: Math.round(R * c * 100) / 100 };
    },

    fetchHotspots: async (args: any) => {
        console.log("Fetch hotspots", args);
        // crude hotspot detection via recent check-ins
        const snap = await db.collection('checkIns').orderBy('createdAt', 'desc').limit(200).get();
        const tally: Record<string, number> = {};
        snap.forEach(doc => {
            const data = doc.data();
            if (args.area && data.location && !String(data.location).includes(args.area)) return;
            const key = data.placeName || data.placeId || 'unknown';
            tally[key] = (tally[key] || 0) + 1;
        });
        const hotspots = Object.entries(tally)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([place, score]) => ({ place, score }));
        return { hotspots };
    },

    getAreaInfo: async (args: any) => {
        // Summarize based on hotspots/check-ins
        const vibe = await toolResolvers.fetchHotspots({ area: args.area });
        return { area: args.area, hotspots: vibe.hotspots || [] };
    },

    showMap: async (args: any) => {
        console.log("🗺️ Showing Map:", args);
        return {
            lat: args.lat,
            lng: args.lng,
            title: args.title
        };
    },

    // Household supplies dispatcher (Groceries/Water/Gas)
    orderHouseholdSupplies: async (args: any, userId?: string) => {
        console.log("🛒 [OrderSupplies] New order:", args);

        try {
            // Get user profile for contact info if not provided
            let customerPhone = args.contactPhone || '';
            let customerName = args.customerName || 'Guest';

            if (userId && !customerPhone) {
                const userSnap = await db.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone = (userData as any)?.phone || (userData as any)?.email || '';
                    customerName = (userData as any)?.displayName || customerName;
                }
            }

            if (!customerPhone) {
                throw new Error('Customer phone number is required');
            }

            const orderId = `GRO-${Date.now()}`;

            // Find a Market listing (domain: 'Market' or category: 'Grocery')
            const marketsSnap = await db.collection('listings')
                .where('domain', '==', 'Market')
                .limit(1)
                .get();

            if (marketsSnap.empty) {
                // Fallback: try category-based search
                const altSnap = await db.collection('listings')
                    .where('category', '==', 'Grocery')
                    .limit(1)
                    .get();

                if (altSnap.empty) {
                    throw new Error('No markets available. Please try again later.');
                }

                const marketDoc = altSnap.docs[0];
                const marketData: any = marketDoc.data();
                const vendorPhone = marketData.agentPhone || marketData.ownerContact || process.env.MARKET_WHATSAPP_NUMBER;

                if (!vendorPhone) {
                    throw new Error('Market contact not configured');
                }

                return await processGroceryOrder(orderId, userId, customerName, customerPhone, args, marketDoc.id, marketData, vendorPhone);
            }

            const marketDoc = marketsSnap.docs[0];
            const marketData: any = marketDoc.data();
            const vendorPhone = marketData.agentPhone || marketData.ownerContact || process.env.MARKET_WHATSAPP_NUMBER;

            if (!vendorPhone) {
                throw new Error('Market contact not configured');
            }

            return await processGroceryOrder(orderId, userId, customerName, customerPhone, args, marketDoc.id, marketData, vendorPhone);

        } catch (err: any) {
            console.error("🔴 [OrderSupplies] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to process order'
            };
        }
    },

    // Service request dispatcher (Plumber/Electrician/etc)
    requestService: async (args: any, userId?: string) => {
        console.log("🔧 [RequestService] New request:", args);

        try {
            // Get user profile for contact info if not provided
            let customerPhone = args.contactPhone || '';
            let customerName = args.customerName || 'Guest';

            if (userId && !customerPhone) {
                const userSnap = await db.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone = (userData as any)?.phone || (userData as any)?.email || '';
                    customerName = (userData as any)?.displayName || customerName;
                }
            }

            if (!customerPhone) {
                throw new Error('Customer phone number is required');
            }

            const requestId = `SVC-${Date.now()}`;

            // Find a Service provider (domain: 'Services', subCategory: serviceType)
            const providersSnap = await db.collection('listings')
                .where('domain', '==', 'Services')
                .where('subCategory', '==', args.serviceType)
                .limit(1)
                .get();

            if (providersSnap.empty) {
                // Fallback: any service provider
                const altSnap = await db.collection('listings')
                    .where('domain', '==', 'Services')
                    .limit(1)
                    .get();

                if (altSnap.empty) {
                    throw new Error(`No ${args.serviceType} providers available. Please try again later.`);
                }

                const providerDoc = altSnap.docs[0];
                const providerData: any = providerDoc.data();
                const providerPhone = providerData.agentPhone || providerData.ownerContact || process.env.SERVICE_WHATSAPP_NUMBER;

                if (!providerPhone) {
                    throw new Error('Service provider contact not configured');
                }

                return await processServiceRequest(requestId, userId, customerName, customerPhone, args, providerDoc.id, providerData, providerPhone);
            }

            const providerDoc = providersSnap.docs[0];
            const providerData: any = providerDoc.data();
            const providerPhone = providerData.agentPhone || providerData.ownerContact || process.env.SERVICE_WHATSAPP_NUMBER;

            if (!providerPhone) {
                throw new Error('Service provider contact not configured');
            }

            return await processServiceRequest(requestId, userId, customerName, customerPhone, args, providerDoc.id, providerData, providerPhone);

        } catch (err: any) {
            console.error("🔴 [RequestService] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to request service'
            };
        }
    }
};

// Helper function to process grocery orders
async function processGroceryOrder(orderId: string, userId: string | undefined, customerName: string, customerPhone: string, args: any, marketId: string, marketData: any, vendorPhone: string) {
    // Save order to database
    await db.collection('groceryOrders').doc(orderId).set({
        id: orderId,
        userId: userId || null,
        customerName,
        customerContact: customerPhone,
        items: args.items,
        deliveryAddress: args.deliveryAddress,
        notes: args.notes || '',
        marketId,
        marketTitle: marketData.title,
        vendorPhone,
        status: 'pending',
        createdAt: now()
    });

    // Send WhatsApp to vendor
    const { sendWhatsApp } = await import('./twilio.service');
    const whatsappMessage = `🛒 *New Order from CityOS*\n\n📦 Items: ${args.items}\n\n📍 Delivery to: ${args.deliveryAddress}\n📱 Contact: ${customerPhone}\n👤 Customer: ${customerName}${args.notes ? `\n\n💬 Notes: ${args.notes}` : ''}`;

    const whatsappResult = await sendWhatsApp(vendorPhone, whatsappMessage);

    console.log(`✅ Grocery order sent via WhatsApp to ${vendorPhone}: ${whatsappResult.sid}`);

    return {
        success: true,
        order: {
            id: orderId,
            status: 'pending',
            message: 'Order sent to market. You will receive a confirmation shortly.',
            marketName: marketData.title
        },
        whatsappStatus: whatsappResult.status
    };
}

// Helper function to process service requests
async function processServiceRequest(requestId: string, userId: string | undefined, customerName: string, customerPhone: string, args: any, providerId: string, providerData: any, providerPhone: string) {
    // Save request to database
    await db.collection('serviceRequests').doc(requestId).set({
        id: requestId,
        userId: userId || null,
        customerName,
        customerContact: customerPhone,
        serviceType: args.serviceType,
        description: args.description,
        urgency: args.urgency || 'flexible',
        location: args.location,
        providerId,
        providerTitle: providerData.title,
        providerPhone,
        status: 'pending',
        createdAt: now()
    });

    // Send WhatsApp to provider
    const { sendWhatsApp } = await import('./twilio.service');
    const urgencyEmoji = args.urgency === 'emergency' ? '🚨' : args.urgency === 'today' ? '⚡' : '📅';
    const whatsappMessage = `🔧 *New Job Lead from CityOS*\n\n${urgencyEmoji} Service: ${args.serviceType}\n📝 Description: ${args.description}\n⏰ Urgency: ${args.urgency}\n\n📍 Location: ${args.location}\n📱 Customer: ${customerName} (${customerPhone})`;

    const whatsappResult = await sendWhatsApp(providerPhone, whatsappMessage);

    console.log(`✅ Service request sent via WhatsApp to ${providerPhone}: ${whatsappResult.sid}`);

    return {
        success: true,
        request: {
            id: requestId,
            status: 'pending',
            message: 'Service request sent to provider. You will receive a confirmation shortly.',
            providerName: providerData.title
        },
        whatsappStatus: whatsappResult.status
    };
}
