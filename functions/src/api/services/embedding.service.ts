/**
 * Embedding Service
 * 
 * Isolated embedding generation using Gemini text-embedding-004.
 * Single function for easy model swapping later.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { log } from '../../utils/log';

const MODEL_NAME = 'text-embedding-004';

/**
 * Get Gemini AI instance.
 */
function getGenAI(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate embedding vector for text.
 * Returns 768-dimensional vector for text-embedding-004.
 */
export async function embedText(text: string): Promise<number[]> {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    try {
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        log.error('[EmbeddingService] Failed to generate embedding', error);
        throw error;
    }
}

/**
 * Generate embeddings for multiple texts (batch).
 * Processes sequentially to avoid rate limits.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
        const embedding = await embedText(text);
        embeddings.push(embedding);
    }

    return embeddings;
}

export const embeddingService = {
    embedText,
    embedTexts,
    MODEL_NAME
};
