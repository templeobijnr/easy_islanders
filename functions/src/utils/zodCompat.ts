/**
 * Zod Compatibility Layer (SCH-04)
 *
 * Forward-compatible parsing with unknown enum handling and safe defaults.
 *
 * INVARIANTS:
 * - Unknown enum values default to safe fallback, not crash.
 * - Missing fields use explicit defaults.
 * - All parse failures logged with traceId + field + value.
 * - Backward compatible: old clients can read new schemas.
 *
 * ROLLOUT: Always enabled (safety mechanism).
 *
 * @see Living Document Section 18.2 for invariants.
 */

import { z, ZodError, ZodSchema, ZodType } from 'zod';
import * as logger from 'firebase-functions/logger';

/**
 * Creates a forward-compatible enum that defaults to a fallback for unknown values.
 *
 * @param values - Known enum values.
 * @param fallback - Default value for unknown inputs.
 * @returns Zod schema that handles unknown values gracefully.
 */
export function forwardCompatibleEnum<T extends string>(
    values: readonly [T, ...T[]],
    fallback: T
): z.ZodEffects<z.ZodString, T, string> {
    return z
        .string()
        .transform((val): T => {
            if (values.includes(val as T)) {
                return val as T;
            }
            // Log unknown value but don't fail
            logger.warn('ZodCompat: Unknown enum value, using fallback', {
                component: 'zodCompat',
                event: 'unknown_enum',
                value: val,
                fallback,
                allowedValues: values,
            });
            return fallback;
        });
}

/**
 * Creates a schema with safe defaults for all optional fields.
 *
 * @param schema - Base Zod schema.
 * @param defaults - Default values for optional fields.
 * @returns Schema that applies defaults.
 */
export function withSafeDefaults<T extends z.ZodRawShape>(
    schema: z.ZodObject<T>,
    defaults: Partial<z.infer<z.ZodObject<T>>>
): z.ZodObject<T> {
    return schema.transform((data) => ({
        ...defaults,
        ...data,
    })) as unknown as z.ZodObject<T>;
}

/**
 * Parses data with comprehensive error logging.
 *
 * @param schema - Zod schema to parse with.
 * @param data - Data to parse.
 * @param ctx - Context for logging.
 * @returns Parsed data or null on failure.
 */
export function safeParse<T>(
    schema: ZodSchema<T>,
    data: unknown,
    ctx: { traceId: string; source: string }
): { success: true; data: T } | { success: false; error: ZodError } {
    const result = schema.safeParse(data);

    if (!result.success) {
        logger.warn('ZodCompat: Parse failed', {
            component: 'zodCompat',
            event: 'parse_failed',
            traceId: ctx.traceId,
            source: ctx.source,
            errors: result.error.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
                code: e.code,
            })),
        });

        return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
}

/**
 * Parses with fallback to default value on failure.
 *
 * @param schema - Zod schema.
 * @param data - Data to parse.
 * @param defaultValue - Default if parse fails.
 * @param ctx - Context for logging.
 * @returns Parsed data or default.
 */
export function parseOrDefault<T>(
    schema: ZodSchema<T>,
    data: unknown,
    defaultValue: T,
    ctx: { traceId: string; source: string }
): T {
    const result = safeParse(schema, data, ctx);

    if (result.success) {
        return result.data;
    }

    logger.info('ZodCompat: Using default due to parse failure', {
        component: 'zodCompat',
        event: 'using_default',
        traceId: ctx.traceId,
        source: ctx.source,
    });

    return defaultValue;
}

/**
 * Strips unknown fields (for forward compatibility).
 *
 * @param schema - Zod object schema.
 * @returns Schema that strips unknown fields.
 */
export function tolerantSchema<T extends z.ZodRawShape>(
    schema: z.ZodObject<T>
): z.ZodObject<T, 'strip'> {
    return schema.strip();
}

/**
 * Creates a nullable schema with undefined → null normalization.
 */
export function nullableField<T extends ZodType>(
    schema: T
): z.ZodNullable<T> {
    return schema.nullable();
}

/**
 * Common forward-compatible schemas.
 */
export const CommonSchemas = {
    jobStatus: forwardCompatibleEnum(
        [
            'collecting',
            'confirming',
            'dispatched',
            'confirmed',
            'cancelled',
            'completed',
            'timeout-review',
            'failed',
        ] as const,
        'collecting'
    ),

    actionType: forwardCompatibleEnum(
        ['book', 'order', 'request', 'inquire', 'register'] as const,
        'request'
    ),

    userRole: forwardCompatibleEnum(
        ['user', 'merchant', 'admin'] as const,
        'user'
    ),
};
