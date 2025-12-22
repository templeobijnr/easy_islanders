"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchVibeMapDataTool = exports.getCheckInsForPlaceTool = exports.checkInToPlaceTool = exports.listNearbyUsersTool = exports.acceptWaveTool = exports.waveUserTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.waveUserTool = {
    name: "waveUser",
    description: "Send a wave to another user.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            targetUserId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["targetUserId"],
    },
};
exports.acceptWaveTool = {
    name: "acceptWave",
    description: "Accept a wave request.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            waveId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["waveId"],
    },
};
exports.listNearbyUsersTool = {
    name: "listNearbyUsers",
    description: "List nearby users for social discovery.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            location: { type: generative_ai_1.SchemaType.STRING },
        },
    },
};
exports.checkInToPlaceTool = {
    name: "checkInToPlace",
    description: "Create a check-in to a place.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            placeId: { type: generative_ai_1.SchemaType.STRING },
            placeName: { type: generative_ai_1.SchemaType.STRING },
            location: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["placeId", "placeName"],
    },
};
exports.getCheckInsForPlaceTool = {
    name: "getCheckInsForPlace",
    description: "Fetch recent check-ins for a place.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            placeId: { type: generative_ai_1.SchemaType.STRING },
            limit: { type: generative_ai_1.SchemaType.NUMBER },
        },
        required: ["placeId"],
    },
};
exports.fetchVibeMapDataTool = {
    name: "fetchVibeMapData",
    description: "Fetch vibe map data for areas.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            area: { type: generative_ai_1.SchemaType.STRING },
        },
    },
};
//# sourceMappingURL=socialPresence.tools.js.map