/**
 * Pipeline Metrics Service
 * 
 * Provides structured logging for "pipeline invocations" (chat turns, webhooks, triggers).
 * Emits a single 'pipeline_metrics_v1' JSON log at the end of execution.
 * 
 * Used to generate logs-based metrics in Cloud Monitoring.
 */

import * as logger from 'firebase-functions/logger';

export type PipelineType =
    | 'general_chat'
    | 'business_public_chat'
    | 'whatsapp_consumer'
    | 'whatsapp_business'
    | 'knowledge_ingestion'
    | 'typesense_upsert'
    | 'places_proxy'
    | 'tx_confirm'
    | 'tx_hold';

export type ChannelType = 'app' | 'web' | 'whatsapp' | 'trigger' | 'scheduler';

export interface PipelineTags {
    pipeline: PipelineType;
    channel: ChannelType;
    threadType?: 'general' | 'business_public' | 'business_owner';
    marketId?: string;
    businessId?: string;

    // Correlation
    requestId?: string;
    sessionId?: string;
    threadId?: string;
    userId?: string;
    actorPhoneE164?: string;
}

export interface PipelineResult {
    success: boolean;
    errorCode?: string; // Stable enum: TIMEOUT, TWILIO_FAIL, LLM_FAIL, FS_TXN_CONFLICT
    httpStatus?: number;
}

export class PipelineMetrics {
    private startTime: number;
    private tags: PipelineTags;

    // Counters
    private counts = {
        llmGenerateCalls: 0,
        llmEmbedCalls: 0,
        vectorQueries: 0,
        fsReads: 0,
        fsWrites: 0,
        fsTransactions: 0,
        storageReads: 0,
        externalCalls: {
            twilio: 0,
            typesense: 0,
            places: 0
        },

        // P99 Amplifiers
        retrievedChunks: 0,
        retrievedChars: 0,
        toolCalls: 0,
        attachmentsBytes: 0
    };

    constructor(tags: PipelineTags) {
        this.startTime = Date.now();
        this.tags = tags;
    }

    // ==========================================
    // INCREMENTERS
    // ==========================================

    increment(metric: keyof Omit<typeof this.counts, 'externalCalls'>, amount = 1) {
        if (typeof this.counts[metric] === 'number') {
            (this.counts[metric] as number) += amount;
        }
    }

    trackExternal(provider: keyof typeof this.counts.externalCalls, amount = 1) {
        this.counts.externalCalls[provider] += amount;
    }

    // ==========================================
    // HELPERS FOR COMMON OPERATIONS
    // ==========================================

    trackLLM(model?: string) {
        this.increment('llmGenerateCalls');
    }

    trackEmbed(vectorCount = 1) {
        this.increment('llmEmbedCalls');
    }

    trackVectorQuery(chunksRetrieved = 0) {
        this.increment('vectorQueries');
        this.increment('retrievedChunks', chunksRetrieved);
    }

    trackToolCall() {
        this.increment('toolCalls');
    }

    trackFirestoreRead(docs = 1) {
        this.increment('fsReads', docs);
    }

    trackFirestoreWrite(docs = 1) {
        this.increment('fsWrites', docs);
    }

    // ==========================================
    // FINISH & EMIT
    // ==========================================

    finish(result: PipelineResult) {
        const latencyMs = Date.now() - this.startTime;

        const payload = {
            event: 'pipeline_metrics_v1',
            ...this.tags,
            ...result,
            latencyMs,

            // Flattened counters for easier log-based metric creation
            llmGenerateCalls: this.counts.llmGenerateCalls,
            llmEmbedCalls: this.counts.llmEmbedCalls,
            vectorQueries: this.counts.vectorQueries,
            fsReads: this.counts.fsReads,
            fsWrites: this.counts.fsWrites,
            fsTransactions: this.counts.fsTransactions,
            storageReads: this.counts.storageReads,
            externalCalls: this.counts.externalCalls,

            retrievedChunks: this.counts.retrievedChunks,
            retrievedChars: this.counts.retrievedChars,
            toolCalls: this.counts.toolCalls,
            attachmentsBytes: this.counts.attachmentsBytes
        };

        // Use structured logging
        logger.info('Pipeline Complete', payload);
    }
}
