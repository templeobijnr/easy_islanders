"use strict";
/**
 * V1 API App Builder
 *
 * Central Express app for V1 multi-tenant endpoints.
 * Separate from legacy app - Option A pattern.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.v1App = void 0;
exports.createV1App = createV1App;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
// Import V1 route modules
const admin_routes_1 = require("./routes/admin.routes");
const claim_routes_1 = require("./routes/claim.routes");
const owner_routes_1 = require("./routes/owner.routes");
const public_chat_routes_1 = require("./routes/public-chat.routes");
const request_context_middleware_1 = require("./middleware/request-context.middleware");
/**
 * Build and return the V1 Express app.
 */
function createV1App() {
    const app = (0, express_1.default)();
    // Security middleware
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(request_context_middleware_1.attachRequestContext);
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
    app.use('/v1/admin', admin_routes_1.adminRoutes);
    app.use('/v1/claim', claim_routes_1.claimRoutes);
    app.use('/v1/owner', owner_routes_1.ownerRoutes);
    app.use('/v1/public-chat', public_chat_routes_1.publicChatRoutes);
    return app;
}
// Export the built app
exports.v1App = createV1App();
//# sourceMappingURL=app.js.map