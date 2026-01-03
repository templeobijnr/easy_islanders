"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTrendingTribesTool = exports.getTribeInfoTool = exports.listTribeMessagesTool = exports.postToTribeTool = exports.leaveTribeTool = exports.joinTribeTool = exports.createTribeTool = void 0;
var generative_ai_1 = require("@google/generative-ai");
exports.createTribeTool = {
    name: "createTribe",
    description: "Create a new tribe/community.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            name: { type: generative_ai_1.SchemaType.STRING },
            description: { type: generative_ai_1.SchemaType.STRING },
            tags: { type: generative_ai_1.SchemaType.ARRAY, items: { type: generative_ai_1.SchemaType.STRING } },
        },
        required: ["name"],
    },
};
exports.joinTribeTool = {
    name: "joinTribe",
    description: "Join a tribe by ID.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["tribeId"],
    },
};
exports.leaveTribeTool = {
    name: "leaveTribe",
    description: "Leave a tribe by ID.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["tribeId"],
    },
};
exports.postToTribeTool = {
    name: "postToTribe",
    description: "Create a post inside a tribe.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING },
            content: { type: generative_ai_1.SchemaType.STRING },
            mediaUrl: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["tribeId", "content"],
    },
};
exports.listTribeMessagesTool = {
    name: "listTribeMessages",
    description: "List recent posts/messages in a tribe.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING },
            limit: { type: generative_ai_1.SchemaType.NUMBER },
        },
        required: ["tribeId"],
    },
};
exports.getTribeInfoTool = {
    name: "getTribeInfo",
    description: "Get tribe details.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            tribeId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["tribeId"],
    },
};
exports.listTrendingTribesTool = {
    name: "listTrendingTribes",
    description: "List trending tribes.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            limit: { type: generative_ai_1.SchemaType.NUMBER },
        },
    },
};
