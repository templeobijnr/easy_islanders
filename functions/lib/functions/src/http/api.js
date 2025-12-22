"use strict";
/**
 * V1 API Express Application
 *
 * Sets up Express with middleware and mounts v1 router.
 * Exported as Firebase HTTP function.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiApp = void 0;
exports.createApiApp = createApiApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const middleware_1 = require("../lib/middleware");
const v1_1 = require("./v1");
/**
 * Creates and configures the Express application.
 */
function createApiApp() {
    const app = (0, express_1.default)();
    // ==========================================================================
    // SECURITY MIDDLEWARE
    // ==========================================================================
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false, // Handled by Firebase Hosting
    }));
    app.use((0, cors_1.default)({
        origin: true, // Allow all origins in V1 (tighten in production)
    }));
    // ==========================================================================
    // PARSING MIDDLEWARE
    // ==========================================================================
    app.use(express_1.default.json({ limit: '1mb' }));
    // ==========================================================================
    // TRACING
    // ==========================================================================
    app.use(middleware_1.attachTraceId);
    // ==========================================================================
    // API ROUTES
    // ==========================================================================
    app.use('/v1', v1_1.v1Router);
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
    app.use(middleware_1.errorHandler);
    return app;
}
// Create singleton app instance
exports.apiApp = createApiApp();
//# sourceMappingURL=api.js.map