"use strict";
/**
 * Knowledge Controller (V1 Owner API)
 *
 * Secure multi-tenant knowledge management.
 * Uses TenantContext from middleware - never accepts businessId from client.
 */
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
exports.listKnowledgeDocs = listKnowledgeDocs;
exports.createKnowledgeDoc = createKnowledgeDoc;
exports.updateKnowledgeDoc = updateKnowledgeDoc;
exports.extractProducts = extractProducts;
exports.testQuery = testQuery;
const knowledge_repository_1 = require("../../repositories/knowledge.repository");
const knowledge_ingestion_service_1 = require("../services/knowledge-ingestion.service");
const rag_service_1 = require("../services/rag.service");
const limits_1 = require("../../types/limits");
const request_context_1 = require("../../utils/request-context");
const log_1 = require("../../utils/log");
const models_1 = require("../config/models");
/**
 * GET /v1/owner/knowledge-docs
 * List all knowledge documents for the business with chunk previews.
 */
async function listKnowledgeDocs(req, res) {
    const ctx = req.tenantContext;
    try {
        const docs = await knowledge_repository_1.knowledgeRepository.listDocs(ctx.businessId);
        // Get chunk previews for each doc (first 3 chunks)
        const docsWithPreviews = await Promise.all(docs.map(async (doc) => {
            const chunks = await knowledge_repository_1.knowledgeRepository.getChunksForDoc(ctx.businessId, doc.id);
            const previewChunks = chunks.slice(0, 3).map(c => ({
                id: c.id,
                text: c.text.slice(0, 150) + (c.text.length > 150 ? '...' : '')
            }));
            return {
                id: doc.id,
                sourceName: doc.sourceName,
                sourceType: doc.sourceType,
                status: doc.status,
                chunkCount: doc.chunkCount,
                createdAt: doc.createdAt,
                previewChunks
            };
        }));
        const totalChunks = docs.reduce((sum, d) => sum + (d.chunkCount || 0), 0);
        res.json({
            success: true,
            docs: docsWithPreviews,
            totalChunks
        });
    }
    catch (error) {
        log_1.log.error('[KnowledgeCtrl] listKnowledgeDocs error', error);
        res.status(500).json({ success: false, error: 'Failed to list knowledge docs' });
    }
}
/**
 * POST /v1/owner/knowledge-docs
 * Create a knowledge document. Supports three modes:
 * - sourceType: 'text' → save text directly
 * - sourceType: 'url' → extract from URL asynchronously
 * - sourceType: 'pdf'|'image' → process uploaded file asynchronously
 */
async function createKnowledgeDoc(req, res) {
    const ctx = req.tenantContext;
    const { sourceType, sourceName, text, sourceUrl, url, filePath, mimeType } = req.body;
    const normalizedUrl = sourceUrl || url;
    // Validate required fields
    if (!sourceType || !sourceName) {
        res.status(400).json({ success: false, error: 'sourceType and sourceName required' });
        return;
    }
    if (!['text', 'url', 'pdf', 'image'].includes(sourceType)) {
        res.status(400).json({ success: false, error: 'sourceType must be one of: text, url, pdf, image' });
        return;
    }
    // Validate source-specific fields
    if (sourceType === 'text' && !text) {
        res.status(400).json({ success: false, error: 'text required for sourceType: text' });
        return;
    }
    if (sourceType === 'url' && !normalizedUrl) {
        res.status(400).json({ success: false, error: 'sourceUrl required for sourceType: url' });
        return;
    }
    if ((sourceType === 'pdf' || sourceType === 'image') && !filePath) {
        res.status(400).json({ success: false, error: 'filePath required for sourceType: pdf/image' });
        return;
    }
    let docId = null;
    try {
        // Enforce doc count cap
        const docCount = await knowledge_repository_1.knowledgeRepository.countDocs(ctx.businessId);
        if (docCount >= limits_1.DEFAULT_LIMITS.maxDocs) {
            res.status(400).json({
                success: false,
                error: `Knowledge doc limit reached (${docCount}/${limits_1.DEFAULT_LIMITS.maxDocs})`
            });
            return;
        }
        // Create document in processing state
        docId = await knowledge_repository_1.knowledgeRepository.createDoc(ctx.businessId, {
            sourceType,
            sourceName,
            filePath: filePath || undefined,
            mimeType: mimeType || undefined,
            sourceUrl: normalizedUrl || undefined,
            sourceText: sourceType === 'text' ? text : undefined,
            status: 'processing',
            embeddingModel: 'text-embedding-004',
            createdBy: ctx.uid
        });
        // Enqueue async processing task
        await knowledge_ingestion_service_1.knowledgeIngestionService.enqueueKnowledgeDocIngestion(ctx.businessId, docId);
        (0, request_context_1.setRequestContext)({ docId });
        log_1.log.info('[KnowledgeCtrl] Created knowledge doc and enqueued ingestion', { docId });
        res.status(201).json({
            success: true,
            docId,
            status: 'processing'
        });
    }
    catch (error) {
        log_1.log.error('[KnowledgeCtrl] createKnowledgeDoc error', error, { docId: docId || undefined });
        // Best-effort: mark doc as failed if it exists
        if (docId) {
            try {
                await knowledge_repository_1.knowledgeRepository.updateDocStatus(ctx.businessId, docId, 'failed', {
                    code: 'DOC_CREATE_FAILED',
                    message: String((error === null || error === void 0 ? void 0 : error.message) || 'Failed to create knowledge doc')
                });
            }
            catch (_a) {
                // Ignore secondary errors
            }
        }
        res.status(500).json({ success: false, error: 'Failed to create knowledge doc' });
    }
}
/**
 * PATCH /v1/owner/knowledge-docs/:docId
 * Update document status (enable/disable).
 */
async function updateKnowledgeDoc(req, res) {
    const ctx = req.tenantContext;
    const { docId } = req.params;
    const { status } = req.body;
    if (!docId) {
        res.status(400).json({ success: false, error: 'docId required' });
        return;
    }
    if (!status || !['active', 'disabled'].includes(status)) {
        res.status(400).json({ success: false, error: 'status must be active or disabled' });
        return;
    }
    try {
        (0, request_context_1.setRequestContext)({ docId });
        // Verify doc belongs to this business
        const doc = await knowledge_repository_1.knowledgeRepository.getDoc(ctx.businessId, docId);
        if (!doc) {
            res.status(404).json({ success: false, error: 'Document not found' });
            return;
        }
        // Update doc status
        await knowledge_repository_1.knowledgeRepository.updateDocStatus(ctx.businessId, docId, status);
        // Also update all chunks to match doc status
        await knowledge_repository_1.knowledgeRepository.setAllChunksStatus(ctx.businessId, docId, status);
        log_1.log.info('[KnowledgeCtrl] Updated knowledge doc status', { docId, status });
        res.json({ success: true });
    }
    catch (error) {
        log_1.log.error('[KnowledgeCtrl] updateKnowledgeDoc error', error, { docId });
        res.status(500).json({ success: false, error: 'Failed to update document' });
    }
}
/**
 * POST /v1/owner/knowledge-docs/extract-products
 * Extract structured products from knowledge using AI.
 */
async function extractProducts(req, res) {
    const ctx = req.tenantContext;
    const { docIds } = req.body; // Optional: specific docs, or all active if empty
    try {
        // Get active docs
        let docs = await knowledge_repository_1.knowledgeRepository.listDocs(ctx.businessId, { status: 'active' });
        // Filter to specific docs if provided
        if (docIds && Array.isArray(docIds) && docIds.length > 0) {
            docs = docs.filter(d => docIds.includes(d.id));
        }
        if (docs.length === 0) {
            res.json({
                success: true,
                products: [],
                message: 'No active knowledge docs to extract from'
            });
            return;
        }
        // Gather all chunk text from selected docs
        const allChunkTexts = [];
        for (const doc of docs) {
            const chunks = await knowledge_repository_1.knowledgeRepository.getChunksForDoc(ctx.businessId, doc.id);
            const activeChunks = chunks.filter(c => c.status === 'active');
            allChunkTexts.push(...activeChunks.map(c => c.text));
        }
        if (allChunkTexts.length === 0) {
            res.json({
                success: true,
                products: [],
                message: 'No active chunks found'
            });
            return;
        }
        // Use Gemini to extract products
        const products = await extractProductsFromText(allChunkTexts.join('\n\n---\n\n'));
        log_1.log.info('[KnowledgeCtrl] Extracted products', {
            productCount: products.length,
            sourceChunks: allChunkTexts.length,
            sourceDocs: docs.length
        });
        res.json({
            success: true,
            products,
            sourceDocs: docs.length,
            sourceChunks: allChunkTexts.length
        });
    }
    catch (error) {
        log_1.log.error('[KnowledgeCtrl] extractProducts error', error);
        res.status(500).json({ success: false, error: 'Failed to extract products' });
    }
}
/**
 * POST /v1/owner/knowledge-docs/test-query
 * Test the AI with a sample question (owner-only).
 */
async function testQuery(req, res) {
    const ctx = req.tenantContext;
    const { question } = req.body;
    if (!question) {
        res.status(400).json({ success: false, error: 'question required' });
        return;
    }
    try {
        // Use RAG service to retrieve and answer
        const context = await rag_service_1.ragService.retrieveContext(ctx.businessId, question);
        if (!context.hasContext) {
            res.json({
                success: true,
                answer: 'I don\'t have enough information yet. Add more knowledge about your business!',
                chunks: 0
            });
            return;
        }
        // Generate response using Gemini
        const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require('@google/generative-ai')));
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: models_1.MODELS.chat });
        const prompt = `You are a helpful AI assistant for a business. Use the following context to answer the question.

Context:
${context.contextText}

Question: ${question}

Answer helpfully and concisely:`;
        const result = await model.generateContent(prompt);
        const answer = result.response.text();
        res.json({
            success: true,
            answer,
            chunks: context.sources.length
        });
    }
    catch (error) {
        log_1.log.error('[KnowledgeCtrl] testQuery error', error);
        res.status(500).json({ success: false, error: 'Failed to process query' });
    }
}
/**
 * Helper: Extract products from concatenated text using Gemini.
 */
async function extractProductsFromText(text) {
    const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require('@google/generative-ai')));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const prompt = `Extract all products/services/menu items with prices from the following text.

Return as JSON array with this exact structure:
[
  {
    "name": "Product name",
    "price": 100,
    "currency": "TL" or "£" or "EUR",
    "category": "food/drink/service/etc",
    "description": "optional brief description"
  }
]

If no products found, return empty array [].

Text:
${text.slice(0, 8000)}`;
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        // Extract JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    }
    catch (error) {
        log_1.log.error('[KnowledgeCtrl] Product extraction failed', error);
        return [];
    }
}
//# sourceMappingURL=knowledge.controller.js.map