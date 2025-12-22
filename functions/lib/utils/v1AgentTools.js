"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V1_AGENT_TOOLS = exports.createServiceRequestTool = exports.createCarRentalRequestTool = exports.searchCarRentalListingsTool = exports.createHousingRequestTool = exports.searchHousingListingsTool = exports.searchActivitiesTool = exports.searchPlacesTool = void 0;
/**
 * V1 Agent Tools
 * Chat agent tools using V1 data models and repositories
 */
const generative_ai_1 = require("@google/generative-ai");
// ============================================================================
// PLACES & DISCOVERY
// ============================================================================
exports.searchPlacesTool = {
    name: 'searchPlaces',
    description: 'Search for venues and places in North Cyprus (restaurants, cafes, bars, nightlife, sights, co-working spaces, etc.). Use this to help users discover places to eat, drink, visit, or work.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            category: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Place category: "food", "nightlife", "sight", "cafe", "co_working", "shopping", "service", "housing_project", "other"'
            },
            areaName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Filter by area/district (e.g., "Girne", "Famagusta", "Nicosia", "Bellapais")'
            },
            tags: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: 'Filter by tags (e.g., ["turkish", "seafood", "student-friendly", "romantic", "views"])'
            },
            featured: {
                type: generative_ai_1.SchemaType.BOOLEAN,
                description: 'Set to true to only show featured/recommended places'
            }
        },
        required: []
    }
};
exports.searchActivitiesTool = {
    name: 'searchActivities',
    description: 'Search for events and activities happening in North Cyprus. Use this for weekend planning, finding events, concerts, parties, sports events, cultural activities.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            category: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Activity category: "nightlife", "social", "sport", "culture", "food", "other"'
            },
            when: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Time filter: "upcoming", "this_weekend", "today", "this_week"'
            },
            placeId: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Filter activities at a specific place/venue'
            }
        },
        required: []
    }
};
// ============================================================================
// HOUSING
// ============================================================================
exports.searchHousingListingsTool = {
    name: 'searchHousingListings',
    description: 'Search for housing listings (apartments, villas, rooms, studios) available for rent in North Cyprus.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            housingType: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Type of housing: "apartment", "villa", "room", "studio"'
            },
            bedrooms: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Number of bedrooms required'
            },
            minPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Minimum monthly rent in TRY'
            },
            maxPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Maximum monthly rent in TRY (use this for "affordable" or "budget" queries)'
            },
            areaName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Preferred area/district'
            },
            furnished: {
                type: generative_ai_1.SchemaType.BOOLEAN,
                description: 'Filter for furnished/unfurnished housing'
            }
        },
        required: []
    }
};
exports.createHousingRequestTool = {
    name: 'createHousingRequest',
    description: 'Create a housing request when user can\'t find what they need or wants personalized help finding housing. This creates a lead that will be followed up by housing agents.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Detailed description of housing requirements'
            },
            bedrooms: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Number of bedrooms needed'
            },
            budgetMin: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Minimum budget in TRY'
            },
            budgetMax: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Maximum budget in TRY'
            },
            areaName: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Preferred area/district'
            },
            moveInDate: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Desired move-in date or timeframe'
            },
            contactPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Contact phone number (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Additional requirements or preferences'
            }
        },
        required: ['description']
    }
};
// ============================================================================
// CAR RENTAL
// ============================================================================
exports.searchCarRentalListingsTool = {
    name: 'searchCarRentalListings',
    description: 'Search for available car rentals in North Cyprus.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            carType: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Type of car: "small", "sedan", "SUV", "van", "other"'
            },
            transmission: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Transmission preference: "manual", "automatic"'
            },
            minSeats: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Minimum number of seats needed'
            },
            minPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Minimum daily rate in TRY'
            },
            maxPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Maximum daily rate in TRY'
            }
        },
        required: []
    }
};
exports.createCarRentalRequestTool = {
    name: 'createCarRentalRequest',
    description: 'Create a car rental request when user needs help finding a car or has specific requirements. This creates a lead for car rental providers.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Description of car rental needs'
            },
            carType: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Preferred car type'
            },
            rentalDays: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Number of days needed'
            },
            fromDate: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Rental start date'
            },
            toDate: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Rental end date'
            },
            contactPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Contact phone number (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Additional requirements (insurance, pickup location, etc.)'
            }
        },
        required: ['description']
    }
};
// ============================================================================
// SERVICES & SUPPLIES
// ============================================================================
exports.createServiceRequestTool = {
    name: 'createServiceRequest',
    description: 'Create a general service request for water/gas delivery, groceries, repairs, or any other service needs. This is the catch-all for anything the user needs that isn\'t handled by specific tools.',
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            category: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Request category: "WATER_GAS", "GROCERIES", "OTHER"'
            },
            title: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Short title of the request (e.g., "Water delivery", "Grocery shopping")'
            },
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Detailed description of what is needed'
            },
            when: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'When it\'s needed: "now", "today", "this_weekend"'
            },
            location: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Delivery or service location'
            },
            quantity: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: 'Quantity if applicable (e.g., number of water bottles)'
            },
            contactPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Contact phone number (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'Additional notes or special instructions'
            }
        },
        required: ['category', 'title', 'description']
    }
};
// ============================================================================
// TOOL COLLECTION
// ============================================================================
exports.V1_AGENT_TOOLS = [
    exports.searchPlacesTool,
    exports.searchActivitiesTool,
    exports.searchHousingListingsTool,
    exports.createHousingRequestTool,
    exports.searchCarRentalListingsTool,
    exports.createCarRentalRequestTool,
    exports.createServiceRequestTool
];
//# sourceMappingURL=v1AgentTools.js.map