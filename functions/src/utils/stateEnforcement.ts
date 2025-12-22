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

import * as logger from 'firebase-functions/logger';

/**
 * Canonical job statuses (lowercase only).
 */
export type JobStatus =
    | 'collecting'
    | 'confirming'
    | 'dispatched'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'timeout-review'
    | 'failed';

/**
 * Valid status transitions.
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
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
const TERMINAL_STATUSES: JobStatus[] = ['cancelled', 'completed', 'failed'];

/**
 * Invalid transition error.
 */
export class InvalidTransitionError extends Error {
    public readonly code = 'INVALID_TRANSITION';
    public readonly httpStatus = 400;
    public readonly retryable = false;

    constructor(
        public readonly from: JobStatus,
        public readonly to: JobStatus,
        public readonly traceId: string
    ) {
        super(`Invalid transition from '${from}' to '${to}'`);
        this.name = 'InvalidTransitionError';
    }
}

/**
 * Canonicalizes a status value to lowercase.
 *
 * @param status - Raw status value.
 * @returns Canonical lowercase status.
 * @throws Error if status is not a valid JobStatus.
 */
export function canonicalizeStatus(status: string): JobStatus {
    const canonical = status.toLowerCase().trim() as JobStatus;

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
export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed?.includes(to) ?? false;
}

/**
 * Checks if a status is terminal.
 */
export function isTerminalStatus(status: JobStatus): boolean {
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
export function validateTransition(
    from: string,
    to: string,
    ctx: { traceId: string; jobId: string }
): void {
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
export function getAllowedTransitions(status: JobStatus): JobStatus[] {
    return VALID_TRANSITIONS[status] || [];
}
