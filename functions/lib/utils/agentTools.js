"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_TOOL_DEFINITIONS = exports.createConsumerRequestTool = exports.dispatchTaxiTool = exports.sendWhatsAppMessageTool = exports.getRealTimeInfoTool = exports.consultEncyclopediaTool = exports.initiateBookingTool = exports.searchMarketplaceTool = void 0;
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
exports.dispatchTaxiTool = {
    name: 'dispatchTaxi',
    description: 'Dispatch a taxi to a location.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            pickupLocation: { type: generative_ai_1.SchemaType.STRING },
            destination: { type: generative_ai_1.SchemaType.STRING }
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
exports.ALL_TOOL_DEFINITIONS = [
    exports.searchMarketplaceTool,
    exports.initiateBookingTool,
    exports.consultEncyclopediaTool,
    exports.getRealTimeInfoTool,
    exports.sendWhatsAppMessageTool,
    exports.dispatchTaxiTool,
    exports.createConsumerRequestTool
];
//# sourceMappingURL=agentTools.js.map