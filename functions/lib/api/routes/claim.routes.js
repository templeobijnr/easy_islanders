"use strict";
/**
 * Claim Routes
 *
 * Endpoints for business claiming via phone OTP verification.
 * Routes are thin: apply middleware → call controller.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimRoutes = void 0;
const express_1 = require("express");
const auth_owner_1 = require("../middleware/auth-owner");
const claim_controller_1 = require("../controllers/claim.controller");
const router = (0, express_1.Router)();
exports.claimRoutes = router;
// All claim routes require authentication
router.use(auth_owner_1.isAuthenticated);
/**
 * POST /v1/claim/start
 * Start the claim process for a business.
 */
router.post('/start', claim_controller_1.claimStart);
/**
 * POST /v1/claim/confirm
 * Confirm claim with OTP verification.
 */
router.post('/confirm', claim_controller_1.claimConfirm);
/**
 * POST /v1/claim/dev-bypass
 * DEV ONLY: Claim without phone verification.
 */
router.post('/dev-bypass', claim_controller_1.claimDevBypass);
//# sourceMappingURL=claim.routes.js.map