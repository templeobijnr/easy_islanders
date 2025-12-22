"use strict";
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
exports.CommonSchemas = void 0;
exports.forwardCompatibleEnum = forwardCompatibleEnum;
exports.withSafeDefaults = withSafeDefaults;
exports.safeParse = safeParse;
exports.parseOrDefault = parseOrDefault;
exports.tolerantSchema = tolerantSchema;
exports.nullableField = nullableField;
const zod_1 = require("zod");
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Creates a forward-compatible enum that defaults to a fallback for unknown values.
 *
 * @param values - Known enum values.
 * @param fallback - Default value for unknown inputs.
 * @returns Zod schema that handles unknown values gracefully.
 */
function forwardCompatibleEnum(values, fallback) {
    return zod_1.z
        .string()
        .transform((val) => {
        if (values.includes(val)) {
            return val;
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
function withSafeDefaults(schema, defaults) {
    return schema.transform((data) => (Object.assign(Object.assign({}, defaults), data)));
}
/**
 * Parses data with comprehensive error logging.
 *
 * @param schema - Zod schema to parse with.
 * @param data - Data to parse.
 * @param ctx - Context for logging.
 * @returns Parsed data or null on failure.
 */
function safeParse(schema, data, ctx) {
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
function parseOrDefault(schema, data, defaultValue, ctx) {
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
function tolerantSchema(schema) {
    return schema.strip();
}
/**
 * Creates a nullable schema with undefined → null normalization.
 */
function nullableField(schema) {
    return schema.nullable();
}
/**
 * Common forward-compatible schemas.
 */
exports.CommonSchemas = {
    jobStatus: forwardCompatibleEnum([
        'collecting',
        'confirming',
        'dispatched',
        'confirmed',
        'cancelled',
        'completed',
        'timeout-review',
        'failed',
    ], 'collecting'),
    actionType: forwardCompatibleEnum(['book', 'order', 'request', 'inquire', 'register'], 'request'),
    userRole: forwardCompatibleEnum(['user', 'merchant', 'admin'], 'user'),
};
//# sourceMappingURL=zodCompat.js.map