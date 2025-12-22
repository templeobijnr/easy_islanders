/**
 * Knowledge Service
 * Handles extraction, chunking, embedding, and vector storage for business knowledge base
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../../../config/firebase";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const COLLECTION = "business_knowledge";

interface KnowledgeChunk {
    businessId: string;
    text: string;
    embedding: number[];
    source: string;
    sourceType: "pdf" | "image" | "url" | "text";
    status: "active" | "disabled";
    createdAt: FirebaseFirestore.FieldValue;
}

/**
 * Get Gemini AI instance
 */
const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    return new GoogleGenerativeAI(apiKey);
};

/**
 * Generate embedding for text using Gemini
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    try {
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        logger.error("Embedding generation failed:", error);
        throw error;
    }
};

/**
 * Extract text from image using Gemini Vision
 */
export const extractTextFromImage = async (
    imageBuffer: Buffer,
    mimeType: string
): Promise<string> => {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    try {
        const result = await model.generateContent([
            {
                inlineData: {
                    data: imageBuffer.toString("base64"),
                    mimeType: mimeType,
                },
            },
            `Extract ALL text from this image. Include:
      - All menu items with prices
      - All service names with descriptions
      - Any contact information
      - Business hours
      - Policies or rules
      Return as clean, structured text. Keep prices in original format (e.g., "500 TL" or "£25").`,
        ]);

        return result.response.text();
    } catch (error) {
        logger.error("Image text extraction failed:", error);
        throw error;
    }
};

/**
 * Chunk text into smaller segments for better embeddings
 * Uses ~500 character chunks with ~100 character overlap
 */
export const chunkText = (text: string, chunkSize = 500, overlap = 100): string[] => {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = start + chunkSize;

        // Try to end at a sentence boundary
        if (end < text.length) {
            const nextPeriod = text.indexOf(".", end);
            const nextNewline = text.indexOf("\n", end);
            const boundary = Math.min(
                nextPeriod > 0 ? nextPeriod + 1 : text.length,
                nextNewline > 0 ? nextNewline : text.length
            );
            if (boundary - end < 100) {
                end = boundary;
            }
        }

        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
    }

    return chunks.filter((c) => c.length > 50); // Filter out tiny chunks
};

/**
 * Ingest text content into business knowledge base
 */
export const ingestTextContent = async (
    businessId: string,
    content: string,
    source: string,
    sourceType: "pdf" | "image" | "url" | "text"
): Promise<{ chunks: number; success: boolean }> => {
    try {
        logger.info(`[Knowledge] Ingesting content for business: ${businessId}`);

        // 1. Chunk the content
        const chunks = chunkText(content);
        logger.info(`[Knowledge] Created ${chunks.length} chunks`);

        // 2. Generate embeddings and store each chunk
        let stored = 0;
        for (const chunkText of chunks) {
            try {
                const embedding = await generateEmbedding(chunkText);

                const docData: KnowledgeChunk = {
                    businessId,
                    text: chunkText,
                    embedding,
                    source,
                    sourceType,
                    status: "active",
                    createdAt: FieldValue.serverTimestamp(),
                };

                await db.collection(COLLECTION).add(docData);
                stored++;
            } catch (chunkError) {
                logger.error(`[Knowledge] Failed to store chunk: ${chunkError}`);
            }
        }

        logger.info(`[Knowledge] Successfully stored ${stored}/${chunks.length} chunks`);
        return { chunks: stored, success: true };
    } catch (error) {
        logger.error("[Knowledge] Ingestion failed:", error);
        return { chunks: 0, success: false };
    }
};

/**
 * Retrieve relevant knowledge chunks for a question
 */
export const retrieveKnowledge = async (
    businessId: string,
    question: string,
    limit = 5
): Promise<string[]> => {
    try {
        // Generate embedding for the question
        const questionEmbedding = await generateEmbedding(question);

        // Query Firestore with vector search
        // Note: Requires Firestore vector index on 'embedding' field
        const snapshot = await db
            .collection(COLLECTION)
            .where("businessId", "==", businessId)
            .limit(limit * 2) // Fetch more, filter by vector similarity
            .get();

        if (snapshot.empty) {
            logger.info(`[Knowledge] No knowledge found for business: ${businessId}`);
            return [];
        }

        // Calculate cosine similarity and rank
        const results = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                const similarity = cosineSimilarity(questionEmbedding, data.embedding);
                return { text: data.text, similarity };
            })
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);

        return results.map((r) => r.text);
    } catch (error) {
        logger.error("[Knowledge] Retrieval failed:", error);
        return [];
    }
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Clear all knowledge for a business
 */
export const clearBusinessKnowledge = async (businessId: string): Promise<void> => {
    const snapshot = await db
        .collection(COLLECTION)
        .where("businessId", "==", businessId)
        .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logger.info(`[Knowledge] Cleared ${snapshot.size} chunks for business: ${businessId}`);
};

/**
 * List all knowledge chunks for a business
 */
export const listBusinessKnowledge = async (businessId: string): Promise<{
    id: string;
    text: string;
    source: string;
    sourceType: string;
    status: string;
    createdAt: any;
}[]> => {
    const snapshot = await db
        .collection(COLLECTION)
        .where("businessId", "==", businessId)
        .get();

    const toMillis = (value: any): number => {
        if (!value) return 0;
        if (typeof value.toMillis === 'function') return value.toMillis();
        if (value instanceof Date) return value.getTime();
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const parsed = Date.parse(value);
            return Number.isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    const results = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            text: data.text,
            source: data.source,
            sourceType: data.sourceType,
            status: data.status || "active",
            createdAt: data.createdAt,
        };
    });

    results.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    return results;
};

/**
 * Update chunk status
 */
export const updateChunkStatus = async (
    chunkId: string,
    status: "active" | "disabled"
): Promise<void> => {
    await db.collection(COLLECTION).doc(chunkId).update({ status });
};

/**
 * Extract structured products from knowledge text using AI
 */
export const extractProductsFromKnowledge = async (
    texts: string[]
): Promise<{ name: string; price: number; currency: string; category: string; description: string }[]> => {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const combinedText = texts.join("\n---\n");

    const prompt = `You are a product extraction assistant. Extract all products, services, items, or offerings from the following text.

For each item found, return a JSON array with objects containing:
- name: The product/service name
- price: The numeric price (0 if not found)
- currency: The currency code (EUR, USD, TRY, GBP - infer from context, default EUR)
- category: One of: food, drink, service, rental, experience, room, other
- description: Brief description if available

Text to analyze:
${combinedText}

Return ONLY a valid JSON array, no markdown or explanation.
Example: [{"name": "Pasta Carbonara", "price": 18, "currency": "EUR", "category": "food", "description": "Classic Italian pasta"}]`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Parse JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            logger.warn("[Knowledge] No JSON found in extraction response");
            return [];
        }

        const products = JSON.parse(jsonMatch[0]);
        logger.info(`[Knowledge] Extracted ${products.length} products`);
        return products;
    } catch (error) {
        logger.error("[Knowledge] Product extraction failed:", error);
        return [];
    }
};

export const knowledgeService = {
    generateEmbedding,
    extractTextFromImage,
    chunkText,
    ingestTextContent,
    retrieveKnowledge,
    clearBusinessKnowledge,
    listBusinessKnowledge,
    updateChunkStatus,
    extractProductsFromKnowledge,
};
