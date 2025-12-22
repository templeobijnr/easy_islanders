"use strict";
/**
 * Admin Routes (V1)
 *
 * Admin-only tooling endpoints. Keep this surface minimal and explicit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = require("express");
const auth_admin_1 = require("../middleware/auth-admin");
const admin_controller_1 = require("../controllers/admin.controller");
const catalog_ingest_controller_1 = require("../controllers/catalog-ingest.controller");
const router = (0, express_1.Router)();
exports.adminRoutes = router;
router.use(auth_admin_1.requireAdmin);
router.post('/assign-owner', admin_controller_1.assignOwner);
router.post('/entitlements', admin_controller_1.updateEntitlements);
// Listing data ingestion (URL/PDF/image → job → proposal → review → publish)
router.post('/catalog-ingest/jobs', catalog_ingest_controller_1.createCatalogIngestJob);
router.post('/catalog-ingest/listings/:listingId/proposals/:proposalId/apply', catalog_ingest_controller_1.applyCatalogIngestProposal);
router.post('/catalog-ingest/listings/:listingId/proposals/:proposalId/reject', catalog_ingest_controller_1.rejectCatalogIngestProposal);
//# sourceMappingURL=admin.routes.js.map