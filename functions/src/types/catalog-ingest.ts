import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { IngestKind } from './merve';

export type IngestSource =
    | { type: 'url'; url: string }
    | { type: 'pdf'; storagePath: string }
    | { type: 'image'; storagePath: string };

export type CatalogIngestJobStatus = 'queued' | 'processing' | 'needs_review' | 'applied' | 'failed';

export interface CatalogIngestJob {
    marketId: string;
    listingId: string;
    kind: IngestKind;
    sources: IngestSource[];
    status: CatalogIngestJobStatus;
    idempotencyKey: string;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
    error?: string;
    proposalId?: string;
}

export type CatalogIngestProposalStatus = 'proposed' | 'applied' | 'rejected';

export interface CatalogIngestProposal {
    marketId: string;
    listingId: string;
    jobId: string;
    kind: IngestKind;
    sources: IngestSource[];
    status: CatalogIngestProposalStatus;
    extractedItems: Array<{
        id: string;
        name: string;
        description?: string | null;
        price?: number | null;
        currency?: string | null;
        category?: string | null;
        available?: boolean;
    }>;
    warnings: string[];
    diffSummary?: {
        added: number;
        updated: number;
        removed: number;
    };
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
    appliedAt?: Timestamp | FieldValue;
    rejectedAt?: Timestamp | FieldValue;
}

