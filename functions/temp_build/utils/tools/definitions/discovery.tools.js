"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchStaysTool = exports.searchEventsTool = exports.searchLocalPlacesTool = void 0;
var generative_ai_1 = require("@google/generative-ai");
exports.searchLocalPlacesTool = {
    name: "searchLocalPlaces",
    description: "Search local places like restaurants, nightlife, beaches, cafes, experiences.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            domain: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Category of place: restaurants, nightlife, beaches, cafes, experiences, shops.",
            },
            location: {
                type: generative_ai_1.SchemaType.STRING,
                description: "City/area to search in.",
            },
            query: { type: generative_ai_1.SchemaType.STRING, description: "Free-text keywords." },
            sortBy: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Sorting order: price_asc, price_desc, rating.",
            },
        },
        required: ["domain"],
    },
};
exports.searchEventsTool = {
    name: "searchEvents",
    description: "Search events and happenings.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            location: {
                type: generative_ai_1.SchemaType.STRING,
                description: "City/area to search in.",
            },
            query: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Keywords for the event.",
            },
            dateRange: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Optional date range filter.",
            },
        },
    },
};
exports.searchStaysTool = {
    name: "searchStays",
    description: "PRIMARY TOOL for stays, rentals, accommodation. Use for: daily rentals, villas, apartments, holiday homes, short-term rentals, vacation homes, places to stay, accommodation requests. This is the ONLY tool for rental properties.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            location: {
                type: generative_ai_1.SchemaType.STRING,
                description: "City/area: Kyrenia, Famagusta, Nicosia, Alsancak, etc.",
            },
            type: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Type of stay: villa, apartment, daily, long-term, studio, holiday home.",
            },
            minPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Minimum price per night or month.",
            },
            maxPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Maximum price per night or month.",
            },
            bedrooms: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Minimum number of bedrooms required.",
            },
        },
    },
};
