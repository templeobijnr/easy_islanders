"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showDirectionsToolDef = exports.getAreaInfoTool = exports.fetchHotspotsTool = exports.computeDistanceTool = exports.getNearbyPlacesTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.getNearbyPlacesTool = {
    name: "getNearbyPlaces",
    description: "Find nearby places using geo lookup.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            location: { type: generative_ai_1.SchemaType.STRING },
            domain: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["location"],
    },
};
exports.computeDistanceTool = {
    name: "computeDistance",
    description: "Compute distance between two points.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            from: { type: generative_ai_1.SchemaType.STRING },
            to: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["from", "to"],
    },
};
exports.fetchHotspotsTool = {
    name: "fetchHotspots",
    description: "Fetch popular hotspots for a domain/area.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            area: { type: generative_ai_1.SchemaType.STRING },
            domain: { type: generative_ai_1.SchemaType.STRING },
        },
    },
};
exports.getAreaInfoTool = {
    name: "getAreaInfo",
    description: "Get summary info about an area.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            area: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["area"],
    },
};
exports.showDirectionsToolDef = {
    name: "showDirections",
    description: "Get directions to a place (returns Google Maps link).",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            destination: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Place name or address to navigate to.",
            },
            lat: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Optional latitude.",
            },
            lng: {
                type: generative_ai_1.SchemaType.NUMBER,
                description: "Optional longitude.",
            },
        },
        required: ["destination"],
    },
};
//# sourceMappingURL=geo.tools.js.map