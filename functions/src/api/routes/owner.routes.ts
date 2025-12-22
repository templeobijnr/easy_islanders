/**
 * Owner Routes (V1)
 * 
 * Endpoints for business owners to manage their AI agent.
 * All routes use TenantContext - businessId never from client.
 */

import { Router } from 'express';
import { requireOwner, isAuthenticated } from '../middleware/auth-owner';
import { requireClaimed } from '../middleware/require-claimed';

// Knowledge (new secure controller)
import {
    listKnowledgeDocs,
    createKnowledgeDoc,
    updateKnowledgeDoc,
    extractProducts as extractKnowledgeProducts,
    testQuery
} from '../controllers/knowledge.controller';

// Products (new secure controller)
import {
    listProducts,
    batchCreateProducts
} from '../controllers/products.controller';

// Legacy owner controller (business, inbox, leads)
import {
    getBusiness,
    getInbox,
    getInboxMessages,
    getLeads,
    listBusinesses,
    switchBusiness,
    getEntitlements
} from '../controllers/owner.controller';

const router = Router();

// ========================================
// Pre-claim routes (authenticated but not necessarily claimed)
// ========================================
router.get('/businesses', isAuthenticated, listBusinesses);
router.post('/switch-business', isAuthenticated, switchBusiness);
router.get('/entitlements', isAuthenticated, getEntitlements);

// ========================================
// Post-claim routes (require active business)
// ========================================
router.use(requireOwner);
router.use(requireClaimed);

// Business Profile
router.get('/business', getBusiness);

// Knowledge Management (V1 - Secure)
router.get('/knowledge-docs', listKnowledgeDocs);
router.post('/knowledge-docs', createKnowledgeDoc);
router.patch('/knowledge-docs/:docId', updateKnowledgeDoc);
router.post('/knowledge-docs/extract-products', extractKnowledgeProducts);
router.post('/knowledge-docs/test-query', testQuery);

// Products (V1 - Tenant-rooted)
router.get('/products', listProducts);
router.post('/products/batch', batchCreateProducts);

// Inbox & Leads
router.get('/inbox', getInbox);
router.get('/inbox/:sessionId/messages', getInboxMessages);
router.get('/leads', getLeads);

export { router as ownerRoutes };
