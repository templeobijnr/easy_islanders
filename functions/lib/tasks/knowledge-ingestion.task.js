"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestKnowledgeDoc = void 0;
const tasks_1 = require("firebase-functions/v2/tasks");
const knowledge_ingestion_service_1 = require("../api/services/knowledge-ingestion.service");
const request_context_1 = require("../utils/request-context");
const log_1 = require("../utils/log");
/**
 * Task Queue worker: processes a knowledgeDoc ingestion job.
 */
exports.ingestKnowledgeDoc = (0, tasks_1.onTaskDispatched)({
    region: 'europe-west1',
    memory: '1GiB',
    timeoutSeconds: 1800,
    secrets: ['GEMINI_API_KEY'],
    retryConfig: {
        maxAttempts: 5,
        minBackoffSeconds: 60
    }
}, async (request) => {
    const { businessId, docId } = request.data || {};
    if (!businessId || !docId) {
        log_1.log.error('[IngestTask] Missing businessId/docId', undefined, { data: request.data });
        return;
    }
    const requestId = (0, request_context_1.getOrCreateRequestId)(request.id || request.name);
    await (0, request_context_1.runWithRequestContext)({ requestId, businessId, docId }, async () => {
        log_1.log.info('[IngestTask] Dispatching ingestion');
        await knowledge_ingestion_service_1.knowledgeIngestionService.processKnowledgeDocIngestion({ businessId, docId });
    });
});
//# sourceMappingURL=knowledge-ingestion.task.js.map