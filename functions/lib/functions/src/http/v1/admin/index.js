"use strict";
/**
 * Admin Router
 *
 * Routes for /v1/admin/*
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
const express_1 = require("express");
const middleware_1 = require("../../../lib/middleware");
const merchant_token_1 = require("./merchant-token");
const router = (0, express_1.Router)();
exports.adminRouter = router;
// All admin routes require authentication (and internal admin check)
router.use(middleware_1.authenticateUser);
/**
 * POST /v1/admin/merchant-token
 * Generate a magic link token for a merchant.
 */
router.post('/merchant-token', (0, middleware_1.validateRequest)(merchant_token_1.CreateMerchantTokenRequestSchema), merchant_token_1.createMerchantToken);
//# sourceMappingURL=index.js.map