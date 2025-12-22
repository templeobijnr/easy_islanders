import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';

import { db } from '../../config/firebase';
import { CatalogIngestJob, CatalogIngestProposal, IngestSource } from '../../types/catalog-ingest';
import { IngestKind } from '../../types/merve';
import { log } from '../../utils/log';
import { normalizeCatalogItem } from '../../triggers/catalog-ingest.triggers';


function sha256Hex(input: string): string {
    return createHash('sha256').update(input).digest('hex');
}

function isIngestKind(kind: any): kind is IngestKind {
    return ['menuItems', 'services', 'offerings', 'tickets', 'roomTypes'].includes(kind);
}

function storagePathFromUrl(rawUrl: string): string | null {
    try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname.toLowerCase();

        // Firebase Storage download URL:
        // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?alt=media&token=...
        if (host === 'firebasestorage.googleapis.com' || host.endsWith('.firebasestorage.googleapis.com')) {
            const match = parsed.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)$/);
            if (!match) return null;
            return decodeURIComponent(match[1]);
        }

        // GCS public URL:
        // https://storage.googleapis.com/<bucket>/<objectPath>
        if (host === 'storage.googleapis.com') {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length < 2) return null;
            return parts.slice(1).join('/');
        }

        return null;
    } catch {
        return null;
    }
}

function normalizeSources(raw: any): IngestSource[] {
    if (!Array.isArray(raw)) return [];
    const sources: IngestSource[] = [];
    for (const s of raw) {
        if (!s || typeof s !== 'object') continue;
        if (s.type === 'url' && typeof s.url === 'string' && s.url.trim()) {
            sources.push({ type: 'url', url: s.url.trim() });
        } else if (s.type === 'pdf') {
            const storagePath =
                typeof s.storagePath === 'string' && s.storagePath.trim()
                    ? s.storagePath.trim()
                    : typeof s.url === 'string' && s.url.trim()
                        ? storagePathFromUrl(s.url.trim())
                        : null;
            if (storagePath) {
                sources.push({ type: 'pdf', storagePath });
            } else if (typeof s.url === 'string' && s.url.trim()) {
                // Allow direct PDF links by normalizing to a URL source (content-type sniffing happens at extraction time).
                sources.push({ type: 'url', url: s.url.trim() });
            }
        } else if (s.type === 'image') {
            const storagePath =
                typeof s.storagePath === 'string' && s.storagePath.trim()
                    ? s.storagePath.trim()
                    : typeof s.url === 'string' && s.url.trim()
                        ? storagePathFromUrl(s.url.trim())
                        : null;
            if (storagePath) {
                sources.push({ type: 'image', storagePath });
            } else if (typeof s.url === 'string' && s.url.trim()) {
                // Allow direct image links by normalizing to a URL source (content-type sniffing happens at extraction time).
                sources.push({ type: 'url', url: s.url.trim() });
            }
        }
    }
    return sources;
}

/**
 * POST /v1/admin/catalog-ingest/jobs
 *
 * Body:
 * - marketId: string
 * - listingId: string
 * - kind: IngestKind
 * - sources: IngestSource[]
 */
export async function createCatalogIngestJob(req: Request, res: Response): Promise<void> {
    const { marketId, listingId, kind, sources } = req.body || {};

    if (!marketId || typeof marketId !== 'string') {
        res.status(400).json({ success: false, error: 'marketId required' });
        return;
    }
    if (!listingId || typeof listingId !== 'string') {
        res.status(400).json({ success: false, error: 'listingId required' });
        return;
    }
    if (!isIngestKind(kind)) {
        res.status(400).json({ success: false, error: 'kind must be one of: menuItems, services, offerings, tickets, roomTypes' });
        return;
    }

    const normalizedSources = normalizeSources(sources);
    if (normalizedSources.length === 0) {
        res.status(400).json({ success: false, error: 'At least one source is required' });
        return;
    }

    // Include listingId to avoid cross-listing job reuse for the same URL/PDF/image.
    const idempotencyKey = sha256Hex(`${listingId}:${kind}:${JSON.stringify(normalizedSources)}`);

    try {
        // Best-effort idempotency: reuse an existing non-terminal job for this listing+kind+sources.
        const existing = await db
            .collection(`markets/${marketId}/catalogIngestJobs`)
            .where('idempotencyKey', '==', idempotencyKey)
            .limit(10)
            .get()
            .catch((): null => null);

        if (existing && !existing.empty) {
            const reusable = existing.docs.find((docSnap) => {
                const data = docSnap.data() as Partial<CatalogIngestJob>;
                return data.status === 'queued' || data.status === 'processing' || data.status === 'needs_review';
            });
            if (reusable) {
                res.json({ success: true, jobId: reusable.id, reused: true });
                return;
            }
        }

        const jobRef = db.collection(`markets/${marketId}/catalogIngestJobs`).doc();
        const now = admin.firestore.FieldValue.serverTimestamp();

        const job: Omit<CatalogIngestJob, 'createdAt' | 'updatedAt'> & any = {
            marketId,
            listingId,
            kind,
            sources: normalizedSources,
            status: 'queued',
            idempotencyKey,
        };

        await jobRef.set({ ...job, createdAt: now, updatedAt: now });
        log.info('[CatalogIngest] Job created', { marketId, listingId, kind, jobId: jobRef.id });

        res.status(201).json({ success: true, jobId: jobRef.id, reused: false });
    } catch (error: unknown) {
        log.error('[CatalogIngest] create job failed', error, { marketId, listingId });
        res.status(500).json({ success: false, error: 'Failed to create ingest job' });
    }
}

/**
 * POST /v1/admin/catalog-ingest/listings/:listingId/proposals/:proposalId/apply
 */
export async function applyCatalogIngestProposal(req: Request, res: Response): Promise<void> {
    const { listingId, proposalId } = req.params as { listingId?: string; proposalId?: string };

    if (!listingId || !proposalId) {
        res.status(400).json({ success: false, error: 'listingId and proposalId required' });
        return;
    }

    const proposalRef = db.collection('listings').doc(listingId).collection('ingestProposals').doc(proposalId);

    try {
        const proposalSnap = await proposalRef.get();
        if (!proposalSnap.exists) {
            res.status(404).json({ success: false, error: 'Proposal not found' });
            return;
        }

        const proposal = proposalSnap.data() as CatalogIngestProposal;
        if (proposal.status !== 'proposed') {
            res.status(400).json({ success: false, error: `Proposal already ${proposal.status}` });
            return;
        }

        const kind = proposal.kind;
        const items = Array.isArray(proposal.extractedItems) ? proposal.extractedItems : [];

        await db.runTransaction(async (tx) => {
            const now = admin.firestore.FieldValue.serverTimestamp();
            const subcol = db.collection('listings').doc(listingId).collection(kind);

            // Upsert extracted items using normalizer for consistent schema
            // Get image URL from source if available (for image imports)
            // Handle both URL-based and storage-based sources
            let sourceImageUrl: string | undefined;
            if (Array.isArray(proposal.sources)) {
                for (const s of proposal.sources) {
                    if (s.type === 'url' && s.url?.startsWith('http')) {
                        sourceImageUrl = s.url;
                        break;
                    }
                    // Cast to any to handle both url and storagePath properties
                    const anySource = s as any;
                    if ((s.type === 'image' || s.type === 'pdf') && anySource.url?.startsWith('http')) {
                        sourceImageUrl = anySource.url;
                        break;
                    }
                }
            }

            items.forEach((item, idx) => {
                const normalized = normalizeCatalogItem(item, idx, kind, sourceImageUrl);
                tx.set(subcol.doc(normalized.id), {
                    ...normalized,
                    updatedAt: now,
                    createdAt: now,
                }, { merge: true });
            });

            tx.set(proposalRef, { status: 'applied', appliedAt: now, updatedAt: now }, { merge: true });

            // Best-effort: mark job applied too
            if (proposal.jobId && proposal.marketId) {
                const jobRef = db.doc(`markets/${proposal.marketId}/catalogIngestJobs/${proposal.jobId}`);
                tx.set(jobRef, { status: 'applied', updatedAt: now }, { merge: true });
            }
        });

        res.json({ success: true });
    } catch (error: unknown) {
        log.error('[CatalogIngest] apply proposal failed', error, { listingId, proposalId });
        res.status(500).json({ success: false, error: 'Failed to apply proposal' });
    }
}

/**
 * POST /v1/admin/catalog-ingest/listings/:listingId/proposals/:proposalId/reject
 */
export async function rejectCatalogIngestProposal(req: Request, res: Response): Promise<void> {
    const { listingId, proposalId } = req.params as { listingId?: string; proposalId?: string };
    if (!listingId || !proposalId) {
        res.status(400).json({ success: false, error: 'listingId and proposalId required' });
        return;
    }

    const proposalRef = db.collection('listings').doc(listingId).collection('ingestProposals').doc(proposalId);

    try {
        const snap = await proposalRef.get();
        if (!snap.exists) {
            res.status(404).json({ success: false, error: 'Proposal not found' });
            return;
        }

        const proposal = snap.data() as CatalogIngestProposal;
        if (proposal.status !== 'proposed') {
            res.status(400).json({ success: false, error: `Proposal already ${proposal.status}` });
            return;
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        await proposalRef.set({ status: 'rejected', rejectedAt: now, updatedAt: now }, { merge: true });
        if (proposal.jobId && proposal.marketId) {
            await db.doc(`markets/${proposal.marketId}/catalogIngestJobs/${proposal.jobId}`).set({ status: 'failed', error: 'Rejected by admin', updatedAt: now }, { merge: true });
        }

        res.json({ success: true });
    } catch (error: unknown) {
        log.error('[CatalogIngest] reject proposal failed', error, { listingId, proposalId });
        res.status(500).json({ success: false, error: 'Failed to reject proposal' });
    }
}
