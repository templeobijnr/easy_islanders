/**
 * V1 API App Builder
 * 
 * Central Express app for V1 multi-tenant endpoints.
 * Separate from legacy app - Option A pattern.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

// Import V1 route modules
import { adminRoutes } from './routes/admin.routes';
import { claimRoutes } from './routes/claim.routes';
import { ownerRoutes } from './routes/owner.routes';
import { publicChatRoutes } from './routes/public-chat.routes';
import { attachRequestContext } from './middleware/request-context.middleware';

/**
 * Build and return the V1 Express app.
 */
export function createV1App(): express.Application {
    const app = express();

    // Security middleware
    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(attachRequestContext);

    // Health check
    app.get(['/health', '/v1/health'], (_req, res) => {
        res.json({
            status: 'ok',
            version: 'v1',
            timestamp: new Date().toISOString()
        });
    });

    // =====================
    // V1 Multi-Tenant Routes
    // =====================
    // Single gateway surface: /v1/**
    app.use('/v1/admin', adminRoutes);
    app.use('/v1/claim', claimRoutes);
    app.use('/v1/owner', ownerRoutes);
    app.use('/v1/public-chat', publicChatRoutes);

    return app;
}

// Export the built app
export const v1App = createV1App();
