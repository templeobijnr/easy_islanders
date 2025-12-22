"use strict";
/**
 * Embedding Service
 *
 * Isolated embedding generation using Gemini text-embedding-004.
 * Single function for easy model swapping later.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingService = void 0;
exports.embedText = embedText;
exports.embedTexts = embedTexts;
const generative_ai_1 = require("@google/generative-ai");
const log_1 = require("../../utils/log");
const MODEL_NAME = 'text-embedding-004';
/**
 * Get Gemini AI instance.
 */
function getGenAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    return new generative_ai_1.GoogleGenerativeAI(apiKey);
}
/**
 * Generate embedding vector for text.
 * Returns 768-dimensional vector for text-embedding-004.
 */
async function embedText(text) {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    try {
        const result = await model.embedContent(text);
        return result.embedding.values;
    }
    catch (error) {
        log_1.log.error('[EmbeddingService] Failed to generate embedding', error);
        throw error;
    }
}
/**
 * Generate embeddings for multiple texts (batch).
 * Processes sequentially to avoid rate limits.
 */
async function embedTexts(texts) {
    const embeddings = [];
    for (const text of texts) {
        const embedding = await embedText(text);
        embeddings.push(embedding);
    }
    return embeddings;
}
exports.embeddingService = {
    embedText,
    embedTexts,
    MODEL_NAME
};
//# sourceMappingURL=embedding.service.js.map