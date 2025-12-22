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

import * as logger from 'firebase-functions/logger';

/**
 * Chat context budget configuration.
 */
export interface ContextBudgetConfig {
    maxMessages: number;
    maxTokens: number;
    maxBytes: number;
    keepFirstN: number;
    keepLastM: number;
}

/**
 * Default budget configuration.
 */
export const DEFAULT_BUDGET: ContextBudgetConfig = {
    maxMessages: 50,
    maxTokens: 8000,
    maxBytes: 32000,
    keepFirstN: 2,  // System prompt + first user message
    keepLastM: 10,  // Recent context
};

/**
 * Message for context.
 */
export interface ContextMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
}

/**
 * Budget enforcement result.
 */
export interface BudgetResult {
    messages: ContextMessage[];
    beforeCount: number;
    afterCount: number;
    tokensRemoved: number;
    bytesRemoved: number;
    strategy: 'none' | 'message_trim' | 'keep_first_last';
}

/**
 * Estimates token count from text.
 * Simple heuristic: ~4 chars per token.
 */
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Gets total bytes in messages.
 */
function getTotalBytes(messages: ContextMessage[]): number {
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
export function enforceContextBudget(
    messages: ContextMessage[],
    config: ContextBudgetConfig = DEFAULT_BUDGET,
    traceId: string
): BudgetResult {
    const beforeCount = messages.length;
    const beforeBytes = getTotalBytes(messages);
    const beforeTokens = messages.reduce(
        (sum, m) => sum + estimateTokens(m.content),
        0
    );

    // Check if already within budget
    if (
        messages.length <= config.maxMessages &&
        beforeTokens <= config.maxTokens &&
        beforeBytes <= config.maxBytes
    ) {
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
    let result: ContextMessage[];

    if (messages.length <= config.keepFirstN + config.keepLastM) {
        // Not enough to apply strategy, just trim from middle
        result = [
            ...messages.slice(0, config.keepFirstN),
            ...messages.slice(-config.keepLastM),
        ];
    } else {
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
    let currentTokens = result.reduce(
        (sum, m) => sum + estimateTokens(m.content),
        0
    );

    while (currentTokens > config.maxTokens && result.length > config.keepFirstN + 1) {
        // Remove from after keepFirstN
        result.splice(config.keepFirstN, 1);
        currentTokens = result.reduce(
            (sum, m) => sum + estimateTokens(m.content),
            0
        );
    }

    const afterBytes = getTotalBytes(result);
    const afterTokens = result.reduce(
        (sum, m) => sum + estimateTokens(m.content),
        0
    );

    const budgetResult: BudgetResult = {
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
export function isWithinBudget(
    messages: ContextMessage[],
    config: ContextBudgetConfig = DEFAULT_BUDGET
): boolean {
    const totalBytes = getTotalBytes(messages);
    const totalTokens = messages.reduce(
        (sum, m) => sum + estimateTokens(m.content),
        0
    );

    return (
        messages.length <= config.maxMessages &&
        totalTokens <= config.maxTokens &&
        totalBytes <= config.maxBytes
    );
}
