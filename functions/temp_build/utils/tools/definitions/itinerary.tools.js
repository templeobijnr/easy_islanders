"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveItineraryTool = exports.getItineraryTool = exports.removeFromItineraryTool = exports.addToItineraryTool = exports.createItineraryTool = void 0;
var generative_ai_1 = require("@google/generative-ai");
exports.createItineraryTool = {
    name: "createItinerary",
    description: "Create a new itinerary/plan.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            title: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["title"],
    },
};
exports.addToItineraryTool = {
    name: "addToItinerary",
    description: "Add an item to an itinerary.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING },
            itemId: { type: generative_ai_1.SchemaType.STRING },
            title: { type: generative_ai_1.SchemaType.STRING },
            day: { type: generative_ai_1.SchemaType.NUMBER },
        },
        required: ["itineraryId", "itemId", "title"],
    },
};
exports.removeFromItineraryTool = {
    name: "removeFromItinerary",
    description: "Remove an item from an itinerary.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING },
            itemId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["itineraryId", "itemId"],
    },
};
exports.getItineraryTool = {
    name: "getItinerary",
    description: "Fetch itinerary details.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["itineraryId"],
    },
};
exports.saveItineraryTool = {
    name: "saveItinerary",
    description: "Save itinerary changes.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            itineraryId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["itineraryId"],
    },
};
