import { getErrorMessage } from '../../utils/errors';
/**
 * Zod Validation Middleware for Express
 * 
 * Validates request body against a Zod schema and attaches parsed data to request.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware that validates req.body against a Zod schema.
 * If valid, attaches the parsed (and transformed) data to req.body.
 * If invalid, returns 400 with structured error details.
 */
export function validateRequest<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const traceId = (req as any).traceId || 'unknown';
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
function formatZodErrors(error: ZodError): Array<{ path: string; message: string }> {
    return error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message || 'Validation error',
    }));
}

/**
 * Validates URL params against a Zod schema.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const traceId = (req as any).traceId || 'unknown';
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

        req.params = result.data as any;
        next();
    };
}
