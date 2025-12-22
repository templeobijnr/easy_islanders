"use strict";
/**
 * Limits Types - Business Limits and Usage
 *
 * Defines hard limits for V1 (standard for all businesses).
 * No magic numbers - limits are explicit and typed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LIMITS = void 0;
/**
 * Default limits for V1 (standard for everyone).
 */
exports.DEFAULT_LIMITS = {
    maxChunks: 500,
    maxDocs: 50,
    maxUploadMB: 10,
    maxPdfPages: 10,
    maxPublicMessagesPerSession: 5,
};
//# sourceMappingURL=limits.js.map