"use strict";
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
exports.toolResolvers = void 0;
require("firebase-admin/firestore");
const firestore_1 = require("firebase-admin/firestore");
const listing_repository_1 = require("../repositories/listing.repository");
const firebase_1 = require("../config/firebase");
const now = firestore_1.FieldValue.serverTimestamp;
exports.toolResolvers = {
    // TypeSense-powered marketplace search
    searchMarketplace: async (args) => {
        console.log("🔍 [Search] TypeSense Search Args:", args);
        try {
            const { searchListings } = await Promise.resolve().then(() => __importStar(require('./typesense.service')));
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
            let items = result.hits.map((hit) => {
                var _a, _b;
                return ({
                    id: hit.id,
                    title: hit.title,
                    price: hit.price,
                    location: hit.location,
                    amenities: ((_a = hit.metadata) === null || _a === void 0 ? void 0 : _a.amenities) || [],
                    description: hit.description,
                    imageUrl: (_b = hit.metadata) === null || _b === void 0 ? void 0 : _b.imageUrl,
                    domain: hit.domain,
                    category: hit.category,
                    subCategory: hit.subCategory,
                    type: hit.type
                });
            });
            // Fallback to Firestore if index is empty
            if (!items || items.length === 0) {
                console.warn("[Search] Typesense returned 0 items. Falling back to Firestore listings.");
                const fallback = await listing_repository_1.listingRepository.getAllActive({
                    domain: args.domain,
                    ownerUid: undefined,
                    businessId: undefined
                });
                items = fallback.map((doc) => ({
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
        }
        catch (error) {
            console.error("🔴 [Search] TypeSense Failed:", error);
            return [];
        }
    },
    // Secure booking creation with validation
    createBooking: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const item = await listing_repository_1.listingRepository.getById(args.itemId);
        if (!item) {
            throw new Error(`Item not found: ${args.itemId}`);
        }
        const bookingId = `ORD-${Date.now()}`;
        const confirmationNumber = `CFM-${Date.now()}`;
        const currency = item.currency || 'GBP';
        const totalPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
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
        await firebase_1.db.collection('bookings').doc(bookingId).set(bookingData);
        console.log(`✅ Booking created: ${bookingData.id} for ${item.title}`);
        return Object.assign(Object.assign({}, bookingData), { receipt: {
                bookingId,
                confirmationNumber,
                itemTitle: item.title,
                category: item.category || item.subCategory || item.domain,
                total: totalPrice,
                currency
            } });
    },
    // Encyclopedia and knowledge queries
    consultEncyclopedia: async (args) => {
        console.log("Consulting Encyclopedia:", args);
        return {
            answer: `Here is some information about ${args.query}: North Cyprus has a rich history and follows British legal frameworks for property. Residency is easy to obtain for property owners.`
        };
    },
    getRealTimeInfo: async (args) => {
        console.log("Getting Real Time Info:", args);
        return {
            info: `Current info for ${args.category}: Weather  is sunny, 25°C. GBP/TRY exchange rate is approx 40.0.`
        };
    },
    sendWhatsAppMessage: async (args) => {
        console.log("Sending WhatsApp:", args);
        try {
            const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('./twilio.service')));
            const res = await sendWhatsApp(args.recipient, args.message);
            await firebase_1.db.collection('notifications').add({
                userId: args.userId || null,
                channel: 'whatsapp',
                message: args.message,
                to: args.recipient,
                status: res.status || 'sent',
                createdAt: now()
            });
            return { success: true, status: res.status, sid: res.sid };
        }
        catch (err) {
            console.error("🔴 [WhatsApp] Failed:", err);
            return { success: false, error: err.message || 'send failed' };
        }
    },
    // New taxi dispatch system
    requestTaxi: async (args, userId) => {
        console.log("🚕 [RequestTaxi] New System:", args);
        try {
            const { createAndBroadcastRequest } = await Promise.resolve().then(() => __importStar(require('./taxi.service')));
            // Get user profile for contact info if not provided
            let customerPhone = args.customerPhone || '';
            let customerName = args.customerName || 'Guest';
            if (userId && !customerPhone) {
                const userSnap = await firebase_1.db.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone = (userData === null || userData === void 0 ? void 0 : userData.phone) || (userData === null || userData === void 0 ? void 0 : userData.email) || '';
                    customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
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
        }
        catch (err) {
            console.error("🔴 [RequestTaxi] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to request taxi'
            };
        }
    },
    dispatchTaxi: async (args, userId) => {
        console.log("🚖 Dispatching Taxi:", args);
        try {
            const { sendTaxiRequest } = await Promise.resolve().then(() => __importStar(require('./twilio.service')));
            // Get user profile for contact info
            let customerContact = args.customerContact || '';
            let customerName = args.customerName || 'Guest';
            if (userId && !customerContact) {
                const userSnap = await firebase_1.db.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerContact = (userData === null || userData === void 0 ? void 0 : userData.phone) || (userData === null || userData === void 0 ? void 0 : userData.email) || '';
                    customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
                }
            }
            const taxiId = `TAXI-${Date.now()}`;
            // Smart taxi selection: Prefer taxis in the same area as pickup location
            const pickupLocation = (args.pickupLocation || args.pickup || '').toLowerCase();
            // Get all available taxis
            const allTaxisSnap = await firebase_1.db.collection('listings')
                .where('domain', '==', 'Cars')
                .where('type', '==', 'taxi')
                .get();
            if (allTaxisSnap.empty) {
                throw new Error('No taxi listings available');
            }
            // Score taxis based on location match
            const taxis = allTaxisSnap.docs.map(doc => {
                const data = doc.data();
                const location = (data.location || '').toLowerCase();
                const city = (data.city || '').toLowerCase();
                const isActive = data.isActive !== false; // Default to true if not set
                let score = 0;
                // Skip inactive taxis
                if (!isActive) {
                    return { doc, data, score: -1000 };
                }
                // Exact location match (e.g., "Kyrenia Marina" matches "kyrenia marina")
                if (pickupLocation && (pickupLocation.includes(location) || location.includes(pickupLocation))) {
                    score += 100;
                }
                // City match (e.g., "Kyrenia" or "Girne")
                if (pickupLocation && (pickupLocation.includes(city) || city.includes(pickupLocation))) {
                    score += 50;
                }
                // Area keyword matching
                const areaKeywords = ['kyrenia', 'girne', 'nicosia', 'lefkosa', 'lefkoşa', 'famagusta', 'magusa', 'gazimağusa', 'iskele', 'lapta', 'bellapais', 'alsancak', 'catalkoy', 'çatalköy'];
                for (const keyword of areaKeywords) {
                    if (pickupLocation.includes(keyword) && (location.includes(keyword) || city.includes(keyword))) {
                        score += 30;
                        break; // Only count once
                    }
                }
                // Premium taxis get slight boost for quality
                if (data.vehicleType === 'SUV' || data.vehicleType === 'Minivan') {
                    score += 5;
                }
                // Higher rated taxis get slight boost
                score += (data.rating || 4.0) * 2;
                // Random factor to distribute load (0-10 points)
                score += Math.random() * 10;
                return { doc, data, score };
            });
            // Sort by score (highest first) and filter out negative scores
            const availableTaxis = taxis.filter(t => t.score >= 0).sort((a, b) => b.score - a.score);
            if (availableTaxis.length === 0) {
                throw new Error('No active taxi listings available');
            }
            // Select the best match
            const selectedTaxi = availableTaxis[0];
            const taxiDoc = selectedTaxi.doc;
            const taxiData = selectedTaxi.data;
            console.log(`🚕 [DispatchTaxi] Selected: ${taxiData.title} (Score: ${selectedTaxi.score.toFixed(1)})`);
            console.log(`   📍 Taxi location: ${taxiData.location}`);
            console.log(`   📍 Pickup location: ${args.pickupLocation || args.pickup}`);
            console.log(`   🚗 Vehicle: ${taxiData.vehicleColor} ${taxiData.vehicleModel} (${taxiData.plateNumber})`);
            const taxiPhone = taxiData.agentPhone || process.env.TAXI_WHATSAPP_NUMBER;
            if (!taxiPhone) {
                throw new Error('Taxi phone number not configured');
            }
            // Save taxi booking to database with full taxi details
            await firebase_1.db.collection('taxiBookings').doc(taxiId).set({
                id: taxiId,
                userId: userId || null,
                customerName,
                customerContact,
                pickupLocation: args.pickupLocation || args.pickup,
                destination: args.destination || '',
                pickupTime: args.pickupTime || null,
                pickupLat: args.pickupLat || null,
                pickupLng: args.pickupLng || null,
                destinationLat: args.destinationLat || null,
                destinationLng: args.destinationLng || null,
                notes: args.notes || '',
                status: 'pending',
                createdAt: now(),
                taxiListingId: taxiDoc.id,
                taxiTitle: taxiData.title,
                taxiDetails: {
                    title: taxiData.title,
                    vehicleModel: taxiData.vehicleModel,
                    vehicleColor: taxiData.vehicleColor,
                    plateNumber: taxiData.plateNumber,
                    vehicleType: taxiData.vehicleType,
                    capacity: taxiData.capacity,
                    rating: taxiData.rating,
                    phone: taxiPhone
                }
            });
            // Send WhatsApp to selected taxi
            const whatsappResult = await sendTaxiRequest(taxiPhone, {
                customerContact,
                customerName,
                pickup: args.pickupLocation || args.pickup,
                destination: args.destination || '',
                pickupTime: args.pickupTime,
                notes: args.notes,
                pickupLat: args.pickupLat,
                pickupLng: args.pickupLng,
                destinationLat: args.destinationLat,
                destinationLng: args.destinationLng
            });
            console.log(`✅ Taxi request sent via WhatsApp to ${taxiPhone}: ${whatsappResult.sid}`);
            return {
                success: true,
                booking: {
                    id: taxiId,
                    status: 'pending',
                    message: `Taxi request sent to ${taxiData.title}. You will receive a confirmation shortly.`,
                    taxiInfo: {
                        name: taxiData.title,
                        vehicle: `${taxiData.vehicleColor} ${taxiData.vehicleModel}`,
                        plateNumber: taxiData.plateNumber,
                        rating: taxiData.rating
                    }
                },
                whatsappStatus: whatsappResult.status
            };
        }
        catch (err) {
            console.error("🔴 [Taxi] Failed to dispatch:", err);
            return {
                success: false,
                error: err.message || 'Failed to dispatch taxi',
                booking: { id: `TAXI-${Date.now()}`, status: 'failed' }
            };
        }
    },
    createConsumerRequest: async (args) => {
        console.log("Creating Consumer Request:", args);
        return { success: true, requestId: `REQ-${Date.now()}` };
    },
    createPaymentIntent: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        if (!args.bookingId)
            throw new Error("bookingId is required");
        const { paymentService } = await Promise.resolve().then(() => __importStar(require('./payment.service')));
        const intent = await paymentService.createPaymentIntent(args.bookingId, userId);
        return {
            success: true,
            bookingId: args.bookingId,
            payment: intent
        };
    },
    scheduleViewing: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const item = await listing_repository_1.listingRepository.getById(args.listingId);
        if (!item) {
            throw new Error(`Listing not found: ${args.listingId}`);
        }
        const vrId = `VR-${Date.now()}`;
        const ownerContact = item.agentPhone || item.ownerContact || item.whatsappNumber;
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
        await firebase_1.db.collection('viewingRequests').doc(vrId).set(payload);
        // Send WhatsApp notification to owner/agent if contact is available
        if (ownerContact) {
            try {
                const { sendViewingRequest } = await Promise.resolve().then(() => __importStar(require('./twilio.service')));
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
            }
            catch (err) {
                console.error("⚠️ Failed to send WhatsApp notification:", err);
                // Don't fail the whole request if WhatsApp fails
            }
        }
        return { success: true, viewingRequest: payload };
    },
    searchLocalPlaces: async (args) => {
        console.log("🔍 [Search] Local Places (Mapbox):", args);
        try {
            const { searchMapboxPlaces } = await Promise.resolve().then(() => __importStar(require('./mapbox.service')));
            // Construct a query that includes location for better accuracy
            const query = args.location ? `${args.query || args.domain} in ${args.location}` : (args.query || args.domain);
            const places = await searchMapboxPlaces(query, {
                types: 'poi',
                limit: 10
            });
            console.log(`🔍 [Search Local] Found ${places.length} items via Mapbox`);
            return places.map((place) => ({
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
        }
        catch (error) {
            console.error("🔴 [Search Local] Failed:", error);
            return [];
        }
    },
    searchEvents: async (args) => {
        console.log("🔍 [Search] Events:", args);
        try {
            const { searchListings } = await Promise.resolve().then(() => __importStar(require('./typesense.service')));
            const result = await searchListings({
                query: args.query || '*',
                domain: 'Events',
                location: args.location,
                perPage: 20
            });
            console.log(`🔍 [Search Events] Found ${result.found} events`);
            return result.hits.map((hit) => {
                var _a, _b, _c;
                return ({
                    id: hit.id,
                    title: hit.title,
                    price: hit.price,
                    location: hit.location,
                    description: hit.description,
                    imageUrl: (_a = hit.metadata) === null || _a === void 0 ? void 0 : _a.imageUrl,
                    startsAt: (_b = hit.metadata) === null || _b === void 0 ? void 0 : _b.startsAt,
                    endsAt: (_c = hit.metadata) === null || _c === void 0 ? void 0 : _c.endsAt
                });
            });
        }
        catch (error) {
            console.error("🔴 [Search Events] Failed:", error);
            return [];
        }
    },
    getUserProfile: async (_args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const snap = await firebase_1.db.collection('users').doc(userId).get();
        return snap.exists ? snap.data() : {};
    },
    updateUserProfile: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const userRef = firebase_1.db.collection('users').doc(userId);
        await userRef.set({
            persona: args.persona || null,
            interests: args.interests || null,
            budget: args.budget || null,
            location: args.location || null,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        return { success: true };
    },
    saveFavoriteItem: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const favRef = firebase_1.db.collection('users').doc(userId).collection('favorites').doc(args.itemId);
        await favRef.set({
            itemId: args.itemId,
            title: args.title,
            domain: args.domain || null,
            createdAt: new Date().toISOString()
        });
        return { success: true };
    },
    listFavorites: async (_args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const snap = await firebase_1.db.collection('users').doc(userId).collection('favorites').limit(50).get();
        return snap.docs.map(d => d.data());
    },
    createTribe: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const id = firebase_1.db.collection('tribes').doc().id;
        const payload = { id, name: args.name, description: args.description || '', tags: args.tags || [], ownerId: userId, createdAt: now() };
        await firebase_1.db.collection('tribes').doc(id).set(payload);
        return { success: true, tribe: payload };
    },
    joinTribe: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        await firebase_1.db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).set({ joinedAt: now() });
        return { success: true };
    },
    leaveTribe: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        await firebase_1.db.collection('tribes').doc(args.tribeId).collection('members').doc(userId).delete();
        return { success: true };
    },
    postToTribe: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const postId = firebase_1.db.collection('tribes').doc(args.tribeId).collection('posts').doc().id;
        const payload = { id: postId, content: args.content, mediaUrl: args.mediaUrl || null, userId, createdAt: now() };
        await firebase_1.db.collection('tribes').doc(args.tribeId).collection('posts').doc(postId).set(payload);
        return { success: true, post: payload };
    },
    listTribeMessages: async (args) => {
        const snap = await firebase_1.db.collection('tribes').doc(args.tribeId).collection('posts').orderBy('createdAt', 'desc').limit(args.limit || 20).get();
        return snap.docs.map(d => d.data());
    },
    getTribeInfo: async (args) => {
        const snap = await firebase_1.db.collection('tribes').doc(args.tribeId).get();
        return snap.exists ? snap.data() : {};
    },
    listTrendingTribes: async (args) => {
        // Approximate trending by recent posts count
        const snap = await firebase_1.db.collection('tribes').orderBy('createdAt', 'desc').limit(50).get();
        return snap.docs.slice(0, args.limit || 10).map(d => d.data());
    },
    waveUser: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const waveId = firebase_1.db.collection('waves').doc().id;
        const payload = { id: waveId, from: userId, to: args.targetUserId, status: 'pending', createdAt: now() };
        await firebase_1.db.collection('waves').doc(waveId).set(payload);
        return { success: true, waveId };
    },
    acceptWave: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        await firebase_1.db.collection('waves').doc(args.waveId).set({ status: 'accepted', respondedAt: now() }, { merge: true });
        return { success: true };
    },
    listNearbyUsers: async (_args) => {
        // Approximate nearby users using recent check-ins (no geo radius yet)
        const snap = await firebase_1.db.collection('checkIns').orderBy('createdAt', 'desc').limit(50).get();
        const seen = new Set();
        const users = [];
        snap.forEach(doc => {
            const data = doc.data();
            if (data.userId && !seen.has(data.userId)) {
                seen.add(data.userId);
                users.push({ userId: data.userId, placeId: data.placeId, placeName: data.placeName, location: data.location });
            }
        });
        return users;
    },
    checkInToPlace: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const checkInId = firebase_1.db.collection('checkIns').doc().id;
        const payload = { id: checkInId, userId, placeId: args.placeId, placeName: args.placeName, location: args.location || null, createdAt: now() };
        await firebase_1.db.collection('checkIns').doc(checkInId).set(payload);
        return { success: true, checkInId };
    },
    getCheckInsForPlace: async (args) => {
        const snap = await firebase_1.db.collection('checkIns').where('placeId', '==', args.placeId).orderBy('createdAt', 'desc').limit(args.limit || 20).get();
        return snap.docs.map(d => d.data());
    },
    fetchVibeMapData: async (args) => {
        console.log("Fetching vibe map data for", args.area);
        return { area: args.area, hotspots: [] };
    },
    createItinerary: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const id = firebase_1.db.collection('itineraries').doc().id;
        const payload = { id, title: args.title, userId, items: [], createdAt: now() };
        await firebase_1.db.collection('itineraries').doc(id).set(payload);
        return { success: true, itineraryId: id };
    },
    addToItinerary: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const ref = firebase_1.db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
        await ref.set({ itemId: args.itemId, title: args.title, day: args.day || null, addedAt: now() });
        return { success: true };
    },
    removeFromItinerary: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const ref = firebase_1.db.collection('itineraries').doc(args.itineraryId).collection('items').doc(args.itemId);
        await ref.delete();
        return { success: true };
    },
    getItinerary: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const base = await firebase_1.db.collection('itineraries').doc(args.itineraryId).get();
        const itemsSnap = await firebase_1.db.collection('itineraries').doc(args.itineraryId).collection('items').get();
        return Object.assign(Object.assign({}, base.data()), { items: itemsSnap.docs.map(d => d.data()) });
    },
    saveItinerary: async (_args, _userId) => {
        return { success: true };
    },
    updateBusinessInfo: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        await firebase_1.db.collection('businesses').doc(args.businessId).set({
            name: args.name,
            description: args.description,
            phone: args.phone,
            updatedAt: now()
        }, { merge: true });
        return { success: true };
    },
    updateBusinessAvailability: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        await firebase_1.db.collection('businesses').doc(args.businessId).set({
            availability: args.availability,
            updatedAt: now()
        }, { merge: true });
        return { success: true };
    },
    updateBusinessHours: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        await firebase_1.db.collection('businesses').doc(args.businessId).set({
            hours: args.hours,
            updatedAt: now()
        }, { merge: true });
        return { success: true };
    },
    uploadBusinessMedia: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const mediaId = firebase_1.db.collection('businesses').doc(args.businessId).collection('media').doc().id;
        await firebase_1.db.collection('businesses').doc(args.businessId).collection('media').doc(mediaId).set({
            mediaUrl: args.mediaUrl,
            uploadedAt: now()
        });
        return { success: true };
    },
    listBusinessLeads: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        const snap = await firebase_1.db.collection('businesses').doc(args.businessId).collection('leads').orderBy('createdAt', 'desc').limit(20).get();
        return snap.docs.map(d => d.data());
    },
    respondToLead: async (args, userId) => {
        if (!userId)
            throw new Error("Unauthorized: User ID required");
        await firebase_1.db.collection('businesses').doc(args.businessId).collection('leads').doc(args.leadId).set({
            response: args.message,
            respondedAt: now()
        }, { merge: true });
        return { success: true };
    },
    sendAppNotification: async (args) => {
        console.log("Send app notification", args);
        // Placeholder for FCM/local notifications
        return { success: true, enqueued: true };
    },
    sendEmailNotification: async (args) => {
        console.log("Send email", args);
        // Hook up to real provider later
        return { success: true, enqueued: true };
    },
    getNearbyPlaces: async (args) => {
        console.log("Get nearby places (Mapbox)", args);
        try {
            const { searchMapboxPlaces } = await Promise.resolve().then(() => __importStar(require('./mapbox.service')));
            // If location is coordinates "lat,lng", use proximity
            // If location is a name, use it in query
            const isCoords = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(args.location);
            let query = args.domain || 'places';
            let options = { limit: 10, types: 'poi' };
            if (isCoords) {
                const [lat, lng] = args.location.split(',');
                options.proximity = `${lng},${lat}`; // Mapbox expects lng,lat
            }
            else {
                query = `${args.domain || 'places'} near ${args.location}`;
            }
            const places = await searchMapboxPlaces(query, options);
            return places.map((place) => ({
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
        }
        catch (err) {
            console.error("🔴 [Nearby] Failed:", err);
            return [];
        }
    },
    computeDistance: async (args) => {
        const parse = (str) => {
            const parts = (str || '').split(',').map((p) => parseFloat(p.trim()));
            if (parts.length !== 2 || parts.some(isNaN))
                return null;
            return { lat: parts[0], lon: parts[1] };
        };
        const a = parse(args.from);
        const b = parse(args.to);
        if (!a || !b)
            return { distanceKm: null };
        const toRad = (deg) => (deg * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const hav = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
        return { distanceKm: Math.round(R * c * 100) / 100 };
    },
    fetchHotspots: async (args) => {
        console.log("Fetch hotspots", args);
        // crude hotspot detection via recent check-ins
        const snap = await firebase_1.db.collection('checkIns').orderBy('createdAt', 'desc').limit(200).get();
        const tally = {};
        snap.forEach(doc => {
            const data = doc.data();
            if (args.area && data.location && !String(data.location).includes(args.area))
                return;
            const key = data.placeName || data.placeId || 'unknown';
            tally[key] = (tally[key] || 0) + 1;
        });
        const hotspots = Object.entries(tally)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([place, score]) => ({ place, score }));
        return { hotspots };
    },
    getAreaInfo: async (args) => {
        // Summarize based on hotspots/check-ins
        const vibe = await exports.toolResolvers.fetchHotspots({ area: args.area });
        return { area: args.area, hotspots: vibe.hotspots || [] };
    },
    showMap: async (args) => {
        console.log("🗺️ Showing Map:", args);
        return {
            lat: args.lat,
            lng: args.lng,
            title: args.title
        };
    },
    // Household supplies dispatcher (Groceries/Water/Gas)
    orderHouseholdSupplies: async (args, userId) => {
        console.log("🛒 [OrderSupplies] New order:", args);
        try {
            // Get user profile for contact info if not provided
            let customerPhone = args.contactPhone || '';
            let customerName = args.customerName || 'Guest';
            if (userId && !customerPhone) {
                const userSnap = await firebase_1.db.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone = (userData === null || userData === void 0 ? void 0 : userData.phone) || (userData === null || userData === void 0 ? void 0 : userData.email) || '';
                    customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
                }
            }
            if (!customerPhone) {
                throw new Error('Customer phone number is required');
            }
            const orderId = `GRO-${Date.now()}`;
            // Find a Market listing (domain: 'Market' or category: 'Grocery')
            const marketsSnap = await firebase_1.db.collection('listings')
                .where('domain', '==', 'Market')
                .limit(1)
                .get();
            if (marketsSnap.empty) {
                // Fallback: try category-based search
                const altSnap = await firebase_1.db.collection('listings')
                    .where('category', '==', 'Grocery')
                    .limit(1)
                    .get();
                if (altSnap.empty) {
                    throw new Error('No markets available. Please try again later.');
                }
                const marketDoc = altSnap.docs[0];
                const marketData = marketDoc.data();
                const vendorPhone = marketData.agentPhone || marketData.ownerContact || process.env.MARKET_WHATSAPP_NUMBER;
                if (!vendorPhone) {
                    throw new Error('Market contact not configured');
                }
                return await processGroceryOrder(orderId, userId, customerName, customerPhone, args, marketDoc.id, marketData, vendorPhone);
            }
            const marketDoc = marketsSnap.docs[0];
            const marketData = marketDoc.data();
            const vendorPhone = marketData.agentPhone || marketData.ownerContact || process.env.MARKET_WHATSAPP_NUMBER;
            if (!vendorPhone) {
                throw new Error('Market contact not configured');
            }
            return await processGroceryOrder(orderId, userId, customerName, customerPhone, args, marketDoc.id, marketData, vendorPhone);
        }
        catch (err) {
            console.error("🔴 [OrderSupplies] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to process order'
            };
        }
    },
    // Service request dispatcher (Plumber/Electrician/etc)
    requestService: async (args, userId) => {
        console.log("🔧 [RequestService] New request:", args);
        try {
            // Get user profile for contact info if not provided
            let customerPhone = args.contactPhone || '';
            let customerName = args.customerName || 'Guest';
            if (userId && !customerPhone) {
                const userSnap = await firebase_1.db.collection('users').doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    customerPhone = (userData === null || userData === void 0 ? void 0 : userData.phone) || (userData === null || userData === void 0 ? void 0 : userData.email) || '';
                    customerName = (userData === null || userData === void 0 ? void 0 : userData.displayName) || customerName;
                }
            }
            if (!customerPhone) {
                throw new Error('Customer phone number is required');
            }
            const requestId = `SVC-${Date.now()}`;
            // Find a Service provider (domain: 'Services', subCategory: serviceType)
            const providersSnap = await firebase_1.db.collection('listings')
                .where('domain', '==', 'Services')
                .where('subCategory', '==', args.serviceType)
                .limit(1)
                .get();
            if (providersSnap.empty) {
                // Fallback: any service provider
                const altSnap = await firebase_1.db.collection('listings')
                    .where('domain', '==', 'Services')
                    .limit(1)
                    .get();
                if (altSnap.empty) {
                    throw new Error(`No ${args.serviceType} providers available. Please try again later.`);
                }
                const providerDoc = altSnap.docs[0];
                const providerData = providerDoc.data();
                const providerPhone = providerData.agentPhone || providerData.ownerContact || process.env.SERVICE_WHATSAPP_NUMBER;
                if (!providerPhone) {
                    throw new Error('Service provider contact not configured');
                }
                return await processServiceRequest(requestId, userId, customerName, customerPhone, args, providerDoc.id, providerData, providerPhone);
            }
            const providerDoc = providersSnap.docs[0];
            const providerData = providerDoc.data();
            const providerPhone = providerData.agentPhone || providerData.ownerContact || process.env.SERVICE_WHATSAPP_NUMBER;
            if (!providerPhone) {
                throw new Error('Service provider contact not configured');
            }
            return await processServiceRequest(requestId, userId, customerName, customerPhone, args, providerDoc.id, providerData, providerPhone);
        }
        catch (err) {
            console.error("🔴 [RequestService] Failed:", err);
            return {
                success: false,
                error: err.message || 'Failed to request service'
            };
        }
    }
};
// Helper function to process grocery orders
async function processGroceryOrder(orderId, userId, customerName, customerPhone, args, marketId, marketData, vendorPhone) {
    // Save order to database
    await firebase_1.db.collection('groceryOrders').doc(orderId).set({
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
    const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('./twilio.service')));
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
async function processServiceRequest(requestId, userId, customerName, customerPhone, args, providerId, providerData, providerPhone) {
    // Save request to database
    await firebase_1.db.collection('serviceRequests').doc(requestId).set({
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
    const { sendWhatsApp } = await Promise.resolve().then(() => __importStar(require('./twilio.service')));
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
//# sourceMappingURL=toolService.js.map