"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEventsTool = exports.searchLocalPlacesTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
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
//# sourceMappingURL=discovery.tools.js.map