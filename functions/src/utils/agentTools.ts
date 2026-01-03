import { FunctionDeclaration, SchemaType } from "@google/generative-ai";


export const initiateBookingTool: FunctionDeclaration = {
    name: 'initiateBooking',
    description: 'Finalize a booking or viewing request. Only call after collecting required details.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            itemId: { type: SchemaType.STRING },
            flowType: {
                type: SchemaType.STRING,
                description: "STRICTLY: 'short_term_rental' (Holiday/Cars - Requires Payment) OR 'long_term_viewing' (Long Term/Sales - Requires Agent Appointment)."
            },
            customerName: { type: SchemaType.STRING, description: "Full name of the customer." },
            customerContact: { type: SchemaType.STRING, description: "Email or WhatsApp number." },

            // Short Term Specifics
            checkInDate: { type: SchemaType.STRING, description: "For Short Term/Cars: Start Date" },
            checkOutDate: { type: SchemaType.STRING, description: "For Short Term/Cars: End Date" },

            // Long Term Specifics
            viewingSlot: { type: SchemaType.STRING, description: "For Long Term/Sales: Requested Date/Time to view property." },

            // General
            specialRequests: { type: SchemaType.STRING, description: "Any specific needs, allergies, or questions." },
            needsPickup: { type: SchemaType.BOOLEAN, description: "True if they requested an airport transfer or taxi." }
        },
        required: ['itemId', 'flowType', 'customerName', 'customerContact']
    },
};

export const consultEncyclopediaTool: FunctionDeclaration = {
    name: 'consultEncyclopedia',
    description: 'Get answers about local laws, residency, utilities, and culture.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            query: { type: SchemaType.STRING, description: 'The topic to look up.' }
        },
        required: ['query']
    }
};

export const getRealTimeInfoTool: FunctionDeclaration = {
    name: 'getRealTimeInfo',
    description: 'Get current weather, exchange rates, or local news.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            category: { type: SchemaType.STRING, description: '"weather", "currency", "news"' }
        },
        required: ['category']
    }
};

export const sendWhatsAppMessageTool: FunctionDeclaration = {
    name: 'sendWhatsAppMessage',
    description: 'Send a WhatsApp summary to the user or agent.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            recipient: { type: SchemaType.STRING },
            message: { type: SchemaType.STRING }
        },
        required: ['recipient', 'message']
    }
};

export const requestTaxiTool: FunctionDeclaration = {
    name: 'requestTaxi',
    description: 'Request a taxi using the new dispatch system. Broadcasts to available drivers who can accept. Ask for human-readable locations only.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            pickupAddress: {
                type: SchemaType.STRING,
                description: 'Human-readable pickup address or landmark'
            },
            pickupDistrict: {
                type: SchemaType.STRING,
                description: 'District/area for pickup: "Girne" (Kyrenia), "Lefkosa" (Nicosia), "Famagusta", "Iskele", etc.'
            },
            pickupLat: {
                type: SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS latitude - automatically provided'
            },
            pickupLng: {
                type: SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS longitude - automatically provided'
            },
            dropoffAddress: {
                type: SchemaType.STRING,
                description: 'Human-readable destination address or landmark'
            },
            customerName: {
                type: SchemaType.STRING,
                description: 'Customer name (auto-fetched from profile if available)'
            },
            customerPhone: {
                type: SchemaType.STRING,
                description: 'Customer phone in E.164 format (auto-fetched from profile if available)'
            },
            priceEstimate: {
                type: SchemaType.NUMBER,
                description: 'OPTIONAL: Estimated price in TL'
            }
        },
        required: ['pickupAddress', 'pickupDistrict', 'dropoffAddress']
    }
};

export const dispatchTaxiTool: FunctionDeclaration = {
    name: 'dispatchTaxi',
    description: 'Dispatch a taxi to pick up the user. Sends WhatsApp message to taxi service. Ask user for location names (hotels, landmarks, areas) - NEVER ask for latitude/longitude as users don\'t understand coordinates. The system will provide GPS data automatically.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            pickupLocation: {
                type: SchemaType.STRING,
                description: 'Human-readable pickup location: hotel name, landmark, neighborhood, or "Current location". Examples: "Girne Marina", "Acapulco Resort", "Current location"'
            },
            destination: {
                type: SchemaType.STRING,
                description: 'Human-readable destination: place name, hotel, landmark, or address. Examples: "Bellapais Abbey", "Lefkosa City Center", "Near Eastern University"'
            },
            pickupLat: {
                type: SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS latitude - automatically provided by system, do not ask user'
            },
            pickupLng: {
                type: SchemaType.NUMBER,
                description: 'OPTIONAL: Pickup GPS longitude - automatically provided by system, do not ask user'
            },
            destinationLat: {
                type: SchemaType.NUMBER,
                description: 'OPTIONAL: Destination GPS latitude - automatically provided by system, do not ask user'
            },
            destinationLng: {
                type: SchemaType.NUMBER,
                description: 'OPTIONAL: Destination GPS longitude - automatically provided by system, do not ask user'
            },
            pickupTime: {
                type: SchemaType.STRING,
                description: 'Requested pickup time (e.g., "now", "in 30 minutes", "tomorrow 9am")'
            },
            customerName: {
                type: SchemaType.STRING,
                description: 'Customer name (will be fetched automatically from user profile if not provided)'
            },
            customerContact: {
                type: SchemaType.STRING,
                description: 'Customer phone number or WhatsApp number (will be fetched automatically from user profile if not provided)'
            },
            notes: {
                type: SchemaType.STRING,
                description: 'Additional notes or special requirements (e.g., "large luggage", "wheelchair accessible")'
            }
        },
        required: ['pickupLocation']
    }
};

export const createConsumerRequestTool: FunctionDeclaration = {
    name: 'createConsumerRequest',
    description: 'Create a general request for items not found in the marketplace.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            requestDetails: { type: SchemaType.STRING },
            contactInfo: { type: SchemaType.STRING }
        },
        required: ['requestDetails', 'contactInfo']
    }
};

export const createPaymentIntentTool: FunctionDeclaration = {
    name: 'createPaymentIntent',
    description: 'Create a payment intent for a booking (card or crypto). Call only after a short-term booking is created and the user confirms pay-now.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            bookingId: { type: SchemaType.STRING, description: "Booking ID to pay for." },
            channel: { type: SchemaType.STRING, description: "Payment channel: 'card' or 'crypto'." }
        },
        required: ['bookingId']
    }
};

export const scheduleViewingTool: FunctionDeclaration = {
    name: 'scheduleViewing',
    description: 'Create a viewing request for a long-term or for-sale listing and notify the owner/agent.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            listingId: { type: SchemaType.STRING },
            customerName: { type: SchemaType.STRING },
            customerContact: { type: SchemaType.STRING, description: "Email or WhatsApp number for the prospect." },
            preferredSlot: { type: SchemaType.STRING, description: "Requested date/time window." },
            notes: { type: SchemaType.STRING, description: "Extra details or requirements." }
        },
        required: ['listingId', 'customerName', 'customerContact']
    }
};

export const searchLocalPlacesTool: FunctionDeclaration = {
    name: 'searchLocalPlaces',
    description: 'Search local places like restaurants, nightlife, beaches, cafes, experiences.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            domain: { type: SchemaType.STRING, description: 'Category of place: restaurants, nightlife, beaches, cafes, experiences, shops.' },
            location: { type: SchemaType.STRING, description: 'City/area to search in.' },
            query: { type: SchemaType.STRING, description: 'Free-text keywords.' },
            sortBy: { type: SchemaType.STRING, description: 'Sorting order: price_asc, price_desc, rating.' }
        },
        required: ['domain']
    }
};

export const searchEventsTool: FunctionDeclaration = {
    name: 'searchEvents',
    description: 'Search events and happenings.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            location: { type: SchemaType.STRING, description: 'City/area to search in.' },
            query: { type: SchemaType.STRING, description: 'Keywords for the event.' },
            dateRange: { type: SchemaType.STRING, description: 'Optional date range filter.' }
        }
    }
};

export const getUserProfileTool: FunctionDeclaration = {
    name: 'getUserProfile',
    description: 'Fetch the current user profile to personalize responses.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {}
    }
};

export const updateUserProfileTool: FunctionDeclaration = {
    name: 'updateUserProfile',
    description: 'Update user profile/preferences (persona, interests, budget, location).',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            persona: { type: SchemaType.STRING },
            interests: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            budget: { type: SchemaType.NUMBER },
            location: { type: SchemaType.STRING }
        }
    }
};

export const saveFavoriteItemTool: FunctionDeclaration = {
    name: 'saveFavoriteItem',
    description: 'Save an item (listing/place/event) to user favorites.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            itemId: { type: SchemaType.STRING },
            title: { type: SchemaType.STRING },
            domain: { type: SchemaType.STRING }
        },
        required: ['itemId', 'title']
    }
};

export const listFavoritesTool: FunctionDeclaration = {
    name: 'listFavorites',
    description: 'List user favorites to reuse context.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {}
    }
};

export const createTribeTool: FunctionDeclaration = {
    name: 'createTribe',
    description: 'Create a new tribe/community.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            name: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
        },
        required: ['name']
    }
};

export const joinTribeTool: FunctionDeclaration = {
    name: 'joinTribe',
    description: 'Join a tribe by ID.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            tribeId: { type: SchemaType.STRING }
        },
        required: ['tribeId']
    }
};

export const leaveTribeTool: FunctionDeclaration = {
    name: 'leaveTribe',
    description: 'Leave a tribe by ID.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            tribeId: { type: SchemaType.STRING }
        },
        required: ['tribeId']
    }
};

export const postToTribeTool: FunctionDeclaration = {
    name: 'postToTribe',
    description: 'Create a post inside a tribe.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            tribeId: { type: SchemaType.STRING },
            content: { type: SchemaType.STRING },
            mediaUrl: { type: SchemaType.STRING }
        },
        required: ['tribeId', 'content']
    }
};

export const listTribeMessagesTool: FunctionDeclaration = {
    name: 'listTribeMessages',
    description: 'List recent posts/messages in a tribe.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            tribeId: { type: SchemaType.STRING },
            limit: { type: SchemaType.NUMBER }
        },
        required: ['tribeId']
    }
};

export const getTribeInfoTool: FunctionDeclaration = {
    name: 'getTribeInfo',
    description: 'Get tribe details.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            tribeId: { type: SchemaType.STRING }
        },
        required: ['tribeId']
    }
};

export const listTrendingTribesTool: FunctionDeclaration = {
    name: 'listTrendingTribes',
    description: 'List trending tribes.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            limit: { type: SchemaType.NUMBER }
        }
    }
};

export const waveUserTool: FunctionDeclaration = {
    name: 'waveUser',
    description: 'Send a wave to another user.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            targetUserId: { type: SchemaType.STRING }
        },
        required: ['targetUserId']
    }
};

export const acceptWaveTool: FunctionDeclaration = {
    name: 'acceptWave',
    description: 'Accept a wave request.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            waveId: { type: SchemaType.STRING }
        },
        required: ['waveId']
    }
};

export const listNearbyUsersTool: FunctionDeclaration = {
    name: 'listNearbyUsers',
    description: 'List nearby users for social discovery.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            location: { type: SchemaType.STRING }
        }
    }
};

export const checkInToPlaceTool: FunctionDeclaration = {
    name: 'checkInToPlace',
    description: 'Create a check-in to a place.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            placeId: { type: SchemaType.STRING },
            placeName: { type: SchemaType.STRING },
            location: { type: SchemaType.STRING }
        },
        required: ['placeId', 'placeName']
    }
};

export const getCheckInsForPlaceTool: FunctionDeclaration = {
    name: 'getCheckInsForPlace',
    description: 'Fetch recent check-ins for a place.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            placeId: { type: SchemaType.STRING },
            limit: { type: SchemaType.NUMBER }
        },
        required: ['placeId']
    }
};

export const fetchVibeMapDataTool: FunctionDeclaration = {
    name: 'fetchVibeMapData',
    description: 'Fetch vibe map data for areas.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            area: { type: SchemaType.STRING }
        }
    }
};

export const createItineraryTool: FunctionDeclaration = {
    name: 'createItinerary',
    description: 'Create a new itinerary/plan.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            title: { type: SchemaType.STRING }
        },
        required: ['title']
    }
};

export const addToItineraryTool: FunctionDeclaration = {
    name: 'addToItinerary',
    description: 'Add an item to an itinerary.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            itineraryId: { type: SchemaType.STRING },
            itemId: { type: SchemaType.STRING },
            title: { type: SchemaType.STRING },
            day: { type: SchemaType.NUMBER }
        },
        required: ['itineraryId', 'itemId', 'title']
    }
};

export const removeFromItineraryTool: FunctionDeclaration = {
    name: 'removeFromItinerary',
    description: 'Remove an item from an itinerary.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            itineraryId: { type: SchemaType.STRING },
            itemId: { type: SchemaType.STRING }
        },
        required: ['itineraryId', 'itemId']
    }
};

export const getItineraryTool: FunctionDeclaration = {
    name: 'getItinerary',
    description: 'Fetch itinerary details.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            itineraryId: { type: SchemaType.STRING }
        },
        required: ['itineraryId']
    }
};

export const saveItineraryTool: FunctionDeclaration = {
    name: 'saveItinerary',
    description: 'Save itinerary changes.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            itineraryId: { type: SchemaType.STRING }
        },
        required: ['itineraryId']
    }
};

export const updateBusinessInfoTool: FunctionDeclaration = {
    name: 'updateBusinessInfo',
    description: 'Update business profile info.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            businessId: { type: SchemaType.STRING },
            name: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            phone: { type: SchemaType.STRING }
        },
        required: ['businessId']
    }
};

export const updateBusinessAvailabilityTool: FunctionDeclaration = {
    name: 'updateBusinessAvailability',
    description: 'Update availability/slots for a business.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            businessId: { type: SchemaType.STRING },
            availability: { type: SchemaType.STRING }
        },
        required: ['businessId']
    }
};

export const updateBusinessHoursTool: FunctionDeclaration = {
    name: 'updateBusinessHours',
    description: 'Update opening hours.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            businessId: { type: SchemaType.STRING },
            hours: { type: SchemaType.STRING }
        },
        required: ['businessId']
    }
};

export const uploadBusinessMediaTool: FunctionDeclaration = {
    name: 'uploadBusinessMedia',
    description: 'Save media references for a business.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            businessId: { type: SchemaType.STRING },
            mediaUrl: { type: SchemaType.STRING }
        },
        required: ['businessId', 'mediaUrl']
    }
};

export const listBusinessLeadsTool: FunctionDeclaration = {
    name: 'listBusinessLeads',
    description: 'List recent leads for a business.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            businessId: { type: SchemaType.STRING }
        },
        required: ['businessId']
    }
};

export const respondToLeadTool: FunctionDeclaration = {
    name: 'respondToLead',
    description: 'Respond to a lead for a business.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            businessId: { type: SchemaType.STRING },
            leadId: { type: SchemaType.STRING },
            message: { type: SchemaType.STRING }
        },
        required: ['businessId', 'leadId', 'message']
    }
};

export const sendAppNotificationTool: FunctionDeclaration = {
    name: 'sendAppNotification',
    description: 'Send an in-app notification.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            userId: { type: SchemaType.STRING },
            message: { type: SchemaType.STRING }
        },
        required: ['userId', 'message']
    }
};

export const sendEmailNotificationTool: FunctionDeclaration = {
    name: 'sendEmailNotification',
    description: 'Send an email notification.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            email: { type: SchemaType.STRING },
            subject: { type: SchemaType.STRING },
            message: { type: SchemaType.STRING }
        },
        required: ['email', 'subject', 'message']
    }
};

export const getNearbyPlacesTool: FunctionDeclaration = {
    name: 'getNearbyPlaces',
    description: 'Find nearby places using geo lookup.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            location: { type: SchemaType.STRING },
            domain: { type: SchemaType.STRING }
        },
        required: ['location']
    }
};

export const computeDistanceTool: FunctionDeclaration = {
    name: 'computeDistance',
    description: 'Compute distance between two points.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            from: { type: SchemaType.STRING },
            to: { type: SchemaType.STRING }
        },
        required: ['from', 'to']
    }
};

export const fetchHotspotsTool: FunctionDeclaration = {
    name: 'fetchHotspots',
    description: 'Fetch popular hotspots for a domain/area.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            area: { type: SchemaType.STRING },
            domain: { type: SchemaType.STRING }
        }
    }
};

export const getAreaInfoTool: FunctionDeclaration = {
    name: 'getAreaInfo',
    description: 'Get summary info about an area.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            area: { type: SchemaType.STRING }
        },
        required: ['area']
    }
};

export const orderHouseholdSuppliesTool: FunctionDeclaration = {
    name: 'orderHouseholdSupplies',
    description: 'Order essential household items (water, gas, groceries, bread, milk) from local markets. This is a message-to-market dispatcher - sends request directly to vendors via WhatsApp.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            items: {
                type: SchemaType.STRING,
                description: 'List of items to order, e.g., "2 water bottles, 1 gas cylinder, bread, milk"'
            },
            deliveryAddress: {
                type: SchemaType.STRING,
                description: 'Full delivery address or location'
            },
            contactPhone: {
                type: SchemaType.STRING,
                description: 'Customer contact phone (will be auto-fetched from profile if not provided)'
            },
            customerName: {
                type: SchemaType.STRING,
                description: 'Customer name (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: SchemaType.STRING,
                description: 'Additional instructions or special requirements'
            }
        },
        required: ['items', 'deliveryAddress']
    }
};

export const requestServiceTool: FunctionDeclaration = {
    name: 'requestService',
    description: 'Request a service professional (plumber, electrician, cleaner, AC technician, handyman). Sends job lead to available providers.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            serviceType: {
                type: SchemaType.STRING,
                description: 'Type of service needed: plumber, electrician, cleaner, ac_tech, handyman, painter, gardener'
            },
            description: {
                type: SchemaType.STRING,
                description: 'Brief description of the problem or work needed'
            },
            urgency: {
                type: SchemaType.STRING,
                description: 'How urgent is the service: emergency, today, this_week, flexible'
            },
            location: {
                type: SchemaType.STRING,
                description: 'Location where service is needed'
            },
            contactPhone: {
                type: SchemaType.STRING,
                description: 'Customer contact phone (will be auto-fetched from profile if not provided)'
            },
            customerName: {
                type: SchemaType.STRING,
                description: 'Customer name (will be auto-fetched from profile if not provided)'
            }
        },
        required: ['serviceType', 'description', 'location']
    }
};

export const ALL_TOOL_DEFINITIONS = [
    initiateBookingTool,
    consultEncyclopediaTool,
    getRealTimeInfoTool,
    sendWhatsAppMessageTool,
    requestTaxiTool,
    dispatchTaxiTool,
    createConsumerRequestTool,
    createPaymentIntentTool,
    scheduleViewingTool,
    searchLocalPlacesTool,
    searchEventsTool,
    getUserProfileTool,
    updateUserProfileTool,
    saveFavoriteItemTool,
    listFavoritesTool,
    createTribeTool,
    joinTribeTool,
    leaveTribeTool,
    postToTribeTool,
    listTribeMessagesTool,
    getTribeInfoTool,
    listTrendingTribesTool,
    waveUserTool,
    acceptWaveTool,
    listNearbyUsersTool,
    checkInToPlaceTool,
    getCheckInsForPlaceTool,
    fetchVibeMapDataTool,
    createItineraryTool,
    addToItineraryTool,
    removeFromItineraryTool,
    getItineraryTool,
    saveItineraryTool,
    updateBusinessInfoTool,
    updateBusinessAvailabilityTool,
    updateBusinessHoursTool,
    uploadBusinessMediaTool,
    listBusinessLeadsTool,
    respondToLeadTool,
    sendAppNotificationTool,
    sendEmailNotificationTool,
    getNearbyPlacesTool,
    computeDistanceTool,
    fetchHotspotsTool,
    getAreaInfoTool,
    orderHouseholdSuppliesTool,
    requestServiceTool
];
