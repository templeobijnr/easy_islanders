"use strict";
/**
 * Trace ID Middleware (OBS-02)
 *
 * Generates and propagates a traceId for every request.
 * Enables end-to-end request tracing and incident correlation.
 *
 * INVARIANTS:
 * - Every request MUST have a traceId.
 * - traceId is generated at ingress if not provided in X-Trace-ID header.
 * - traceId is attached to req.traceId for downstream access.
 * - All error responses include traceId for debugging.
 *
 * FAILURE MODE:
 * - If crypto fails, falls back to timestamp-based ID.
 * - Never blocks request processing.
 *
 * @see Living Document Section 17.2 for invariants.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACE_ID_HEADER = void 0;
exports.traceIdMiddleware = traceIdMiddleware;
exports.getTraceId = getTraceId;
exports.withTraceContext = withTraceContext;
exports.sendErrorWithTrace = sendErrorWithTrace;
const crypto_1 = require("crypto");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Header name for trace ID.
 */
exports.TRACE_ID_HEADER = 'X-Trace-ID';
/**
 * Generates a new trace ID.
 * Uses crypto.randomUUID() with timestamp fallback.
 */
function generateTraceId() {
    try {
        return (0, crypto_1.randomUUID)();
    }
    catch (_a) {
        // Fallback: timestamp + random suffix
        return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
}
/**
 * Express middleware that ensures every request has a traceId.
 * - Reads from X-Trace-ID header if present.
 * - Generates a new traceId if missing.
 * - Attaches to req.traceId for downstream use.
 * - Sets response header for client correlation.
 */
function traceIdMiddleware(req, res, next) {
    // Check for existing trace ID in header
    const existingTraceId = req.get(exports.TRACE_ID_HEADER);
    // Use existing or generate new
    const traceId = existingTraceId || generateTraceId();
    // Attach to request
    req.traceId = traceId;
    // Set response header for client correlation
    res.setHeader(exports.TRACE_ID_HEADER, traceId);
    // Log request start with traceId
    logger.info('Request started', {
        traceId,
        method: req.method,
        path: req.path,
        ip: req.ip,
    });
    next();
}
/**
 * Gets the traceId from a request, with fallback.
 * Use this in handlers that may not have traceId middleware.
 */
function getTraceId(req) {
    return req.traceId || 'unknown-trace';
}
/**
 * Creates a structured log context with traceId.
 * Use this to ensure all logs include the traceId.
 */
function withTraceContext(req, data) {
    return Object.assign({ traceId: getTraceId(req) }, data);
}
/**
 * Error response helper that includes traceId.
 * Use this for consistent error formatting.
 */
function sendErrorWithTrace(req, res, statusCode, message, code) {
    const traceId = getTraceId(req);
    logger.error('Request failed', {
        traceId,
        statusCode,
        message,
        code,
        path: req.path,
    });
    res.status(statusCode).json({
        success: false,
        error: message,
        code: code || 'ERROR',
        traceId,
    });
}
//# sourceMappingURL=traceId.middleware.js.map