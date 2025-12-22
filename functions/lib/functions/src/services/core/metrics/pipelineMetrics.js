"use strict";
/**
 * Pipeline Metrics Service
 *
 * Provides structured logging for "pipeline invocations" (chat turns, webhooks, triggers).
 * Emits a single 'pipeline_metrics_v1' JSON log at the end of execution.
 *
 * Used to generate logs-based metrics in Cloud Monitoring.
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
exports.PipelineMetrics = void 0;
const logger = __importStar(require("firebase-functions/logger"));
class PipelineMetrics {
    constructor(tags) {
        // Counters
        this.counts = {
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
        this.startTime = Date.now();
        this.tags = tags;
    }
    // ==========================================
    // INCREMENTERS
    // ==========================================
    increment(metric, amount = 1) {
        if (typeof this.counts[metric] === 'number') {
            this.counts[metric] += amount;
        }
    }
    trackExternal(provider, amount = 1) {
        this.counts.externalCalls[provider] += amount;
    }
    // ==========================================
    // HELPERS FOR COMMON OPERATIONS
    // ==========================================
    trackLLM(model) {
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
    finish(result) {
        const latencyMs = Date.now() - this.startTime;
        const payload = Object.assign(Object.assign(Object.assign({ event: 'pipeline_metrics_v1' }, this.tags), result), { latencyMs, 
            // Flattened counters for easier log-based metric creation
            llmGenerateCalls: this.counts.llmGenerateCalls, llmEmbedCalls: this.counts.llmEmbedCalls, vectorQueries: this.counts.vectorQueries, fsReads: this.counts.fsReads, fsWrites: this.counts.fsWrites, fsTransactions: this.counts.fsTransactions, storageReads: this.counts.storageReads, externalCalls: this.counts.externalCalls, retrievedChunks: this.counts.retrievedChunks, retrievedChars: this.counts.retrievedChars, toolCalls: this.counts.toolCalls, attachmentsBytes: this.counts.attachmentsBytes });
        // Use structured logging
        logger.info('Pipeline Complete', payload);
    }
}
exports.PipelineMetrics = PipelineMetrics;
//# sourceMappingURL=pipelineMetrics.js.map