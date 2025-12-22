"use strict";
/**
 * Canonical State Enforcement (RULE-02)
 *
 * Canonicalizes status values and enforces valid transitions.
 *
 * INVARIANTS:
 * - All status values are lowercase.
 * - Only valid transitions are allowed (frozen state machine).
 * - Invalid transitions throw typed error.
 * - All transitions logged with traceId + jobId.
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
exports.InvalidTransitionError = void 0;
exports.canonicalizeStatus = canonicalizeStatus;
exports.isValidTransition = isValidTransition;
exports.isTerminalStatus = isTerminalStatus;
exports.validateTransition = validateTransition;
exports.getAllowedTransitions = getAllowedTransitions;
const logger = __importStar(require("firebase-functions/logger"));
/**
 * Valid status transitions.
 */
const VALID_TRANSITIONS = {
    collecting: ['confirming', 'cancelled', 'timeout-review'],
    confirming: ['dispatched', 'cancelled', 'timeout-review'],
    dispatched: ['confirmed', 'cancelled', 'timeout-review'],
    confirmed: ['completed', 'cancelled'],
    cancelled: [], // Terminal
    completed: [], // Terminal
    'timeout-review': ['collecting', 'cancelled'], // Can be retried or cancelled
    failed: [], // Terminal
};
/**
 * Terminal statuses that cannot transition.
 */
const TERMINAL_STATUSES = ['cancelled', 'completed', 'failed'];
/**
 * Invalid transition error.
 */
class InvalidTransitionError extends Error {
    constructor(from, to, traceId) {
        super(`Invalid transition from '${from}' to '${to}'`);
        this.from = from;
        this.to = to;
        this.traceId = traceId;
        this.code = 'INVALID_TRANSITION';
        this.httpStatus = 400;
        this.retryable = false;
        this.name = 'InvalidTransitionError';
    }
}
exports.InvalidTransitionError = InvalidTransitionError;
/**
 * Canonicalizes a status value to lowercase.
 *
 * @param status - Raw status value.
 * @returns Canonical lowercase status.
 * @throws Error if status is not a valid JobStatus.
 */
function canonicalizeStatus(status) {
    const canonical = status.toLowerCase().trim();
    // Validate it's a known status
    if (!VALID_TRANSITIONS[canonical]) {
        throw new Error(`Unknown status: '${status}'`);
    }
    return canonical;
}
/**
 * Checks if a status transition is valid.
 *
 * @param from - Current status.
 * @param to - Target status.
 * @returns True if transition is valid.
 */
function isValidTransition(from, to) {
    var _a;
    const allowed = VALID_TRANSITIONS[from];
    return (_a = allowed === null || allowed === void 0 ? void 0 : allowed.includes(to)) !== null && _a !== void 0 ? _a : false;
}
/**
 * Checks if a status is terminal.
 */
function isTerminalStatus(status) {
    return TERMINAL_STATUSES.includes(status);
}
/**
 * Validates and logs a status transition.
 *
 * @param from - Current status.
 * @param to - Target status.
 * @param ctx - Context for logging.
 * @throws InvalidTransitionError if transition is invalid.
 */
function validateTransition(from, to, ctx) {
    const fromCanonical = canonicalizeStatus(from);
    const toCanonical = canonicalizeStatus(to);
    if (!isValidTransition(fromCanonical, toCanonical)) {
        logger.error('StateEnforcement: Invalid transition attempted', {
            component: 'stateEnforcement',
            event: 'invalid_transition',
            traceId: ctx.traceId,
            jobId: ctx.jobId,
            from: fromCanonical,
            to: toCanonical,
        });
        throw new InvalidTransitionError(fromCanonical, toCanonical, ctx.traceId);
    }
    logger.info('StateEnforcement: Transition validated', {
        component: 'stateEnforcement',
        event: 'transition_validated',
        traceId: ctx.traceId,
        jobId: ctx.jobId,
        from: fromCanonical,
        to: toCanonical,
    });
}
/**
 * Gets allowed next statuses from current status.
 */
function getAllowedTransitions(status) {
    return VALID_TRANSITIONS[status] || [];
}
//# sourceMappingURL=stateEnforcement.js.map