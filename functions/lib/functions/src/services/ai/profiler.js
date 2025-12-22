"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeChatTurn = analyzeChatTurn;
const logger = __importStar(require("firebase-functions/logger"));
const generative_ai_1 = require("@google/generative-ai");
let genAI = null;
const getGenAI = () => {
    if (genAI)
        return genAI;
    const key = process.env.GEMINI_API_KEY;
    if (!key)
        return null;
    genAI = new generative_ai_1.GoogleGenerativeAI(key);
    return genAI;
};
async function analyzeChatTurn(userId, lastMessage, currentGraph) {
    const client = getGenAI();
    if (!lastMessage || !client)
        return currentGraph;
    logger.debug(`[Profiler] Analyzing message for user ${userId}:`, lastMessage);
    logger.debug(`[Profiler] Current graph:`, JSON.stringify(currentGraph).substring(0, 400));
    const model = client.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
        systemInstruction: `
        You are an expert profiler. Analyze the latest user message and update a user intelligence graph.
        Output strict JSON with: { attributes: {}, segments: [], missingData: [] }.
        Confidence rules: direct statement=1.0, implied=0.5-0.7, weak=0.1-0.3.
        Missing data keys to consider: BUDGET, TRANSPORT, ACCOMMODATION, LOCATION, TIMELINE.
        Do NOT include prose; JSON only.
        `,
    }, { apiVersion: "v1beta" });
    const prompt = `
    USER_ID: ${userId}
    CURRENT_GRAPH: ${JSON.stringify(currentGraph || {})}
    MESSAGE: "${lastMessage}"
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response
        .text()
        .replace(/```json|```/g, "")
        .trim();
    logger.debug(`[Profiler] Raw model response (truncated):`, text.substring(0, 400));
    let parsed = {};
    try {
        parsed = JSON.parse(text);
        logger.debug(`[Profiler] Parsed JSON:`, parsed);
    }
    catch (err) {
        console.error(`[Profiler] Failed to parse model output`, err);
        return currentGraph;
    }
    const merged = {
        attributes: Object.assign(Object.assign({}, ((currentGraph === null || currentGraph === void 0 ? void 0 : currentGraph.attributes) || {})), (parsed.attributes || {})),
        segments: parsed.segments || (currentGraph === null || currentGraph === void 0 ? void 0 : currentGraph.segments) || [],
        missingData: parsed.missingData || (currentGraph === null || currentGraph === void 0 ? void 0 : currentGraph.missingData) || [],
    };
    return merged;
}
//# sourceMappingURL=profiler.js.map