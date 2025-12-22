/**
 * Claim Routes
 * 
 * Endpoints for business claiming via phone OTP verification.
 * Routes are thin: apply middleware → call controller.
 */

import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth-owner';
import { claimStart, claimConfirm, claimDevBypass } from '../controllers/claim.controller';

const router = Router();

// All claim routes require authentication
router.use(isAuthenticated);

/**
 * POST /v1/claim/start
 * Start the claim process for a business.
 */
router.post('/start', claimStart);

/**
 * POST /v1/claim/confirm
 * Confirm claim with OTP verification.
 */
router.post('/confirm', claimConfirm);

/**
 * POST /v1/claim/dev-bypass
 * DEV ONLY: Claim without phone verification.
 */
router.post('/dev-bypass', claimDevBypass);

export { router as claimRoutes };
