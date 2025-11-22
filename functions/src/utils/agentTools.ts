import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const searchMarketplaceTool: FunctionDeclaration = {
    name: 'searchMarketplace',
    description: 'Search the database for Real Estate, Cars, Services, etc. Returns full details including amenities.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            domain: {
                type: SchemaType.STRING,
                description: 'The domain: "Real Estate", "Cars", "Services", "Restaurants", "Events".',
            },
            subCategory: {
                type: SchemaType.STRING,
                description: 'Filter by specific type: "sale", "short-term", "long-term", "project", "rental" (cars).',
            },
            location: {
                type: SchemaType.STRING,
                description: 'Location filter (e.g., "Kyrenia", "Famagusta").',
            },
            query: {
                type: SchemaType.STRING,
                description: 'Keywords to match against title or tags.',
            },
            minPrice: {
                type: SchemaType.NUMBER,
                description: 'Minimum price filter.',
            },
            maxPrice: {
                type: SchemaType.NUMBER,
                description: 'Maximum price filter. Use this for "affordable" or "budget" queries.',
            },
            amenities: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: 'List of required amenities (e.g., ["Pool", "Wifi", "Gym"]).',
            },
            sortBy: {
                type: SchemaType.STRING,
                description: 'Sorting order. Options: "price_asc" (Cheapest), "price_desc" (Expensive), "rating" (Top Rated).',
            }
        },
        required: ['domain']
    },
};

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

export const dispatchTaxiTool: FunctionDeclaration = {
    name: 'dispatchTaxi',
    description: 'Dispatch a taxi to a location.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            pickupLocation: { type: SchemaType.STRING },
            destination: { type: SchemaType.STRING }
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

export const ALL_TOOL_DEFINITIONS = [
    searchMarketplaceTool,
    initiateBookingTool,
    consultEncyclopediaTool,
    getRealTimeInfoTool,
    sendWhatsAppMessageTool,
    dispatchTaxiTool,
    createConsumerRequestTool
];
