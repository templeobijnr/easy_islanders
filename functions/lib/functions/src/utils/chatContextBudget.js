"use strict";
/**
 * Chat Context Budget (PERF-02)
 *
 * Enforces limits on chat history before LLM calls.
 *
 * INVARIANTS:
 * - maxMessages/maxTokens/maxBytes enforced.
 * - Strategy: keep first N + last M messages.
 * - Trimming logged with before/after counts.
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
exports.DEFAULT_BUDGET = void 0;
exports.enforceContextBudget = enforceContextBudget;
exports.isWithinBudget = isWithinBudget;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Default budget configuration.
 */
exports.DEFAULT_BUDGET = {
    maxMessages: 50,
    maxTokens: 8000,
    maxBytes: 32000,
    keepFirstN: 2, // System prompt + first user message
    keepLastM: 10, // Recent context
};
/**
 * Estimates token count from text.
 * Simple heuristic: ~4 chars per token.
 */
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
/**
 * Gets total bytes in messages.
 */
function getTotalBytes(messages) {
    return messages.reduce((sum, m) => sum + m.content.length, 0);
}
/**
 * Enforces chat context budget.
 *
 * @param messages - Full message history.
 * @param config - Budget configuration.
 * @param traceId - Trace ID for logging.
 * @returns Trimmed messages and budget result.
 */
function enforceContextBudget(messages, config = exports.DEFAULT_BUDGET, traceId) {
    const beforeCount = messages.length;
    const beforeBytes = getTotalBytes(messages);
    const beforeTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    // Check if already within budget
    if (messages.length <= config.maxMessages &&
        beforeTokens <= config.maxTokens &&
        beforeBytes <= config.maxBytes) {
        return {
            messages,
            beforeCount,
            afterCount: beforeCount,
            tokensRemoved: 0,
            bytesRemoved: 0,
            strategy: 'none',
        };
    }
    // Strategy: keep first N + last M
    let result;
    if (messages.length <= config.keepFirstN + config.keepLastM) {
        // Not enough to apply strategy, just trim from middle
        result = [
            ...messages.slice(0, config.keepFirstN),
            ...messages.slice(-config.keepLastM),
        ];
    }
    else {
        result = [
            ...messages.slice(0, config.keepFirstN),
            ...messages.slice(-config.keepLastM),
        ];
    }
    // If still over message limit, trim more from the end
    if (result.length > config.maxMessages) {
        result = result.slice(0, config.maxMessages);
    }
    // If over token limit, remove messages from middle until under
    let currentTokens = result.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    while (currentTokens > config.maxTokens && result.length > config.keepFirstN + 1) {
        // Remove from after keepFirstN
        result.splice(config.keepFirstN, 1);
        currentTokens = result.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    }
    const afterBytes = getTotalBytes(result);
    const afterTokens = result.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    const budgetResult = {
        messages: result,
        beforeCount,
        afterCount: result.length,
        tokensRemoved: beforeTokens - afterTokens,
        bytesRemoved: beforeBytes - afterBytes,
        strategy: 'keep_first_last',
    };
    logger.info('ChatContextBudget: Trimmed', {
        component: 'chatContextBudget',
        event: 'context_trimmed',
        traceId,
        beforeCount,
        afterCount: result.length,
        tokensRemoved: beforeTokens - afterTokens,
        bytesRemoved: beforeBytes - afterBytes,
        strategy: budgetResult.strategy,
    });
    return budgetResult;
}
/**
 * Quick check if messages are within budget.
 */
function isWithinBudget(messages, config = exports.DEFAULT_BUDGET) {
    const totalBytes = getTotalBytes(messages);
    const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    return (messages.length <= config.maxMessages &&
        totalTokens <= config.maxTokens &&
        totalBytes <= config.maxBytes);
}
//# sourceMappingURL=chatContextBudget.js.map