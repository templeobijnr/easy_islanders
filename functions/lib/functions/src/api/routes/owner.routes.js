"use strict";
/**
 * Owner Routes (V1)
 *
 * Endpoints for business owners to manage their AI agent.
 * All routes use TenantContext - businessId never from client.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownerRoutes = void 0;
const express_1 = require("express");
const auth_owner_1 = require("../middleware/auth-owner");
const require_claimed_1 = require("../middleware/require-claimed");
// Knowledge (new secure controller)
const knowledge_controller_1 = require("../controllers/knowledge.controller");
// Products (new secure controller)
const products_controller_1 = require("../controllers/products.controller");
// Legacy owner controller (business, inbox, leads)
const owner_controller_1 = require("../controllers/owner.controller");
const router = (0, express_1.Router)();
exports.ownerRoutes = router;
// ========================================
// Pre-claim routes (authenticated but not necessarily claimed)
// ========================================
router.get('/businesses', auth_owner_1.isAuthenticated, owner_controller_1.listBusinesses);
router.post('/switch-business', auth_owner_1.isAuthenticated, owner_controller_1.switchBusiness);
router.get('/entitlements', auth_owner_1.isAuthenticated, owner_controller_1.getEntitlements);
// ========================================
// Post-claim routes (require active business)
// ========================================
router.use(auth_owner_1.requireOwner);
router.use(require_claimed_1.requireClaimed);
// Business Profile
router.get('/business', owner_controller_1.getBusiness);
// Knowledge Management (V1 - Secure)
router.get('/knowledge-docs', knowledge_controller_1.listKnowledgeDocs);
router.post('/knowledge-docs', knowledge_controller_1.createKnowledgeDoc);
router.patch('/knowledge-docs/:docId', knowledge_controller_1.updateKnowledgeDoc);
router.post('/knowledge-docs/extract-products', knowledge_controller_1.extractProducts);
router.post('/knowledge-docs/test-query', knowledge_controller_1.testQuery);
// Products (V1 - Tenant-rooted)
router.get('/products', products_controller_1.listProducts);
router.post('/products/batch', products_controller_1.batchCreateProducts);
// Inbox & Leads
router.get('/inbox', owner_controller_1.getInbox);
router.get('/inbox/:sessionId/messages', owner_controller_1.getInboxMessages);
router.get('/leads', owner_controller_1.getLeads);
//# sourceMappingURL=owner.routes.js.map