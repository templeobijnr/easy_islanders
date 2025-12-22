"use strict";
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
exports.checkPromptInjection = checkPromptInjection;
exports.createStructuredPrompt = createStructuredPrompt;
exports.sanitizeToolParams = sanitizeToolParams;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Injection patterns to detect.
 */
const INJECTION_PATTERNS = [
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
const MAX_INPUT_LENGTH = 10000;
/**
 * Checks user input for injection patterns.
 *
 * @param input - The user input to check.
 * @param ctx - Shield context for logging.
 * @returns Shield result indicating if input is safe.
 */
function checkPromptInjection(input, ctx) {
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
    const detectedPatterns = [];
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
function createStructuredPrompt(userInput, systemContext) {
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
function sanitizeToolParams(params) {
    const sanitized = {};
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
            // Remove potential injection markers from strings
            sanitized[key] = value
                .replace(/<\/?[a-z_]+>/gi, '') // Remove XML-like tags
                .replace(/\[\/?\w+\]/g, '') // Remove bracket markers
                .trim();
        }
        else if (typeof value === 'object' && value !== null) {
            // Recurse for nested objects
            sanitized[key] = sanitizeToolParams(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
//# sourceMappingURL=promptShield.js.map