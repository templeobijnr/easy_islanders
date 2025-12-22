/**
 * AI Model Configuration
 * 
 * Central config for all AI model names.
 * Change here instead of hunting through code.
 */

export const MODELS = {
    // Vision/multimodal model for OCR and image understanding
    vision: process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash',

    // Chat/text generation model
    chat: process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash',

    // Embedding model for vector search
    embed: 'text-embedding-004'
};
