"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRealTimeInfoTool = exports.consultEncyclopediaTool = void 0;
var generative_ai_1 = require("@google/generative-ai");
exports.consultEncyclopediaTool = {
    name: "consultEncyclopedia",
    description: "Get answers about local laws, residency, utilities, and culture.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            query: { type: generative_ai_1.SchemaType.STRING, description: "The topic to look up." },
        },
        required: ["query"],
    },
};
exports.getRealTimeInfoTool = {
    name: "getRealTimeInfo",
    description: "Get current weather, exchange rates, or local news.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            category: {
                type: generative_ai_1.SchemaType.STRING,
                description: '"weather", "currency", "news"',
            },
        },
        required: ["category"],
    },
};
