/**
 * Admin Routes (V1)
 *
 * Admin-only tooling endpoints. Keep this surface minimal and explicit.
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth-admin';
import { assignOwner, updateEntitlements } from '../controllers/admin.controller';
import { applyCatalogIngestProposal, createCatalogIngestJob, rejectCatalogIngestProposal } from '../controllers/catalog-ingest.controller';

const router = Router();

router.use(requireAdmin);

router.post('/assign-owner', assignOwner);
router.post('/entitlements', updateEntitlements);

// Listing data ingestion (URL/PDF/image → job → proposal → review → publish)
router.post('/catalog-ingest/jobs', createCatalogIngestJob);
router.post('/catalog-ingest/listings/:listingId/proposals/:proposalId/apply', applyCatalogIngestProposal);
router.post('/catalog-ingest/listings/:listingId/proposals/:proposalId/reject', rejectCatalogIngestProposal);

export { router as adminRoutes };
