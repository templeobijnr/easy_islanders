/**
 * Merchant Reply Parser (TEST-04)
 *
 * Robust parsing of merchant responses with variant handling.
 *
 * INVARIANTS:
 * - Handles typos, punctuation, local variants safely.
 * - Ambiguous replies → requires_human.
 * - All parse results logged with traceId + raw input.
 * - Golden tests for known variants.
 *
 * @see Living Document Section 17.2.4 for invariants.
 */

import * as logger from 'firebase-functions/logger';

/**
 * Parsed reply types.
 */
export type ReplyIntent =
    | 'confirm'
    | 'reject'
    | 'need_more_info'
    | 'requires_human';

/**
 * Parse result.
 */
export interface ParseResult {
    intent: ReplyIntent;
    confidence: 'high' | 'medium' | 'low';
    rawInput: string;
    normalizedInput: string;
    matchedPattern?: string;
}

/**
 * Confirmation patterns (case-insensitive).
 */
const CONFIRM_PATTERNS: Array<{ pattern: RegExp; locale?: string }> = [
    // English
    { pattern: /^(yes|yeah|yep|yup|ok|okay|sure|confirmed?|accept(ed)?|approve[d]?)$/i },
    { pattern: /^(ready|done|will\s*do|on\s*it)$/i },
    // Turkish
    { pattern: /^(evet|tamam|tamamd[ıi]r|olur|kabul|hay[ıi]r\s*de[ğg]il)$/i, locale: 'tr' },
    // Variants with typos/punctuation
    { pattern: /^(tama+m+!*|oke+y*!*|ye+s+!*|ye+a+h+!*)$/i },
    // Emoji confirmations
    { pattern: /^(👍|✅|✔️|💯|🆗)$/i },
    // With exclamation/period
    { pattern: /^(yes|ok|okay|tamam|evet)[!.]*$/i },
];

/**
 * Rejection patterns (case-insensitive).
 */
const REJECT_PATTERNS: Array<{ pattern: RegExp; locale?: string }> = [
    // English
    { pattern: /^(no|nope|nah|cancel(led)?|reject(ed)?|decline[d]?|unavailable|can'?t|cannot)$/i },
    // Turkish
    { pattern: /^(hay[ıi]r|iptal|red|m[üu]mk[üu]n\s*de[ğg]il|yok)$/i, locale: 'tr' },
    // Emoji rejections
    { pattern: /^(❌|🚫|👎|✖️)$/i },
    // With punctuation
    { pattern: /^(no|hayir|iptal)[!.]*$/i },
];

/**
 * Need more info patterns.
 */
const INFO_PATTERNS: Array<{ pattern: RegExp }> = [
    { pattern: /^(what|when|where|how|which|why|who|\?)/i },
    { pattern: /(more\s*info|details|explain|clarify)/i },
    { pattern: /^(ne|nerede|nas[ıi]l|kim|hangi)/i }, // Turkish questions
];

/**
 * Normalizes input for matching.
 */
function normalizeInput(input: string): string {
    return input
        .trim()
        .toLowerCase()
        // Remove multiple spaces
        .replace(/\s+/g, ' ')
        // Remove common punctuation (except ?)
        .replace(/[,.!;:]+$/g, '')
        // Normalize Turkish characters
        .replace(/ğ/g, 'g')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
}

/**
 * Parses a merchant reply to determine intent.
 *
 * @param input - Raw merchant reply.
 * @param traceId - Trace ID for logging.
 * @returns Parse result with intent and confidence.
 */
export function parseMerchantReply(
    input: string,
    traceId: string
): ParseResult {
    const rawInput = input;
    const normalizedInput = normalizeInput(input);

    logger.info('ReplyParser: Parsing', {
        component: 'replyParser',
        event: 'parsing',
        traceId,
        rawInput,
        normalizedInput,
    });

    // Check confirmation patterns
    for (const { pattern } of CONFIRM_PATTERNS) {
        if (pattern.test(normalizedInput) || pattern.test(rawInput)) {
            logger.info('ReplyParser: Matched confirm', {
                component: 'replyParser',
                event: 'matched_confirm',
                traceId,
                pattern: pattern.source,
            });

            return {
                intent: 'confirm',
                confidence: 'high',
                rawInput,
                normalizedInput,
                matchedPattern: pattern.source,
            };
        }
    }

    // Check rejection patterns
    for (const { pattern } of REJECT_PATTERNS) {
        if (pattern.test(normalizedInput) || pattern.test(rawInput)) {
            logger.info('ReplyParser: Matched reject', {
                component: 'replyParser',
                event: 'matched_reject',
                traceId,
                pattern: pattern.source,
            });

            return {
                intent: 'reject',
                confidence: 'high',
                rawInput,
                normalizedInput,
                matchedPattern: pattern.source,
            };
        }
    }

    // Check info request patterns
    for (const { pattern } of INFO_PATTERNS) {
        if (pattern.test(normalizedInput) || pattern.test(rawInput)) {
            logger.info('ReplyParser: Matched info request', {
                component: 'replyParser',
                event: 'matched_info',
                traceId,
                pattern: pattern.source,
            });

            return {
                intent: 'need_more_info',
                confidence: 'medium',
                rawInput,
                normalizedInput,
                matchedPattern: pattern.source,
            };
        }
    }

    // Ambiguous - requires human
    logger.warn('ReplyParser: Ambiguous - requires human', {
        component: 'replyParser',
        event: 'requires_human',
        traceId,
        rawInput,
        normalizedInput,
    });

    return {
        intent: 'requires_human',
        confidence: 'low',
        rawInput,
        normalizedInput,
    };
}

/**
 * Golden test cases for validation.
 */
export const GOLDEN_TESTS: Array<{ input: string; expected: ReplyIntent }> = [
    // Confirmations
    { input: 'yes', expected: 'confirm' },
    { input: 'YES', expected: 'confirm' },
    { input: 'Yes!', expected: 'confirm' },
    { input: 'yeah', expected: 'confirm' },
    { input: 'ok', expected: 'confirm' },
    { input: 'OK', expected: 'confirm' },
    { input: 'okay', expected: 'confirm' },
    { input: 'TAMAM', expected: 'confirm' },
    { input: 'TAMAM!', expected: 'confirm' },
    { input: 'tamaam', expected: 'confirm' }, // Typo
    { input: 'tamamdir', expected: 'confirm' },
    { input: 'evet', expected: 'confirm' },
    { input: '👍', expected: 'confirm' },
    { input: '✅', expected: 'confirm' },
    { input: 'yessss!!', expected: 'confirm' },

    // Rejections
    { input: 'no', expected: 'reject' },
    { input: 'NO', expected: 'reject' },
    { input: 'nope', expected: 'reject' },
    { input: 'hayir', expected: 'reject' },
    { input: 'iptal', expected: 'reject' },
    { input: 'cancel', expected: 'reject' },
    { input: '❌', expected: 'reject' },
    { input: 'cannot', expected: 'reject' },

    // Info requests
    { input: 'what time?', expected: 'need_more_info' },
    { input: 'more details please', expected: 'need_more_info' },

    // Ambiguous → human
    { input: 'maybe', expected: 'requires_human' },
    { input: 'later', expected: 'requires_human' },
    { input: 'asdf', expected: 'requires_human' },
    { input: '...', expected: 'requires_human' },
];
