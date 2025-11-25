"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeChatTurn = analyzeChatTurn;
const generative_ai_1 = require("@google/generative-ai");
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
async function analyzeChatTurn(userId, lastMessage, currentGraph) {
    if (!lastMessage || !genAI)
        return currentGraph;
    console.log(`[Profiler] Analyzing message for user ${userId}:`, lastMessage);
    console.log(`[Profiler] Current graph:`, JSON.stringify(currentGraph).substring(0, 400));
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-lite',
        systemInstruction: `
        You are an expert profiler. Analyze the latest user message and update a user intelligence graph.
        Output strict JSON with: { attributes: {}, segments: [], missingData: [] }.
        Confidence rules: direct statement=1.0, implied=0.5-0.7, weak=0.1-0.3.
        Missing data keys to consider: BUDGET, TRANSPORT, ACCOMMODATION, LOCATION, TIMELINE.
        Do NOT include prose; JSON only.
        `
    }, { apiVersion: 'v1' });
    const prompt = `
    USER_ID: ${userId}
    CURRENT_GRAPH: ${JSON.stringify(currentGraph || {})}
    MESSAGE: "${lastMessage}"
    `;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();
    console.log(`[Profiler] Raw model response (truncated):`, text.substring(0, 400));
    let parsed = {};
    try {
        parsed = JSON.parse(text);
        console.log(`[Profiler] Parsed JSON:`, parsed);
    }
    catch (err) {
        console.error(`[Profiler] Failed to parse model output`, err);
        return currentGraph;
    }
    const merged = {
        attributes: Object.assign(Object.assign({}, ((currentGraph === null || currentGraph === void 0 ? void 0 : currentGraph.attributes) || {})), (parsed.attributes || {})),
        segments: parsed.segments || (currentGraph === null || currentGraph === void 0 ? void 0 : currentGraph.segments) || [],
        missingData: parsed.missingData || (currentGraph === null || currentGraph === void 0 ? void 0 : currentGraph.missingData) || []
    };
    return merged;
}
//# sourceMappingURL=profiler.js.map