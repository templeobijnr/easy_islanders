"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServiceRequestToolDef = exports.searchHousingListingsToolDef = exports.requestServiceTool = exports.orderHouseholdSuppliesTool = exports.getAreaInfoTool = exports.fetchHotspotsTool = exports.computeDistanceTool = exports.getNearbyPlacesTool = exports.sendEmailNotificationTool = exports.sendAppNotificationTool = exports.respondToLeadTool = exports.listBusinessLeadsTool = exports.uploadBusinessMediaTool = exports.updateBusinessHoursTool = exports.updateBusinessAvailabilityTool = exports.updateBusinessInfoTool = exports.saveItineraryTool = exports.getItineraryTool = exports.removeFromItineraryTool = exports.addToItineraryTool = exports.createItineraryTool = exports.fetchVibeMapDataTool = exports.getCheckInsForPlaceTool = exports.checkInToPlaceTool = exports.listNearbyUsersTool = exports.acceptWaveTool = exports.waveUserTool = exports.listTrendingTribesTool = exports.getTribeInfoTool = exports.listTribeMessagesTool = exports.postToTribeTool = exports.leaveTribeTool = exports.joinTribeTool = exports.createTribeTool = exports.listFavoritesTool = exports.saveFavoriteItemTool = exports.updateUserProfileTool = exports.getUserProfileTool = exports.searchEventsTool = exports.searchLocalPlacesTool = exports.scheduleViewingTool = exports.createPaymentIntentTool = exports.createConsumerRequestTool = exports.dispatchTaxiTool = exports.requestTaxiTool = exports.sendWhatsAppMessageTool = exports.getRealTimeInfoTool = exports.consultEncyclopediaTool = exports.initiateBookingTool = exports.searchMarketplaceTool = void 0;
exports.ALL_TOOL_DEFINITIONS = exports.showDirectionsToolDef = exports.getExchangeRateToolDef = exports.getNewsToolDef = exports.findPharmacyToolDef = exports.bookServiceToolDef = exports.orderFoodToolDef = exports.searchRestaurantsToolDef = exports.searchPlacesToolDef = exports.createOrderToolDef = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.searchMarketplaceTool = {
    name: 'searchMarketplace',
    description: 'Search the database for Real Estate, Cars, Services, etc. Returns full details including amenities.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            domain: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'The domain: "Real Estate", "Cars", "Services", "Restaurants", "Events".',
            },
            subCategory: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Filter by specific type: "sale", "short-term", "long-term", "project", "rental" (cars).',
            },
            location: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Location filter (e.g., "Kyrenia", "Famagusta").',
            },
            query: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Keywords to match against title or tags.',
            },
            minPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Minimum price filter.',
            },
            maxPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Maximum price filter. Use this for "affordable" or "budget" queries.',
            },
            amenities: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: 'List of required amenities (e.g., ["Pool", "Wifi", "Gym"]).',
            },
            sortBy: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Sorting order. Options: "price_asc" (Cheapest), "price_desc" (Expensive), "rating" (Top Rated).',
            }
        },
        required: ['domain']
    },
};
exports.initiateBookingTool = {
    name: 'initiateBooking',
    description: 'Finalize a booking or viewing request. Only call after collecting required details.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itemId: { type: generative_ai_1.SchemaType.STRING },
            flowType: {
                type: generative_ai_1.SchemaType.STRING,
                description: "STRICTLY: 'short_term_rental' (Holiday/Cars - Requires Payment) OR 'long_term_viewing' (Long Term/Sales - Requires Agent Appointment)."
            },
            customerName: { type: generative_ai_1.SchemaType.STRING, description: "Full name of the customer." },
            customerContact: { type: generative_ai_1.SchemaType.STRING, description: "Email or WhatsApp number." },
            // Short Term Specifics
            checkInDate: { type: generative_ai_1.SchemaType.STRING, description: "For Short Term/Cars: Start Date" },
            checkOutDate: { type: generative_ai_1.SchemaType.STRING, description: "For Short Term/Cars: End Date" },
            // Long Term Specifics
            viewingSlot: { type: generative_ai_1.SchemaType.STRING, description: "For Long Term/Sales: Requested Date/Time to view property." },
            // General
            specialRequests: { type: generative_ai_1.SchemaType.STRING, description: "Any specific needs, allergies, or questions." },
            needsPickup: { type: generative_ai_1.SchemaType.BOOLEAN, description: "True if they requested an airport transfer or taxi." }
        },
        required: ['itemId', 'flowType', 'customerName', 'customerContact']
    },
};
exports.consultEncyclopediaTool = {
    name: 'consultEncyclopedia',
    description: 'Get answers about local laws, residency, utilities, and culture.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            query: { type: generative_ai_1.SchemaType.STRING, description: 'The topic to look up.' }
        },
        required: ['query']
    }
};
exports.getRealTimeInfoTool = {
    name: 'getRealTimeInfo',
    description: 'Get current weather, exchange rates, or local news.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            category: { type: generative_ai_1.SchemaType.STRING, description: '"weather", "currency", "news"' }
        },
        required: ['category']
    }
};
exports.sendWhatsAppMessageTool = {
    name: 'sendWhatsAppMessage',
    description: 'Send a WhatsApp summary to the user or agent.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            recipient: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['recipient', 'message']
    }
};
exports.requestTaxiTool = {
    name: 'requestTaxi',
    description: 'Request a taxi using the new dispatch system. Broadcasts to available drivers who can accept. Ask for human-readable locations only.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            pickupAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Human-readable pickup address or landmark'
            },
            pickupDistrict: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'District/area for pickup: "Girne" (Kyrenia), "Lefkosa" (Nicosia), "Famagusta", "Iskele", etc.'
            },
            pickupLat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS latitude - automatically provided'
            },
            pickupLng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS longitude - automatically provided'
            },
            dropoffAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Human-readable destination address or landmark'
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer name (auto-fetched from profile if available)'
            },
            customerPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer phone in E.164 format (auto-fetched from profile if available)'
            },
            priceEstimate: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'OPTIONAL: Estimated price in TL'
            }
        },
        required: ['pickupAddress', 'pickupDistrict', 'dropoffAddress']
    }
};
exports.dispatchTaxiTool = {
    name: 'dispatchTaxi',
    description: 'Dispatch a taxi to pick up the user. Sends WhatsApp message to taxi service. Ask user for location names (hotels, landmarks, areas) - NEVER ask for latitude/longitude as users don\'t understand coordinates. The system will provide GPS data automatically.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            pickupLocation: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Human-readable pickup location: hotel name, landmark, neighborhood, or "Current location". Examples: "Girne Marina", "Acapulco Resort", "Current location"'
            },
            destination: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Human-readable destination: place name, hotel, landmark, or address. Examples: "Bellapais Abbey", "Lefkosa City Center", "Near Eastern University"'
            },
            pickupLat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS latitude - automatically provided by system, do not ask user'
            },
            pickupLng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS longitude - automatically provided by system, do not ask user'
            },
            destinationLat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'OPTIONAL: Destination GPS latitude - automatically provided by system, do not ask user'
            },
            destinationLng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'OPTIONAL: Destination GPS longitude - automatically provided by system, do not ask user'
            },
            pickupTime: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Requested pickup time (e.g., "now", "in 30 minutes", "tomorrow 9am")'
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer name (will be fetched automatically from user profile if not provided)'
            },
            customerContact: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer phone number or WhatsApp number (will be fetched automatically from user profile if not provided)'
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Additional notes or special requirements (e.g., "large luggage", "wheelchair accessible")'
            }
        },
        required: ['pickupLocation']
    }
};
exports.createConsumerRequestTool = {
    name: 'createConsumerRequest',
    description: 'Create a general request for items not found in the marketplace.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            requestDetails: { type: generative_ai_1.SchemaType.STRING },
            contactInfo: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['requestDetails', 'contactInfo']
    }
};
exports.createPaymentIntentTool = {
    name: 'createPaymentIntent',
    description: 'Create a payment intent for a booking (card or crypto). Call only after a short-term booking is created and the user confirms pay-now.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            bookingId: { type: generative_ai_1.SchemaType.STRING, description: "Booking ID to pay for." },
            channel: { type: generative_ai_1.SchemaType.STRING, description: "Payment channel: 'card' or 'crypto'." }
        },
        required: ['bookingId']
    }
};
exports.scheduleViewingTool = {
    name: 'scheduleViewing',
    description: 'Create a viewing request for a long-term or for-sale listing and notify the owner/agent.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            listingId: { type: generative_ai_1.SchemaType.STRING },
            customerName: { type: generative_ai_1.SchemaType.STRING },
            customerContact: { type: generative_ai_1.SchemaType.STRING, description: "Email or WhatsApp number for the prospect." },
            preferredSlot: { type: generative_ai_1.SchemaType.STRING, description: "Requested date/time window." },
            notes: { type: generative_ai_1.SchemaType.STRING, description: "Extra details or requirements." }
        },
        required: ['listingId', 'customerName', 'customerContact']
    }
};
exports.searchLocalPlacesTool = {
    name: 'searchLocalPlaces',
    description: 'Search local places like restaurants, nightlife, beaches, cafes, experiences.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            domain: { type: generative_ai_1.SchemaType.STRING, description: 'Category of place: restaurants, nightlife, beaches, cafes, experiences, shops.' },
            location: { type: generative_ai_1.SchemaType.STRING, description: 'City/area to search in.' },
            query: { type: generative_ai_1.SchemaType.STRING, description: 'Free-text keywords.' },
            sortBy: { type: generative_ai_1.SchemaType.STRING, description: 'Sorting order: price_asc, price_desc, rating.' }
        },
        required: ['domain']
    }
};
exports.searchEventsTool = {
    name: 'searchEvents',
    description: 'Search events and happenings.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            location: { type: generative_ai_1.SchemaType.STRING, description: 'City/area to search in.' },
            query: { type: generative_ai_1.SchemaType.STRING, description: 'Keywords for the event.' },
            dateRange: { type: generative_ai_1.SchemaType.STRING, description: 'Optional date range filter.' }
        }
    }
};
exports.getUserProfileTool = {
    name: 'getUserProfile',
    description: 'Fetch the current user profile to personalize responses.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {}
    }
};
exports.updateUserProfileTool = {
    name: 'updateUserProfile',
    description: 'Update user profile/preferences (persona, interests, budget, location).',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            persona: { type: generative_ai_1.SchemaType.STRING },
            interests: { type: generative_ai_1.SchemaType.ARRAY, items: { type: generative_ai_1.SchemaType.STRING } },
            budget: { type: generative_ai_1.SchemaType.NUMBER },
            location: { type: generative_ai_1.SchemaType.STRING }
        }
    }
};
exports.saveFavoriteItemTool = {
    name: 'saveFavoriteItem',
    description: 'Save an item (listing/place/event) to user favorites.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itemId: { type: generative_ai_1.SchemaType.STRING },
            title: { type: generative_ai_1.SchemaType.STRING },
            domain: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['itemId', 'title']
    }
};
exports.listFavoritesTool = {
    name: 'listFavorites',
    description: 'List user favorites to reuse context.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {}
    }
};
exports.createTribeTool = {
    name: 'createTribe',
    description: 'Create a new tribe/community.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            name: { type: generative_ai_1.SchemaType.STRING },
            description: { type: generative_ai_1.SchemaType.STRING },
            tags: { type: generative_ai_1.SchemaType.ARRAY, items: { type: generative_ai_1.SchemaType.STRING } }
        },
        required: ['name']
    }
};
exports.joinTribeTool = {
    name: 'joinTribe',
    description: 'Join a tribe by ID.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['tribeId']
    }
};
exports.leaveTribeTool = {
    name: 'leaveTribe',
    description: 'Leave a tribe by ID.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['tribeId']
    }
};
exports.postToTribeTool = {
    name: 'postToTribe',
    description: 'Create a post inside a tribe.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING },
            content: { type: generative_ai_1.SchemaType.STRING },
            mediaUrl: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['tribeId', 'content']
    }
};
exports.listTribeMessagesTool = {
    name: 'listTribeMessages',
    description: 'List recent posts/messages in a tribe.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING },
            limit: { type: generative_ai_1.SchemaType.NUMBER }
        },
        required: ['tribeId']
    }
};
exports.getTribeInfoTool = {
    name: 'getTribeInfo',
    description: 'Get tribe details.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['tribeId']
    }
};
exports.listTrendingTribesTool = {
    name: 'listTrendingTribes',
    description: 'List trending tribes.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            limit: { type: generative_ai_1.SchemaType.NUMBER }
        }
    }
};
exports.waveUserTool = {
    name: 'waveUser',
    description: 'Send a wave to another user.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            targetUserId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['targetUserId']
    }
};
exports.acceptWaveTool = {
    name: 'acceptWave',
    description: 'Accept a wave request.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            waveId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['waveId']
    }
};
exports.listNearbyUsersTool = {
    name: 'listNearbyUsers',
    description: 'List nearby users for social discovery.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            location: { type: generative_ai_1.SchemaType.STRING }
        }
    }
};
exports.checkInToPlaceTool = {
    name: 'checkInToPlace',
    description: 'Create a check-in to a place.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            placeId: { type: generative_ai_1.SchemaType.STRING },
            placeName: { type: generative_ai_1.SchemaType.STRING },
            location: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['placeId', 'placeName']
    }
};
exports.getCheckInsForPlaceTool = {
    name: 'getCheckInsForPlace',
    description: 'Fetch recent check-ins for a place.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            placeId: { type: generative_ai_1.SchemaType.STRING },
            limit: { type: generative_ai_1.SchemaType.NUMBER }
        },
        required: ['placeId']
    }
};
exports.fetchVibeMapDataTool = {
    name: 'fetchVibeMapData',
    description: 'Fetch vibe map data for areas.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            area: { type: generative_ai_1.SchemaType.STRING }
        }
    }
};
exports.createItineraryTool = {
    name: 'createItinerary',
    description: 'Create a new itinerary/plan.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            title: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['title']
    }
};
exports.addToItineraryTool = {
    name: 'addToItinerary',
    description: 'Add an item to an itinerary.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING },
            itemId: { type: generative_ai_1.SchemaType.STRING },
            title: { type: generative_ai_1.SchemaType.STRING },
            day: { type: generative_ai_1.SchemaType.NUMBER }
        },
        required: ['itineraryId', 'itemId', 'title']
    }
};
exports.removeFromItineraryTool = {
    name: 'removeFromItinerary',
    description: 'Remove an item from an itinerary.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING },
            itemId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['itineraryId', 'itemId']
    }
};
exports.getItineraryTool = {
    name: 'getItinerary',
    description: 'Fetch itinerary details.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['itineraryId']
    }
};
exports.saveItineraryTool = {
    name: 'saveItinerary',
    description: 'Save itinerary changes.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['itineraryId']
    }
};
exports.updateBusinessInfoTool = {
    name: 'updateBusinessInfo',
    description: 'Update business profile info.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            name: { type: generative_ai_1.SchemaType.STRING },
            description: { type: generative_ai_1.SchemaType.STRING },
            phone: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['businessId']
    }
};
exports.updateBusinessAvailabilityTool = {
    name: 'updateBusinessAvailability',
    description: 'Update availability/slots for a business.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            availability: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['businessId']
    }
};
exports.updateBusinessHoursTool = {
    name: 'updateBusinessHours',
    description: 'Update opening hours.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            hours: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['businessId']
    }
};
exports.uploadBusinessMediaTool = {
    name: 'uploadBusinessMedia',
    description: 'Save media references for a business.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            mediaUrl: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['businessId', 'mediaUrl']
    }
};
exports.listBusinessLeadsTool = {
    name: 'listBusinessLeads',
    description: 'List recent leads for a business.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['businessId']
    }
};
exports.respondToLeadTool = {
    name: 'respondToLead',
    description: 'Respond to a lead for a business.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            leadId: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['businessId', 'leadId', 'message']
    }
};
exports.sendAppNotificationTool = {
    name: 'sendAppNotification',
    description: 'Send an in-app notification.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            userId: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['userId', 'message']
    }
};
exports.sendEmailNotificationTool = {
    name: 'sendEmailNotification',
    description: 'Send an email notification.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            email: { type: generative_ai_1.SchemaType.STRING },
            subject: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['email', 'subject', 'message']
    }
};
exports.getNearbyPlacesTool = {
    name: 'getNearbyPlaces',
    description: 'Find nearby places using geo lookup.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            location: { type: generative_ai_1.SchemaType.STRING },
            domain: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['location']
    }
};
exports.computeDistanceTool = {
    name: 'computeDistance',
    description: 'Compute distance between two points.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            from: { type: generative_ai_1.SchemaType.STRING },
            to: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['from', 'to']
    }
};
exports.fetchHotspotsTool = {
    name: 'fetchHotspots',
    description: 'Fetch popular hotspots for a domain/area.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            area: { type: generative_ai_1.SchemaType.STRING },
            domain: { type: generative_ai_1.SchemaType.STRING }
        }
    }
};
exports.getAreaInfoTool = {
    name: 'getAreaInfo',
    description: 'Get summary info about an area.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            area: { type: generative_ai_1.SchemaType.STRING }
        },
        required: ['area']
    }
};
exports.orderHouseholdSuppliesTool = {
    name: 'orderHouseholdSupplies',
    description: 'Order essential household items (water, gas, groceries, bread, milk) from local markets. This is a message-to-market dispatcher - sends request directly to vendors via WhatsApp.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            items: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'List of items to order, e.g., "2 water bottles, 1 gas cylinder, bread, milk"'
            },
            deliveryAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Full delivery address or location'
            },
            contactPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer contact phone (will be auto-fetched from profile if not provided)'
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer name (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Additional instructions or special requirements'
            }
        },
        required: ['items', 'deliveryAddress']
    }
};
exports.requestServiceTool = {
    name: 'requestService',
    description: 'Request a service professional (plumber, electrician, cleaner, AC technician, handyman). Sends job lead to available providers.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            serviceType: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Type of service needed: plumber, electrician, cleaner, ac_tech, handyman, painter, gardener'
            },
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Brief description of the problem or work needed'
            },
            urgency: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'How urgent is the service: emergency, today, this_week, flexible'
            },
            location: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Location where service is needed'
            },
            contactPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer contact phone (will be auto-fetched from profile if not provided)'
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Customer name (will be auto-fetched from profile if not provided)'
            }
        },
        required: ['serviceType', 'description', 'location']
    }
};
exports.searchHousingListingsToolDef = {
    name: 'searchHousingListings',
    description: 'Search for housing listings (apartments, studios, villas, rooms) in the current city.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            budgetMin: { type: generative_ai_1.SchemaType.NUMBER },
            budgetMax: { type: generative_ai_1.SchemaType.NUMBER },
            bedrooms: { type: generative_ai_1.SchemaType.NUMBER },
            areaName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Preferred area/neighbourhood (e.g. near GAU)',
            },
            intent: {
                type: generative_ai_1.SchemaType.STRING,
                format: 'enum',
                enum: ['rent', 'buy', 'invest'],
            },
        },
        required: [],
    },
};
exports.createServiceRequestToolDef = {
    name: 'createServiceRequest',
    description: 'Create a generic service request (wifi, cleaning, handyman, residency, etc.).',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            serviceCategory: {
                type: generative_ai_1.SchemaType.STRING,
                format: 'enum',
                enum: [
                    'HOME_PROPERTY',
                    'TECH_DIGITAL',
                    'LEGAL_ADMIN',
                    'TRANSPORT_SHOPPING',
                    'PACKAGE_DELIVERY',
                    'LIFESTYLE_CONCIERGE',
                ],
            },
            serviceSubcategory: { type: generative_ai_1.SchemaType.STRING },
            title: { type: generative_ai_1.SchemaType.STRING },
            description: { type: generative_ai_1.SchemaType.STRING },
            addressText: { type: generative_ai_1.SchemaType.STRING },
            scheduledTimeText: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ['serviceCategory', 'description'],
    },
};
exports.createOrderToolDef = {
    name: 'createOrder',
    description: 'Create an order for water, gas, or groceries to be delivered to the user.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            orderType: {
                type: generative_ai_1.SchemaType.STRING,
                format: 'enum',
                enum: ['water', 'gas', 'grocery'],
            },
            bottleSizeLiters: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'For water/gas: bottle size in liters, if known.',
            },
            quantity: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Number of bottles/packs.',
            },
            groceryItems: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: 'List of grocery items if this is a grocery order.',
            },
            addressText: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Delivery address or description of location.',
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Any extra details for the vendor.',
            },
        },
        required: ['orderType'],
    },
};
exports.searchPlacesToolDef = {
    name: 'searchPlaces',
    description: 'Search curated places (food, nightlife, sights, cafes, services) in the current city.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            category: {
                type: generative_ai_1.SchemaType.STRING,
                format: 'enum',
                enum: ['food', 'nightlife', 'sight', 'cafe', 'shopping', 'service', 'other'],
            },
            tag: { type: generative_ai_1.SchemaType.STRING },
            limit: { type: generative_ai_1.SchemaType.NUMBER },
        },
        required: [],
    },
};
// ============================================================================
// V1 CONSUMER TOOLS - Merve Personal Assistant
// ============================================================================
exports.searchRestaurantsToolDef = {
    name: 'searchRestaurants',
    description: 'Search for restaurants by cuisine type, name, or area in North Cyprus.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            cuisine: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Type of cuisine: Turkish, Kebab, Seafood, Italian, etc.',
            },
            name: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Restaurant name to search for.',
            },
            area: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Area/district: Girne, Lefkosa, Gazimagusa, etc.',
            },
        },
        required: [],
    },
};
exports.orderFoodToolDef = {
    name: 'orderFood',
    description: 'Order food from a restaurant for delivery. Creates a proposal that must be confirmed with YES.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            restaurantName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Name of the restaurant to order from.',
            },
            cuisine: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Type of cuisine if restaurant name not specified.',
            },
            area: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Area for delivery: Girne, Lefkosa, etc.',
            },
            items: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: 'Food items to order.',
            },
            quantities: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.NUMBER },
                description: 'Quantities for each item.',
            },
            deliveryAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Delivery address.',
            },
            specialInstructions: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Special requests or notes.',
            },
        },
        required: ['deliveryAddress'],
    },
};
exports.bookServiceToolDef = {
    name: 'bookService',
    description: 'Book a home service (plumber, electrician, handyman, AC technician, etc.). Creates a proposal.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            serviceType: {
                type: generative_ai_1.SchemaType.STRING,
                format: 'enum',
                enum: ['plumber', 'electrician', 'handyman', 'ac_technician', 'painter', 'gardener', 'cleaner', 'locksmith', 'pest_control', 'pool_maintenance'],
                description: 'Type of service needed.',
            },
            area: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Area: Girne, Lefkosa, etc.',
            },
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Description of the issue or work needed.',
            },
            address: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Service address.',
            },
            urgency: {
                type: generative_ai_1.SchemaType.STRING,
                format: 'enum',
                enum: ['emergency', 'today', 'this_week', 'flexible'],
            },
        },
        required: ['serviceType', 'description', 'address'],
    },
};
exports.findPharmacyToolDef = {
    name: 'findPharmacy',
    description: 'Find on-duty pharmacies for today in North Cyprus.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            district: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'District to filter: Girne, Lefkosa, Gazimagusa, etc.',
            },
        },
        required: [],
    },
};
exports.getNewsToolDef = {
    name: 'getNews',
    description: 'Get the latest news headlines from North Cyprus.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {},
        required: [],
    },
};
exports.getExchangeRateToolDef = {
    name: 'getExchangeRate',
    description: 'Get currency exchange rates (EUR, GBP, USD, TRY).',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            from: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Source currency code: EUR, GBP, USD, TRY.',
            },
            to: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Target currency code.',
            },
        },
        required: [],
    },
};
exports.showDirectionsToolDef = {
    name: 'showDirections',
    description: 'Get directions to a place (returns Google Maps link).',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            destination: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Place name or address to navigate to.',
            },
            lat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Optional latitude.',
            },
            lng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Optional longitude.',
            },
        },
        required: ['destination'],
    },
};
exports.ALL_TOOL_DEFINITIONS = [
    exports.searchMarketplaceTool,
    exports.initiateBookingTool,
    exports.consultEncyclopediaTool,
    exports.getRealTimeInfoTool,
    exports.sendWhatsAppMessageTool,
    exports.requestTaxiTool,
    exports.dispatchTaxiTool,
    exports.createConsumerRequestTool,
    exports.createPaymentIntentTool,
    exports.scheduleViewingTool,
    exports.searchLocalPlacesTool,
    exports.searchEventsTool,
    exports.getUserProfileTool,
    exports.updateUserProfileTool,
    exports.saveFavoriteItemTool,
    exports.listFavoritesTool,
    exports.createTribeTool,
    exports.joinTribeTool,
    exports.leaveTribeTool,
    exports.postToTribeTool,
    exports.listTribeMessagesTool,
    exports.getTribeInfoTool,
    exports.listTrendingTribesTool,
    exports.waveUserTool,
    exports.acceptWaveTool,
    exports.listNearbyUsersTool,
    exports.checkInToPlaceTool,
    exports.getCheckInsForPlaceTool,
    exports.fetchVibeMapDataTool,
    exports.searchHousingListingsToolDef,
    exports.createServiceRequestToolDef,
    exports.createOrderToolDef,
    exports.searchPlacesToolDef,
    exports.createItineraryTool,
    exports.addToItineraryTool,
    exports.removeFromItineraryTool,
    exports.getItineraryTool,
    exports.saveItineraryTool,
    exports.updateBusinessInfoTool,
    exports.updateBusinessAvailabilityTool,
    exports.updateBusinessHoursTool,
    exports.uploadBusinessMediaTool,
    exports.listBusinessLeadsTool,
    exports.respondToLeadTool,
    exports.sendAppNotificationTool,
    exports.sendEmailNotificationTool,
    exports.getNearbyPlacesTool,
    exports.computeDistanceTool,
    exports.fetchHotspotsTool,
    exports.getAreaInfoTool,
    exports.orderHouseholdSuppliesTool,
    exports.requestServiceTool,
    // V1 Consumer Tools
    exports.searchRestaurantsToolDef,
    exports.orderFoodToolDef,
    exports.bookServiceToolDef,
    exports.findPharmacyToolDef,
    exports.getNewsToolDef,
    exports.getExchangeRateToolDef,
    exports.showDirectionsToolDef,
];
//# sourceMappingURL=agentTools.js.map