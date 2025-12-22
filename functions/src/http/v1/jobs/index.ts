/**
 * Jobs API Router - V1
 * 
 * Exports Express router with all /v1/jobs endpoints.
 */

import { Router } from 'express';
import { validateRequest, validateParams, authenticateUser } from '../../../lib/middleware';
import { createJob, CreateJobRequestSchema } from './create';
import { confirmJob, ConfirmJobParamsSchema } from './confirm';
import { getJob, GetJobParamsSchema } from './get';
import { dispatchJob, DispatchJobParamsSchema } from './dispatch';

const router = Router();

// All jobs routes require authentication
router.use(authenticateUser);

/**
 * POST /v1/jobs
 * Create a new job in 'collecting' status.
 */
router.post(
    '/',
    validateRequest(CreateJobRequestSchema),
    createJob
);

/**
 * POST /v1/jobs/:id/confirm
 * Transition job from 'collecting' to 'confirming'.
 */
router.post(
    '/:id/confirm',
    validateParams(ConfirmJobParamsSchema),
    confirmJob
);

/**
 * POST /v1/jobs/:id/dispatch
 * Send job to merchant via WhatsApp.
 */
router.post(
    '/:id/dispatch',
    validateParams(DispatchJobParamsSchema),
    dispatchJob
);

/**
 * GET /v1/jobs/:id
 * Get job details (owner only).
 */
router.get(
    '/:id',
    validateParams(GetJobParamsSchema),
    getJob
);

export { router as jobsRouter };
