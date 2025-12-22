/**
 * Prompt Injection Shield (SEC-01)
 *
 * Guards against prompt injection attacks at the tool execution layer.
 *
 * INVARIANTS:
 * - Structured prompt envelope prevents injection.
 * - Heuristic detection for known injection patterns.
 * - Block reason logged with traceId, userId, sessionId.
 * - Enforced in tool dispatcher, not model behavior.
 *
 * @see Living Document Section 17.2.4 for invariants.
 */

import * as logger from 'firebase-functions/logger';

/**
 * Block reasons for audit trail.
 */
export type BlockReason =
    | 'INJECTION_PATTERN'
    | 'ROLE_OVERRIDE_ATTEMPT'
    | 'SYSTEM_PROMPT_LEAK'
    | 'DELIMITER_INJECTION'
    | 'TOOL_SYNTAX_INJECTION'
    | 'EXCESSIVE_LENGTH';

/**
 * Result of prompt shield check.
 */
export interface ShieldResult {
    safe: boolean;
    blockReason?: BlockReason;
    patterns?: string[];
}

/**
 * Context for shield check.
 */
export interface ShieldContext {
    traceId: string;
    userId?: string;
    sessionId?: string;
    toolRequested?: string;
}

/**
 * Injection patterns to detect.
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; reason: BlockReason }> = [
    // Role override attempts
    {
        pattern: /ignore\s+(previous|all|your)\s+(instructions|prompts?)/i,
        reason: 'ROLE_OVERRIDE_ATTEMPT',
    },
    {
        pattern: /you\s+are\s+(now|no\s+longer)/i,
        reason: 'ROLE_OVERRIDE_ATTEMPT',
    },
    {
        pattern: /forget\s+(everything|your\s+training)/i,
        reason: 'ROLE_OVERRIDE_ATTEMPT',
    },
    {
        pattern: /new\s+instructions?:/i,
        reason: 'ROLE_OVERRIDE_ATTEMPT',
    },

    // System prompt leak attempts
    {
        pattern: /show\s+(me\s+)?(your|the)\s+(system|initial)\s+prompt/i,
        reason: 'SYSTEM_PROMPT_LEAK',
    },
    {
        pattern: /repeat\s+(your|the)\s+(instructions|system\s+prompt)/i,
        reason: 'SYSTEM_PROMPT_LEAK',
    },
    {
        pattern: /what\s+are\s+your\s+(hidden\s+)?instructions/i,
        reason: 'SYSTEM_PROMPT_LEAK',
    },

    // Delimiter injection
    {
        pattern: /```\s*(system|assistant|user)\s*\n/i,
        reason: 'DELIMITER_INJECTION',
    },
    {
        pattern: /<\|?(system|assistant|user)\|?>/i,
        reason: 'DELIMITER_INJECTION',
    },
    {
        pattern: /\[INST\]|\[\/INST\]/i,
        reason: 'DELIMITER_INJECTION',
    },

    // Tool syntax injection
    {
        pattern: /<function_call>|<tool_call>/i,
        reason: 'TOOL_SYNTAX_INJECTION',
    },
    {
        pattern: /\{\s*"?name"?\s*:\s*"?\w+"?\s*,\s*"?arguments"?\s*:/i,
        reason: 'TOOL_SYNTAX_INJECTION',
    },
];

/**
 * Maximum allowed input length.
 */
const MAX_INPUT_LENGTH = 10_000;

/**
 * Checks user input for injection patterns.
 *
 * @param input - The user input to check.
 * @param ctx - Shield context for logging.
 * @returns Shield result indicating if input is safe.
 */
export function checkPromptInjection(
    input: string,
    ctx: ShieldContext
): ShieldResult {
    const { traceId, userId, sessionId, toolRequested } = ctx;

    // Check length
    if (input.length > MAX_INPUT_LENGTH) {
        logger.warn('PromptShield: Excessive length blocked', {
            component: 'promptShield',
            event: 'blocked',
            traceId,
            userId,
            sessionId,
            toolRequested,
            blockReason: 'EXCESSIVE_LENGTH',
            inputLength: input.length,
        });

        return {
            safe: false,
            blockReason: 'EXCESSIVE_LENGTH',
        };
    }

    // Check patterns
    const detectedPatterns: string[] = [];

    for (const { pattern, reason } of INJECTION_PATTERNS) {
        if (pattern.test(input)) {
            detectedPatterns.push(pattern.source);

            logger.warn('PromptShield: Injection pattern detected', {
                component: 'promptShield',
                event: 'blocked',
                traceId,
                userId,
                sessionId,
                toolRequested,
                blockReason: reason,
                patternMatched: pattern.source,
            });

            return {
                safe: false,
                blockReason: reason,
                patterns: detectedPatterns,
            };
        }
    }

    logger.info('PromptShield: Input passed', {
        component: 'promptShield',
        event: 'passed',
        traceId,
        userId,
        sessionId,
        toolRequested,
        inputLength: input.length,
    });

    return { safe: true };
}

/**
 * Wraps user input in a structured prompt envelope.
 * This prevents delimiter injection by clearly separating user content.
 *
 * @param userInput - Raw user input.
 * @param systemContext - System context to prepend.
 * @returns Structured prompt.
 */
export function createStructuredPrompt(
    userInput: string,
    systemContext: string
): string {
    // Use clearly marked sections that are hard to inject
    return `[SYSTEM_CONTEXT_START]
${systemContext}
[SYSTEM_CONTEXT_END]

[USER_MESSAGE_START]
${userInput}
[USER_MESSAGE_END]`;
}

/**
 * Sanitizes tool parameters to prevent injection through tool calls.
 *
 * @param params - Tool parameters.
 * @returns Sanitized parameters.
 */
export function sanitizeToolParams(
    params: Record<string, unknown>
): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
            // Remove potential injection markers from strings
            sanitized[key] = value
                .replace(/<\/?[a-z_]+>/gi, '') // Remove XML-like tags
                .replace(/\[\/?\w+\]/g, '') // Remove bracket markers
                .trim();
        } else if (typeof value === 'object' && value !== null) {
            // Recurse for nested objects
            sanitized[key] = sanitizeToolParams(value as Record<string, unknown>);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}
