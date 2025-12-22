import { getErrorMessage } from '../utils/errors';
/**
 * Knowledge Controller
 * HTTP endpoint for business knowledge ingestion
 */
import { Request, Response } from "express";
import * as logger from "firebase-functions/logger";
import { knowledgeService } from "../services/knowledge.service";

/**
 * Ingest knowledge content for a business
 * POST /knowledge/ingest
 * Body: {
 *   businessId: string,
 *   content: string,      // The raw text content
 *   source: string,       // File name or URL
 *   sourceType: 'pdf' | 'image' | 'url' | 'text'
 * }
 */
export const ingestKnowledge = async (req: Request, res: Response) => {
    try {
        const { businessId, content, source, sourceType } = req.body;
        const user = (req as any).user;

        // Validate required fields
        if (!businessId || !content || !source || !sourceType) {
            res.status(400).json({
                error: "Missing required fields: businessId, content, source, sourceType",
            });
            return;
        }

        // TODO: Verify user owns this business
        logger.info(`[Knowledge] Ingest request from user ${user?.uid} for business ${businessId}`);

        const result = await knowledgeService.ingestTextContent(
            businessId,
            content,
            source,
            sourceType
        );

        res.json({
            success: result.success,
            message: result.success
                ? `Successfully ingested ${result.chunks} knowledge chunks`
                : "Ingestion failed",
            chunks: result.chunks,
        });
    } catch (error: unknown) {
        logger.error("[Knowledge] Ingest error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "Internal server error" });
    }
};

/**
 * Ingest image content (with Vision extraction)
 * POST /knowledge/ingest-image
 * Body: {
 *   businessId: string,
 *   imageBase64: string,  // Base64 encoded image
 *   mimeType: string,     // e.g., 'image/jpeg'
 *   source: string        // File name
 * }
 */
export const ingestImage = async (req: Request, res: Response) => {
    try {
        const { businessId, imageBase64, imageData, mimeType, source } = req.body;
        const rawImage = (imageBase64 || imageData) as string | undefined;

        if (!businessId || !rawImage || !mimeType || !source) {
            res.status(400).json({
                error: "Missing required fields: businessId, imageData (or imageBase64), mimeType, source",
            });
            return;
        }

        logger.info(`[Knowledge] Image ingest for business ${businessId}: ${source}`);

        // 1. Extract text from image using Gemini Vision
        const base64Payload = typeof rawImage === 'string' && rawImage.startsWith('data:')
            ? (rawImage.split(',')[1] || '')
            : rawImage;

        if (!base64Payload) {
            res.status(400).json({
                error: "Invalid image data",
            });
            return;
        }

        const imageBuffer = Buffer.from(base64Payload, "base64");
        const extractedText = await knowledgeService.extractTextFromImage(
            imageBuffer,
            mimeType
        );

        if (!extractedText || extractedText.trim().length < 20) {
            res.status(400).json({
                error: "Could not extract meaningful text from image",
                extractedLength: extractedText?.length || 0,
            });
            return;
        }

        // 2. Ingest the extracted text
        const result = await knowledgeService.ingestTextContent(
            businessId,
            extractedText,
            source,
            "image"
        );

        res.json({
            success: result.success,
            message: `Extracted and ingested ${result.chunks} knowledge chunks from image`,
            chunks: result.chunks,
            extractedPreview: extractedText.slice(0, 200) + "...",
        });
    } catch (error: unknown) {
        logger.error("[Knowledge] Image ingest error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "Internal server error" });
    }
};

/**
 * Retrieve relevant knowledge for a question
 * POST /knowledge/retrieve
 * Body: {
 *   businessId: string,
 *   question: string
 * }
 */
export const retrieveKnowledge = async (req: Request, res: Response) => {
    try {
        const { businessId, question } = req.body;

        if (!businessId || !question) {
            res.status(400).json({
                error: "Missing required fields: businessId, question",
            });
            return;
        }

        const chunks = await knowledgeService.retrieveKnowledge(
            businessId,
            question,
            5
        );

        res.json({
            success: true,
            chunks,
            count: chunks.length,
        });
    } catch (error: unknown) {
        logger.error("[Knowledge] Retrieve error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "Internal server error" });
    }
};

/**
 * Clear all knowledge for a business
 * DELETE /knowledge/:businessId
 */
export const clearKnowledge = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            res.status(400).json({ error: "businessId parameter required" });
            return;
        }

        // TODO: Verify user owns this business
        await knowledgeService.clearBusinessKnowledge(businessId);

        res.json({
            success: true,
            message: "Knowledge base cleared",
        });
    } catch (error: unknown) {
        logger.error("[Knowledge] Clear error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "Internal server error" });
    }
};

/**
 * List all knowledge assets for a business (grouped by source)
 * GET /knowledge/:businessId
 */
export const listKnowledge = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.params;

        if (!businessId) {
            res.status(400).json({ error: "businessId parameter required" });
            return;
        }

        logger.info(`[Knowledge] Listing assets for business: ${businessId}`);

        // Fetch all chunks for this business
        const chunks = await knowledgeService.listBusinessKnowledge(businessId);

        // Group chunks by source
        const groupedBySource = new Map<string, {
            source: string;
            sourceType: string;
            chunks: { id: string; text: string; preview: string }[];
            createdAt: any;
        }>();

        for (const chunk of chunks) {
            const existing = groupedBySource.get(chunk.source);
            const chunkPreview = chunk.text.length > 150
                ? chunk.text.slice(0, 150) + "..."
                : chunk.text;

            if (existing) {
                existing.chunks.push({
                    id: chunk.id,
                    text: chunk.text,
                    preview: chunkPreview,
                });
            } else {
                groupedBySource.set(chunk.source, {
                    source: chunk.source,
                    sourceType: chunk.sourceType,
                    chunks: [{
                        id: chunk.id,
                        text: chunk.text,
                        preview: chunkPreview,
                    }],
                    createdAt: chunk.createdAt,
                });
            }
        }

        const assets = Array.from(groupedBySource.values());

        res.json({
            success: true,
            assets,
            totalChunks: chunks.length,
        });
    } catch (error: unknown) {
        logger.error("[Knowledge] List error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "Internal server error" });
    }
};

/**
 * Extract structured products from knowledge using AI
 * POST /knowledge/extract-products
 * Body: { businessId: string }
 */
export const extractProducts = async (req: Request, res: Response) => {
    try {
        const { businessId } = req.body;

        if (!businessId) {
            res.status(400).json({ error: "businessId required" });
            return;
        }

        logger.info(`[Knowledge] Extracting products for business: ${businessId}`);

        // Get all knowledge chunks for this business
        const chunks = await knowledgeService.listBusinessKnowledge(businessId);

        if (chunks.length === 0) {
            res.json({
                success: true,
                products: [],
                message: "No knowledge found to extract from",
            });
            return;
        }

        // Get only active chunks' text
        const activeTexts = chunks
            .filter(c => c.status === "active")
            .map(c => c.text);

        if (activeTexts.length === 0) {
            res.json({
                success: true,
                products: [],
                message: "No active knowledge chunks found",
            });
            return;
        }

        // Extract products using AI
        const products = await knowledgeService.extractProductsFromKnowledge(activeTexts);

        res.json({
            success: true,
            products,
            message: `Extracted ${products.length} products from ${activeTexts.length} knowledge chunks`,
        });
    } catch (error: unknown) {
        logger.error("[Knowledge] Extract products error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "Extraction failed" });
    }
};

/**
 * Update chunk status
 * PUT /knowledge/chunk/:chunkId/status
 */
export const updateChunkStatus = async (req: Request, res: Response) => {
    try {
        const { chunkId } = req.params;
        const { status } = req.body;

        if (!chunkId || !status) {
            res.status(400).json({ error: "chunkId and status required" });
            return;
        }

        if (!["active", "disabled"].includes(status)) {
            res.status(400).json({ error: "status must be 'active' or 'disabled'" });
            return;
        }

        await knowledgeService.updateChunkStatus(chunkId, status);

        res.json({
            success: true,
            message: `Chunk ${chunkId} status updated to ${status}`,
        });
    } catch (error: unknown) {
        logger.error("[Knowledge] Update status error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "Update failed" });
    }
};

/**
 * Extract content from a website URL
 * POST /knowledge/extract-url
 * Body: { businessId: string, url: string }
 */
export const extractFromUrl = async (req: Request, res: Response) => {
    try {
        const { businessId, url } = req.body;
        const user = (req as any).user;

        if (!businessId || !url) {
            res.status(400).json({ error: "businessId and url are required" });
            return;
        }

        logger.info(`[Knowledge] URL extract request from user ${user?.uid} for ${url}`);

        // Dynamic import to avoid loading cheerio at module load time
        const { urlExtractionService } = await import('../api/services/url-extraction.service');

        // Step 1: Fetch and extract raw text
        const extraction = await urlExtractionService.extractFromUrl(url);

        if (!extraction.success) {
            res.status(400).json({
                success: false,
                error: extraction.error || 'Failed to extract content from URL'
            });
            return;
        }

        // Step 2: Structure with Gemini (optional but recommended)
        const structuredText = await urlExtractionService.structureExtractedText(
            extraction.text,
            undefined // Could pass business name here
        );

        res.json({
            success: true,
            extractedText: structuredText,
            rawLength: extraction.text.length,
            title: extraction.title
        });

    } catch (error: unknown) {
        logger.error("[Knowledge] URL extract error:", error);
        res.status(500).json({ error: getErrorMessage(error) || "URL extraction failed" });
    }
};
