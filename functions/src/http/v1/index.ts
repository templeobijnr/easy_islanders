/**
 * V1 API Router
 * 
 * Main router for /v1/* endpoints.
 */

import { Router } from 'express';
import { jobsRouter } from './jobs';
import { adminRouter } from './admin';
import { merchantRouter } from './merchant';

const router = Router();

// Mount resource routers
router.use('/jobs', jobsRouter);
router.use('/admin', adminRouter);
router.use('/merchant', merchantRouter);

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

export { router as v1Router };
