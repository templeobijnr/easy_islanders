import { onDocumentCreated } from 'firebase-functions/v2/firestore';

import { knowledgeIngestionService } from '../api/services/knowledge-ingestion.service';
import { getOrCreateRequestId, runWithRequestContext } from '../utils/request-context';
import { log } from '../utils/log';

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
export const onKnowledgeDocCreated = onDocumentCreated(
    {
        document: 'businesses/{businessId}/knowledgeDocs/{docId}',
        database: 'easy-db',
        region: 'europe-west1',
        memory: '1GiB',
        timeoutSeconds: 1800,
        secrets: ['GEMINI_API_KEY']
    },
    async (event) => {
        const businessId = event.params.businessId as string | undefined;
        const docId = event.params.docId as string | undefined;

        if (!businessId || !docId) {
            log.error('[KnowledgeTrigger] Missing businessId/docId', undefined, { params: event.params as any });
            return;
        }

        const requestId = getOrCreateRequestId((event as any).id);
        await runWithRequestContext({ requestId, businessId, docId }, async () => {
            log.info('[KnowledgeTrigger] Ingesting knowledge doc');
            await knowledgeIngestionService.processKnowledgeDocIngestion({ businessId, docId });
        });
    }
);

