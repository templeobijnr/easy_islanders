"use strict";
/**
 * Typed Errors + Error Envelope (RUN-04)
 *
 * Standardized error types for consistent API responses.
 *
 * INVARIANTS:
 * - All errors have code, message, httpStatus, retryable.
 * - toErrorResponse returns stable envelope.
 * - All errors logged with traceId.
 * - No untyped errors escape to clients.
 *
 * @see Living Document Section 18.4 for invariants.
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
exports.AppError = void 0;
exports.toErrorResponse = toErrorResponse;
exports.getHttpStatus = getHttpStatus;
exports.isRetryable = isRetryable;
exports.getErrorMessage = getErrorMessage;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Application error with typed properties.
 */
class AppError extends Error {
    constructor(code, message, httpStatus = 500, retryable = false, cause) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.retryable = retryable;
        this.cause = cause;
        this.name = 'AppError';
    }
    static badRequest(message) {
        return new AppError('BAD_REQUEST', message, 400, false);
    }
    static unauthorized(message) {
        return new AppError('UNAUTHORIZED', message, 401, false);
    }
    static forbidden(message) {
        return new AppError('FORBIDDEN', message, 403, false);
    }
    static notFound(message) {
        return new AppError('NOT_FOUND', message, 404, false);
    }
    static conflict(message) {
        return new AppError('CONFLICT', message, 409, false);
    }
    static rateLimited(message) {
        return new AppError('RATE_LIMITED', message, 429, true);
    }
    static internal(message, cause) {
        return new AppError('INTERNAL_ERROR', message, 500, true, cause);
    }
    static unavailable(message) {
        return new AppError('SERVICE_UNAVAILABLE', message, 503, true);
    }
}
exports.AppError = AppError;
/**
 * Converts any error to a stable response envelope.
 */
function toErrorResponse(err, traceId) {
    if (err instanceof AppError) {
        logger.error('AppError occurred', {
            component: 'errors',
            event: 'app_error',
            traceId,
            errorCode: err.code,
            httpStatus: err.httpStatus,
            retryable: err.retryable,
            message: err.message,
        });
        return {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                retryable: err.retryable,
            },
            traceId,
        };
    }
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    logger.error('Unexpected error occurred', {
        component: 'errors',
        event: 'unexpected_error',
        traceId,
        errorCode: 'INTERNAL_ERROR',
        message,
    });
    return {
        success: false,
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            retryable: true,
        },
        traceId,
    };
}
/**
 * Gets HTTP status from any error.
 */
function getHttpStatus(err) {
    if (err instanceof AppError)
        return err.httpStatus;
    return 500;
}
/**
 * Checks if an error is retryable.
 */
function isRetryable(err) {
    if (err instanceof AppError)
        return err.retryable;
    return true;
}
/**
 * Gets error message from unknown error type.
 */
function getErrorMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === 'string')
        return error;
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    try {
        return JSON.stringify(error);
    }
    catch (_a) {
        return 'Unknown error';
    }
}
//# sourceMappingURL=errors.js.map