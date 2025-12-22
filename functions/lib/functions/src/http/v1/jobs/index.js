"use strict";
/**
 * Jobs API Router - V1
 *
 * Exports Express router with all /v1/jobs endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../../../lib/middleware");
const create_1 = require("./create");
const confirm_1 = require("./confirm");
const get_1 = require("./get");
const dispatch_1 = require("./dispatch");
const router = (0, express_1.Router)();
exports.jobsRouter = router;
// All jobs routes require authentication
router.use(middleware_1.authenticateUser);
/**
 * POST /v1/jobs
 * Create a new job in 'collecting' status.
 */
router.post('/', (0, middleware_1.validateRequest)(create_1.CreateJobRequestSchema), create_1.createJob);
/**
 * POST /v1/jobs/:id/confirm
 * Transition job from 'collecting' to 'confirming'.
 */
router.post('/:id/confirm', (0, middleware_1.validateParams)(confirm_1.ConfirmJobParamsSchema), confirm_1.confirmJob);
/**
 * POST /v1/jobs/:id/dispatch
 * Send job to merchant via WhatsApp.
 */
router.post('/:id/dispatch', (0, middleware_1.validateParams)(dispatch_1.DispatchJobParamsSchema), dispatch_1.dispatchJob);
/**
 * GET /v1/jobs/:id
 * Get job details (owner only).
 */
router.get('/:id', (0, middleware_1.validateParams)(get_1.GetJobParamsSchema), get_1.getJob);
//# sourceMappingURL=index.js.map