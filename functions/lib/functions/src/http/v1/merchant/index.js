"use strict";
/**
 * Merchant Router
 *
 * Routes for /v1/merchant/*
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../../../lib/middleware");
const session_1 = require("./session");
const auth_1 = require("./auth");
const jobs_1 = require("./jobs");
const actions_1 = require("./actions");
const router = (0, express_1.Router)();
exports.merchantRouter = router;
/**
 * POST /v1/merchant/session
 * Exchange magic link token for session JWT (no auth required)
 */
router.post('/session', (0, middleware_1.validateRequest)(session_1.ExchangeTokenRequestSchema), session_1.exchangeMerchantToken);
// All routes below require merchant session JWT
router.use(auth_1.authenticateMerchant);
/**
 * GET /v1/merchant/jobs
 * List jobs for the merchant's listing
 */
router.get('/jobs', jobs_1.getMerchantJobs);
/**
 * POST /v1/merchant/jobs/:id/accept
 * Accept a job
 */
router.post('/jobs/:id/accept', actions_1.acceptJob);
/**
 * POST /v1/merchant/jobs/:id/decline
 * Decline a job
 */
router.post('/jobs/:id/decline', (0, middleware_1.validateRequest)(actions_1.DeclineJobRequestSchema), actions_1.declineJob);
//# sourceMappingURL=index.js.map