"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onKnowledgeDocCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const knowledge_ingestion_service_1 = require("../api/services/knowledge-ingestion.service");
const request_context_1 = require("../utils/request-context");
const log_1 = require("../utils/log");
/**
 * Firestore Trigger: Knowledge Doc Ingestion
 *
 * When a knowledge doc is created in "processing" status, ingest it asynchronously:
 * - Extract text (text/url/pdf/image)
 * - Chunk + embed
 * - Write chunks + finalize doc
 *
 * This avoids relying on Cloud Tasks for ingestion so the system works in all environments.
 */
exports.onKnowledgeDocCreated = (0, firestore_1.onDocumentCreated)({
    document: 'businesses/{businessId}/knowledgeDocs/{docId}',
    database: 'easy-db',
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 1800,
    secrets: ['GEMINI_API_KEY']
}, async (event) => {
    const businessId = event.params.businessId;
    const docId = event.params.docId;
    if (!businessId || !docId) {
        log_1.log.error('[KnowledgeTrigger] Missing businessId/docId', undefined, { params: event.params });
        return;
    }
    const requestId = (0, request_context_1.getOrCreateRequestId)(event.id);
    await (0, request_context_1.runWithRequestContext)({ requestId, businessId, docId }, async () => {
        log_1.log.info('[KnowledgeTrigger] Ingesting knowledge doc');
        await knowledge_ingestion_service_1.knowledgeIngestionService.processKnowledgeDocIngestion({ businessId, docId });
    });
});
//# sourceMappingURL=knowledge.triggers.js.map