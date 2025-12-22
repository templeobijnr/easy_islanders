/**
 * Limits Types - Business Limits and Usage
 * 
 * Defines hard limits for V1 (standard for all businesses).
 * No magic numbers - limits are explicit and typed.
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================
// BUSINESS LIMITS
// ============================================

/**
 * BusinessLimits - Hard caps for V1.
 * Can be stored per-business in future; for now, use DEFAULT_LIMITS.
 */
export interface BusinessLimits {
    maxChunks: number;
    maxDocs: number;
    maxUploadMB: number;
    maxPdfPages: number;
    maxPublicMessagesPerSession: number;
}

/**
 * Default limits for V1 (standard for everyone).
 */
export const DEFAULT_LIMITS: BusinessLimits = {
    maxChunks: 500,
    maxDocs: 50,
    maxUploadMB: 10,
    maxPdfPages: 10,
    maxPublicMessagesPerSession: 5,
};

// ============================================
// USAGE TRACKING (optional for V1)
// ============================================

/**
 * BusinessUsage - Monthly usage counters.
 * Lives at: businesses/{businessId}/usage/{yyyymm}
 */
export interface BusinessUsage {
    month: string; // e.g., "2024-01"

    // Counters
    activeChunkCount: number;
    knowledgeDocCount: number;

    // Optional metering
    embeddingCalls?: number;
    visionCalls?: number;
    generationCalls?: number;

    // Audit
    lastUpdatedAt: Timestamp;
}

// ============================================
// LIMIT CHECK RESULT
// ============================================

export interface LimitCheckResult {
    allowed: boolean;
    reason?: string;
    currentUsage?: number;
    limit?: number;
}
