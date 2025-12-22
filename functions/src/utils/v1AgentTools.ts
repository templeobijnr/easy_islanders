/**
 * V1 Agent Tools
 * Chat agent tools using V1 data models and repositories
 */
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

// ============================================================================
// PLACES & DISCOVERY
// ============================================================================

export const searchPlacesTool: FunctionDeclaration = {
    name: 'searchPlaces',
    description: 'Search for venues and places in North Cyprus (restaurants, cafes, bars, nightlife, sights, co-working spaces, etc.). Use this to help users discover places to eat, drink, visit, or work.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            category: {
                type: SchemaType.STRING,
                description: 'Place category: "food", "nightlife", "sight", "cafe", "co_working", "shopping", "service", "housing_project", "other"'
            },
            areaName: {
                type: SchemaType.STRING,
                description: 'Filter by area/district (e.g., "Girne", "Famagusta", "Nicosia", "Bellapais")'
            },
            tags: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                description: 'Filter by tags (e.g., ["turkish", "seafood", "student-friendly", "romantic", "views"])'
            },
            featured: {
                type: SchemaType.BOOLEAN,
                description: 'Set to true to only show featured/recommended places'
            }
        },
        required: []
    }
};

export const searchActivitiesTool: FunctionDeclaration = {
    name: 'searchActivities',
    description: 'Search for events and activities happening in North Cyprus. Use this for weekend planning, finding events, concerts, parties, sports events, cultural activities.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            category: {
                type: SchemaType.STRING,
                description: 'Activity category: "nightlife", "social", "sport", "culture", "food", "other"'
            },
            when: {
                type: SchemaType.STRING,
                description: 'Time filter: "upcoming", "this_weekend", "today", "this_week"'
            },
            placeId: {
                type: SchemaType.STRING,
                description: 'Filter activities at a specific place/venue'
            }
        },
        required: []
    }
};

// ============================================================================
// HOUSING
// ============================================================================

export const searchHousingListingsTool: FunctionDeclaration = {
    name: 'searchHousingListings',
    description: 'Search for housing listings (apartments, villas, rooms, studios) available for rent in North Cyprus.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            housingType: {
                type: SchemaType.STRING,
                description: 'Type of housing: "apartment", "villa", "room", "studio"'
            },
            bedrooms: {
                type: SchemaType.NUMBER,
                description: 'Number of bedrooms required'
            },
            minPrice: {
                type: SchemaType.NUMBER,
                description: 'Minimum monthly rent in TRY'
            },
            maxPrice: {
                type: SchemaType.NUMBER,
                description: 'Maximum monthly rent in TRY (use this for "affordable" or "budget" queries)'
            },
            areaName: {
                type: SchemaType.STRING,
                description: 'Preferred area/district'
            },
            furnished: {
                type: SchemaType.BOOLEAN,
                description: 'Filter for furnished/unfurnished housing'
            }
        },
        required: []
    }
};

export const createHousingRequestTool: FunctionDeclaration = {
    name: 'createHousingRequest',
    description: 'Create a housing request when user can\'t find what they need or wants personalized help finding housing. This creates a lead that will be followed up by housing agents.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            description: {
                type: SchemaType.STRING,
                description: 'Detailed description of housing requirements'
            },
            bedrooms: {
                type: SchemaType.NUMBER,
                description: 'Number of bedrooms needed'
            },
            budgetMin: {
                type: SchemaType.NUMBER,
                description: 'Minimum budget in TRY'
            },
            budgetMax: {
                type: SchemaType.NUMBER,
                description: 'Maximum budget in TRY'
            },
            areaName: {
                type: SchemaType.STRING,
                description: 'Preferred area/district'
            },
            moveInDate: {
                type: SchemaType.STRING,
                description: 'Desired move-in date or timeframe'
            },
            contactPhone: {
                type: SchemaType.STRING,
                description: 'Contact phone number (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: SchemaType.STRING,
                description: 'Additional requirements or preferences'
            }
        },
        required: ['description']
    }
};

// ============================================================================
// CAR RENTAL
// ============================================================================

export const searchCarRentalListingsTool: FunctionDeclaration = {
    name: 'searchCarRentalListings',
    description: 'Search for available car rentals in North Cyprus.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            carType: {
                type: SchemaType.STRING,
                description: 'Type of car: "small", "sedan", "SUV", "van", "other"'
            },
            transmission: {
                type: SchemaType.STRING,
                description: 'Transmission preference: "manual", "automatic"'
            },
            minSeats: {
                type: SchemaType.NUMBER,
                description: 'Minimum number of seats needed'
            },
            minPrice: {
                type: SchemaType.NUMBER,
                description: 'Minimum daily rate in TRY'
            },
            maxPrice: {
                type: SchemaType.NUMBER,
                description: 'Maximum daily rate in TRY'
            }
        },
        required: []
    }
};

export const createCarRentalRequestTool: FunctionDeclaration = {
    name: 'createCarRentalRequest',
    description: 'Create a car rental request when user needs help finding a car or has specific requirements. This creates a lead for car rental providers.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            description: {
                type: SchemaType.STRING,
                description: 'Description of car rental needs'
            },
            carType: {
                type: SchemaType.STRING,
                description: 'Preferred car type'
            },
            rentalDays: {
                type: SchemaType.NUMBER,
                description: 'Number of days needed'
            },
            fromDate: {
                type: SchemaType.STRING,
                description: 'Rental start date'
            },
            toDate: {
                type: SchemaType.STRING,
                description: 'Rental end date'
            },
            contactPhone: {
                type: SchemaType.STRING,
                description: 'Contact phone number (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: SchemaType.STRING,
                description: 'Additional requirements (insurance, pickup location, etc.)'
            }
        },
        required: ['description']
    }
};

// ============================================================================
// SERVICES & SUPPLIES
// ============================================================================

export const createServiceRequestTool: FunctionDeclaration = {
    name: 'createServiceRequest',
    description: 'Create a general service request for water/gas delivery, groceries, repairs, or any other service needs. This is the catch-all for anything the user needs that isn\'t handled by specific tools.',
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            category: {
                type: SchemaType.STRING,
                description: 'Request category: "WATER_GAS", "GROCERIES", "OTHER"'
            },
            title: {
                type: SchemaType.STRING,
                description: 'Short title of the request (e.g., "Water delivery", "Grocery shopping")'
            },
            description: {
                type: SchemaType.STRING,
                description: 'Detailed description of what is needed'
            },
            when: {
                type: SchemaType.STRING,
                description: 'When it\'s needed: "now", "today", "this_weekend"'
            },
            location: {
                type: SchemaType.STRING,
                description: 'Delivery or service location'
            },
            quantity: {
                type: SchemaType.NUMBER,
                description: 'Quantity if applicable (e.g., number of water bottles)'
            },
            contactPhone: {
                type: SchemaType.STRING,
                description: 'Contact phone number (will be auto-fetched from profile if not provided)'
            },
            notes: {
                type: SchemaType.STRING,
                description: 'Additional notes or special instructions'
            }
        },
        required: ['category', 'title', 'description']
    }
};

// ============================================================================
// TOOL COLLECTION
// ============================================================================

export const V1_AGENT_TOOLS = [
    searchPlacesTool,
    searchActivitiesTool,
    searchHousingListingsTool,
    createHousingRequestTool,
    searchCarRentalListingsTool,
    createCarRentalRequestTool,
    createServiceRequestTool
];
