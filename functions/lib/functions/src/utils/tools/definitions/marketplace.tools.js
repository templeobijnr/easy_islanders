"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchMarketplaceTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.searchMarketplaceTool = {
    name: "searchMarketplace",
    description: "Search the database for Real Estate, Cars, Services, etc. Returns full details including amenities.",
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
                description: "Keywords to match against title or tags.",
            },
            minPrice: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Minimum price filter.",
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
            },
        },
        required: ["domain"],
    },
};
//# sourceMappingURL=marketplace.tools.js.map