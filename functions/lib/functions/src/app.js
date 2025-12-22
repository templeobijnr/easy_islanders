"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const routes_1 = __importDefault(require("./routes"));
const request_context_middleware_1 = require("./api/middleware/request-context.middleware");
const traceId_middleware_1 = require("./middleware/traceId.middleware");
const maintenance_middleware_1 = require("./middleware/maintenance.middleware");
const circuitBreaker_middleware_1 = require("./middleware/circuitBreaker.middleware");
const app = (0, express_1.default)();
// Security & Parsing Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: true })); // Allow all origins for dev; restrict in prod
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false })); // Needed for Twilio form posts
// OBS-02: Trace ID (MUST be first for logging correlation)
app.use(traceId_middleware_1.traceIdMiddleware);
// HUM-04: Maintenance Mode Kill Switch (MUST be before business logic)
app.use(maintenance_middleware_1.maintenanceMiddleware);
// CASC-03B: Circuit Breaker (MUST be after maintenance, before routes)
app.use(circuitBreaker_middleware_1.circuitBreakerMiddleware);
app.use(request_context_middleware_1.attachRequestContext);
// Legacy API Routes (intentionally NOT mounted under /v1)
app.use('/legacy', routes_1.default);
app.use('/v1', routes_1.default); // Alias: Client expects /v1/chat/message to map to legacy router
// Health Check Endpoint (Essential for "God Mode" monitoring later)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        system: 'Easy Islanders Backend',
        timestamp: new Date().toISOString()
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map