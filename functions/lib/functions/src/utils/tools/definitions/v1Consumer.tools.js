"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExchangeRateToolDef = exports.getNewsToolDef = exports.findPharmacyToolDef = exports.bookServiceToolDef = exports.orderFoodToolDef = exports.searchRestaurantsToolDef = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.searchRestaurantsToolDef = {
    name: "searchRestaurants",
    description: "Search for restaurants by cuisine type, name, or area in North Cyprus.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            cuisine: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Type of cuisine: Turkish, Kebab, Seafood, Italian, etc.",
            },
            name: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Restaurant name to search for.",
            },
            area: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Area/district: Girne, Lefkosa, Gazimagusa, etc.",
            },
        },
        required: [],
    },
};
exports.orderFoodToolDef = {
    name: "orderFood",
    description: "Order food from a restaurant for delivery. Creates a proposal that must be confirmed with YES.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            restaurantName: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Name of the restaurant to order from.",
            },
            cuisine: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Type of cuisine if restaurant name not specified.",
            },
            area: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Area for delivery: Girne, Lefkosa, etc.",
            },
            items: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.STRING },
                description: "Food items to order.",
            },
            quantities: {
                type: generative_ai_1.SchemaType.ARRAY,
                items: { type: generative_ai_1.SchemaType.NUMBER },
                description: "Quantities for each item.",
            },
            deliveryAddress: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Delivery address.",
            },
            specialInstructions: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Special requests or notes.",
            },
        },
        required: ["deliveryAddress"],
    },
};
exports.bookServiceToolDef = {
    name: "bookService",
    description: "Book a home service (plumber, electrician, handyman, AC technician, etc.). Creates a proposal.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            serviceType: {
                type: generative_ai_1.SchemaType.STRING,
                format: "enum",
                enum: [
                    "plumber",
                    "electrician",
                    "handyman",
                    "ac_technician",
                    "painter",
                    "gardener",
                    "cleaner",
                    "locksmith",
                    "pest_control",
                    "pool_maintenance",
                ],
                description: "Type of service needed.",
            },
            area: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Area: Girne, Lefkosa, etc.",
            },
            description: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Description of the issue or work needed.",
            },
            address: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Service address.",
            },
            urgency: {
                type: generative_ai_1.SchemaType.STRING,
                format: "enum",
                enum: ["emergency", "today", "this_week", "flexible"],
            },
        },
        required: ["serviceType", "description", "address"],
    },
};
exports.findPharmacyToolDef = {
    name: "findPharmacy",
    description: "Find on-duty pharmacies for today in North Cyprus.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            district: {
                type: generative_ai_1.SchemaType.STRING,
                description: "District to filter: Girne, Lefkosa, Gazimagusa, etc.",
            },
        },
        required: [],
    },
};
exports.getNewsToolDef = {
    name: "getNews",
    description: "Get the latest news headlines from North Cyprus.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {},
        required: [],
    },
};
exports.getExchangeRateToolDef = {
    name: "getExchangeRate",
    description: "Get currency exchange rates (EUR, GBP, USD, TRY).",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            from: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Source currency code: EUR, GBP, USD, TRY.",
            },
            to: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Target currency code.",
            },
        },
        required: [],
    },
};
//# sourceMappingURL=v1Consumer.tools.js.map