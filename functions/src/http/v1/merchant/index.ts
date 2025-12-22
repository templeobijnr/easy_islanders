/**
 * Merchant Router
 * 
 * Routes for /v1/merchant/*
 */

import { Router } from 'express';
import { validateRequest } from '../../../lib/middleware';
import { exchangeMerchantToken, ExchangeTokenRequestSchema } from './session';
import { authenticateMerchant } from './auth';
import { getMerchantJobs } from './jobs';
import { acceptJob, declineJob, DeclineJobRequestSchema } from './actions';

const router = Router();

/**
 * POST /v1/merchant/session
 * Exchange magic link token for session JWT (no auth required)
 */
router.post(
    '/session',
    validateRequest(ExchangeTokenRequestSchema),
    exchangeMerchantToken
);

// All routes below require merchant session JWT
router.use(authenticateMerchant);

/**
 * GET /v1/merchant/jobs
 * List jobs for the merchant's listing
 */
router.get('/jobs', getMerchantJobs);

/**
 * POST /v1/merchant/jobs/:id/accept
 * Accept a job
 */
router.post('/jobs/:id/accept', acceptJob);

/**
 * POST /v1/merchant/jobs/:id/decline
 * Decline a job
 */
router.post(
    '/jobs/:id/decline',
    validateRequest(DeclineJobRequestSchema),
    declineJob
);

export { router as merchantRouter };
