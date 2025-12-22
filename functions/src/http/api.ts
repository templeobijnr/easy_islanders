/**
 * V1 API Express Application
 * 
 * Sets up Express with middleware and mounts v1 router.
 * Exported as Firebase HTTP function.
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { attachTraceId, errorHandler } from '../lib/middleware';
import { v1Router } from './v1';

/**
 * Creates and configures the Express application.
 */
export function createApiApp(): Express {
    const app = express();

    // ==========================================================================
    // SECURITY MIDDLEWARE
    // ==========================================================================
    app.use(helmet({
        contentSecurityPolicy: false, // Handled by Firebase Hosting
    }));

    app.use(cors({
        origin: true, // Allow all origins in V1 (tighten in production)
    }));

    // ==========================================================================
    // PARSING MIDDLEWARE
    // ==========================================================================
    app.use(express.json({ limit: '1mb' }));

    // ==========================================================================
    // TRACING
    // ==========================================================================
    app.use(attachTraceId);

    // ==========================================================================
    // API ROUTES
    // ==========================================================================
    app.use('/v1', v1Router);

    // Root health check
    app.get('/', (_req, res) => {
        res.json({
            success: true,
            data: {
                name: 'AskMerve API',
                version: '1.0.0',
                timestamp: new Date().toISOString(),
            },
        });
    });

    // 404 handler
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'Endpoint not found',
            },
        });
    });

    // ==========================================================================
    // ERROR HANDLER (must be last)
    // ==========================================================================
    app.use(errorHandler);

    return app;
}

// Create singleton app instance
export const apiApp = createApiApp();
