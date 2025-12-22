/**
 * Admin Router
 * 
 * Routes for /v1/admin/*
 */

import { Router } from 'express';
import { validateRequest, authenticateUser } from '../../../lib/middleware';
import { createMerchantToken, CreateMerchantTokenRequestSchema } from './merchant-token';

const router = Router();

// All admin routes require authentication (and internal admin check)
router.use(authenticateUser);

/**
 * POST /v1/admin/merchant-token
 * Generate a magic link token for a merchant.
 */
router.post(
    '/merchant-token',
    validateRequest(CreateMerchantTokenRequestSchema),
    createMerchantToken
);

export { router as adminRouter };
