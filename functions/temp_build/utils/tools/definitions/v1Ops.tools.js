"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPlacesToolDef = exports.createOrderToolDef = exports.createServiceRequestToolDef = exports.searchHousingListingsToolDef = exports.requestServiceTool = exports.orderHouseholdSuppliesTool = void 0;
var generative_ai_1 = require("@google/generative-ai");
exports.orderHouseholdSuppliesTool = {
    name: "orderHouseholdSupplies",
    description: "Order essential household items (water, gas, groceries, bread, milk) from local markets. This is a message-to-market dispatcher - sends request directly to vendors via WhatsApp.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            items: {
                type: generative_ai_1.SchemaType.STRING,
                description: 'List of items to order, e.g., "2 water bottles, 1 gas cylinder, bread, milk"',
            },
            deliveryAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Full delivery address or location",
            },
            contactPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer contact phone (will be auto-fetched from profile if not provided)",
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer name (will be auto-fetched from profile if not provided)",
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Additional instructions or special requirements",
            },
        },
        required: ["items", "deliveryAddress"],
    },
};
exports.requestServiceTool = {
    name: "requestService",
    description: "Request a service professional (plumber, electrician, cleaner, AC technician, handyman). Sends job lead to available providers.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            serviceType: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Type of service needed: plumber, electrician, cleaner, ac_tech, handyman, painter, gardener",
            },
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Brief description of the problem or work needed",
            },
            urgency: {
                type: generative_ai_1.SchemaType.STRING,
                description: "How urgent is the service: emergency, today, this_week, flexible",
            },
            location: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Location where service is needed",
            },
            contactPhone: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer contact phone (will be auto-fetched from profile if not provided)",
            },
            customerName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Customer name (will be auto-fetched from profile if not provided)",
            },
        },
        required: ["serviceType", "description", "location"],
    },
};
exports.searchHousingListingsToolDef = {
    name: "searchHousingListings",
    description: "Search for housing listings (apartments, studios, villas, rooms) in the current city.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            budgetMin: { type: generative_ai_1.SchemaType.NUMBER },
            budgetMax: { type: generative_ai_1.SchemaType.NUMBER },
            bedrooms: { type: generative_ai_1.SchemaType.NUMBER },
            areaName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Preferred area/neighbourhood (e.g. near GAU)",
            },
            intent: {
                type: generative_ai_1.SchemaType.STRING,
                format: "enum",
                enum: ["rent", "buy", "invest"],
            },
        },
        required: [],
    },
};
exports.createServiceRequestToolDef = {
    name: "createServiceRequest",
    description: "Create a generic service request (wifi, cleaning, handyman, residency, etc.).",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            serviceCategory: {
                type: generative_ai_1.SchemaType.STRING,
                format: "enum",
                enum: [
                    "HOME_PROPERTY",
                    "TECH_DIGITAL",
                    "LEGAL_ADMIN",
                    "TRANSPORT_SHOPPING",
                    "PACKAGE_DELIVERY",
                    "LIFESTYLE_CONCIERGE",
                ],
            },
            serviceSubcategory: { type: generative_ai_1.SchemaType.STRING },
            title: { type: generative_ai_1.SchemaType.STRING },
            description: { type: generative_ai_1.SchemaType.STRING },
            addressText: { type: generative_ai_1.SchemaType.STRING },
            scheduledTimeText: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["serviceCategory", "description"],
    },
};
exports.createOrderToolDef = {
    name: "createOrder",
    description: "Create an order for water, gas, or groceries to be delivered to the user.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            orderType: {
                type: generative_ai_1.SchemaType.STRING,
                format: "enum",
                enum: ["water", "gas", "grocery"],
            },
            bottleSizeLiters: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "For water/gas: bottle size in liters, if known.",
            },
            quantity: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Number of bottles/packs.",
            },
            groceryItems: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: "List of grocery items if this is a grocery order.",
            },
            addressText: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Delivery address or description of location.",
            },
            notes: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Any extra details for the vendor.",
            },
        },
        required: ["orderType"],
    },
};
exports.searchPlacesToolDef = {
    name: "searchPlaces",
    description: "Search curated places (food, nightlife, sights, cafes, services) in the current city.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            category: {
                type: generative_ai_1.SchemaType.STRING,
                format: "enum",
                enum: [
                    "food",
                    "nightlife",
                    "sight",
                    "cafe",
                    "shopping",
                    "service",
                    "other",
                ],
            },
            tag: { type: generative_ai_1.SchemaType.STRING },
            limit: { type: generative_ai_1.SchemaType.NUMBER },
        },
        required: [],
    },
};
