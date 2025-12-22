/**
 * Knowledge Types - RAG Knowledge Base Schema
 * 
 * Defines the document and chunk structure for business knowledge ingestion.
 * Uses Firestore Vector Search for retrieval.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// KNOWLEDGE DOCUMENT
// ============================================

export type SourceType = 'pdf' | 'image' | 'url' | 'text' | 'file';
export type KnowledgeDocStatus = 'processing' | 'active' | 'failed' | 'disabled';

/**
 * KnowledgeDoc - Parent document for a source file.
 * Lives at: businesses/{businessId}/knowledgeDocs/{docId}
 */
export interface KnowledgeDoc {
    id: string;
    businessId: string; // Denormalized for queries

    // Source info
    sourceType: SourceType;
    sourceName: string; // e.g., "Dinner Menu", "Hotel Directory"
    filePath?: string; // Cloud Storage path (if uploaded)
    mimeType?: string;
    sourceUrl?: string; // For url ingestion
    sourceText?: string; // For direct text ingestion (small payloads only)

    // Processing
    status: KnowledgeDocStatus;
    error?: {
        code: string;
        message: string;
    };

    // Metadata
    chunkCount: number;
    pageCount?: number;
    contentHash?: string; // Stable hash of extracted text
    embeddingModel: string; // e.g., "text-embedding-004"

    // === CATALOG EXTRACTION ===
    docType?: 'menu' | 'price_list' | 'catalog' | 'services' | 'treatments' | 'general';
    extractCatalog?: boolean;  // Explicit flag to trigger extraction
    catalogExtraction?: {
        status: 'skipped' | 'processing' | 'done' | 'failed';
        extractedCount?: number;
        extractionRunId?: string;
        error?: { code: string; message: string };
        completedAt?: Timestamp;
    };

    // Audit
    createdBy: string; // uid
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================
// KNOWLEDGE CHUNK
// ============================================

export type ChunkStatus = 'active' | 'disabled';

/**
 * KnowledgeChunk - Embedded text fragment for vector search.
 * Lives at: businesses/{businessId}/knowledgeDocs/{docId}/chunks/{chunkId}
 * 
 * CRITICAL: businessId is denormalized for collection group queries.
 */
export interface KnowledgeChunk {
    id: string;

    // Denormalized for collection group filtering
    businessId: string;
    docId: string;
    sourceName: string;
    sourceType: SourceType;

    // Content
    text: string;
    textHash: string; // sha256 hash for idempotency/dedupe
    chunkIndex: number;

    // Embedding (stored as Firestore Vector via FieldValue.vector())
    embedding: number[];

    // Status
    status: ChunkStatus;

    // Optional metadata
    loc?: {
        page?: number;
        section?: string;
    };
    tokenCount?: number;

    // Audit
    createdAt: Timestamp;
}

// ============================================
// RETRIEVAL RESULT
// ============================================

/**
 * ChunkRetrievalResult - Returned by vector search.
 */
export interface ChunkRetrievalResult {
    chunkId: string;
    docId: string;
    sourceName: string;
    text: string;
    score: number; // Distance score (lower = more similar)
}

// ============================================
// INGESTION DTOs
// ============================================

export interface CreateKnowledgeDocRequest {
    sourceType: SourceType;
    sourceName: string;
    filePath?: string; // For uploaded files
    url?: string; // For url ingestion
    text?: string; // For direct text input
}

export interface CreateKnowledgeDocResponse {
    success: boolean;
    docId?: string;
    status?: KnowledgeDocStatus;
    message: string;
}

export interface ListKnowledgeDocsResponse {
    docs: KnowledgeDoc[];
    totalChunks: number;
}
