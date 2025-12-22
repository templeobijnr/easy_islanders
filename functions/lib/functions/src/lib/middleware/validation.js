"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = validateRequest;
exports.validateParams = validateParams;
const errors_1 = require("../../utils/errors");
/**
 * Express middleware that validates req.body against a Zod schema.
 * If valid, attaches the parsed (and transformed) data to req.body.
 * If invalid, returns 400 with structured error details.
 */
function validateRequest(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const traceId = req.traceId || 'unknown';
            const errors = formatZodErrors(result.error);
            res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Request validation failed',
                    details: errors,
                    traceId,
                },
            });
            return;
        }
        // Replace body with parsed & transformed data
        req.body = result.data;
        next();
    };
}
/**
 * Formats Zod errors into a user-friendly structure.
 */
function formatZodErrors(error) {
    return error.errors.map((err) => ({
        path: err.path.join('.'),
        message: (0, errors_1.getErrorMessage)(err),
    }));
}
/**
 * Validates URL params against a Zod schema.
 */
function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            const traceId = req.traceId || 'unknown';
            const errors = formatZodErrors(result.error);
            res.status(400).json({
                success: false,
                error: {
                    code: 'PARAMS_VALIDATION_ERROR',
                    message: 'URL parameters validation failed',
                    details: errors,
                    traceId,
                },
            });
            return;
        }
        req.params = result.data;
        next();
    };
}
//# sourceMappingURL=validation.js.map