import { onTaskDispatched, Request } from 'firebase-functions/v2/tasks';

import {
    KnowledgeIngestTaskPayload,
    knowledgeIngestionService
} from '../api/services/knowledge-ingestion.service';
import { getOrCreateRequestId, runWithRequestContext } from '../utils/request-context';
import { log } from '../utils/log';

/**
 * Task Queue worker: processes a knowledgeDoc ingestion job.
 */
export const ingestKnowledgeDoc = onTaskDispatched(
    {
        region: 'europe-west1',
        memory: '1GiB',
        timeoutSeconds: 1800,
        secrets: ['GEMINI_API_KEY'],
        retryConfig: {
            maxAttempts: 5,
            minBackoffSeconds: 60
        }
    },
    async (request: Request<KnowledgeIngestTaskPayload>) => {
        const { businessId, docId } = request.data || {};
        if (!businessId || !docId) {
            log.error('[IngestTask] Missing businessId/docId', undefined, { data: request.data as any });
            return;
        }

        const requestId = getOrCreateRequestId((request as any).id || (request as any).name);
        await runWithRequestContext({ requestId, businessId, docId }, async () => {
            log.info('[IngestTask] Dispatching ingestion');
            await knowledgeIngestionService.processKnowledgeDocIngestion({ businessId, docId });
        });
    }
);
