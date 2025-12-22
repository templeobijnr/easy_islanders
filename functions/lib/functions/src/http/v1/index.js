"use strict";
/**
 * V1 API Router
 *
 * Main router for /v1/* endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.v1Router = void 0;
const express_1 = require("express");
const jobs_1 = require("./jobs");
const admin_1 = require("./admin");
const merchant_1 = require("./merchant");
const router = (0, express_1.Router)();
exports.v1Router = router;
// Mount resource routers
router.use('/jobs', jobs_1.jobsRouter);
router.use('/admin', admin_1.adminRouter);
router.use('/merchant', merchant_1.merchantRouter);
// Health check (no auth required)
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            version: 'v1',
            timestamp: new Date().toISOString(),
        },
    });
});
//# sourceMappingURL=index.js.map