/**
 * State Synchronization Service (DB-03)
 *
 * Manages optimistic UI updates with rollback on ACK timeout.
 *
 * INVARIANTS:
 * - Optimistic UI reverts if no ACK within CONVERGENCE_TIMEOUT_MS.
 * - User states: Pending, Confirmed, Failed, TimedOut.
 * - Diagnostic bundle captured on failure: traceId, jobId, actionId, networkState.
 * - All sync operations logged with identifiers.
 *
 * @see Living Document Section 17.2.2 for invariants.
 */

import { logger, getSessionTraceId } from './logger';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Configuration for state convergence.
 */
const SYNC_CONFIG = {
    /** Default timeout for ACK (ms) */
    CONVERGENCE_TIMEOUT_MS: 10_000,
    /** Retry interval for pending items (ms) */
    RETRY_INTERVAL_MS: 2_000,
} as const;

/**
 * Synchronization states.
 */
export type SyncState = 'pending' | 'confirmed' | 'failed' | 'timedout';

/**
 * Tracked optimistic operation.
 */
export interface OptimisticOperation<T> {
    id: string;
    type: string;
    payload: T;
    optimisticState: T;
    previousState: T | null;
    state: SyncState;
    createdAt: number;
    confirmedAt?: number;
    error?: string;
    traceId: string;
}

/**
 * Diagnostic bundle for failures.
 */
export interface DiagnosticBundle {
    traceId: string;
    operationId: string;
    operationType: string;
    state: SyncState;
    networkState: NetInfoState | null;
    error?: string;
    duration: number;
    timestamp: string;
}

/**
 * Active optimistic operations.
 */
const activeOperations = new Map<string, OptimisticOperation<unknown>>();

/**
 * Timeout handlers for operations.
 */
const timeoutHandlers = new Map<string, NodeJS.Timeout>();

/**
 * Callbacks for state changes.
 */
type StateChangeCallback<T> = (
    operation: OptimisticOperation<T>,
    bundle?: DiagnosticBundle
) => void;

const stateChangeCallbacks = new Map<string, StateChangeCallback<unknown>>();

/**
 * Generates a unique operation ID.
 */
function generateOperationId(): string {
    return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Captures diagnostic bundle for an operation.
 */
async function captureDiagnostics(
    operation: OptimisticOperation<unknown>
): Promise<DiagnosticBundle> {
    const networkState = await NetInfo.fetch().catch(() => null);

    return {
        traceId: operation.traceId,
        operationId: operation.id,
        operationType: operation.type,
        state: operation.state,
        networkState,
        error: operation.error,
        duration: Date.now() - operation.createdAt,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Starts an optimistic operation.
 *
 * @param type - Operation type (e.g., 'job_create', 'booking_update')
 * @param payload - The payload being sent
 * @param optimisticState - The optimistic state to show
 * @param previousState - The previous state for rollback
 * @param onStateChange - Callback for state changes
 * @param timeout - Custom timeout (default: 10s)
 * @returns Operation ID
 */
export function startOptimisticOperation<T>(
    type: string,
    payload: T,
    optimisticState: T,
    previousState: T | null,
    onStateChange?: StateChangeCallback<T>,
    timeout: number = SYNC_CONFIG.CONVERGENCE_TIMEOUT_MS
): string {
    const id = generateOperationId();
    const traceId = getSessionTraceId();

    const operation: OptimisticOperation<T> = {
        id,
        type,
        payload,
        optimisticState,
        previousState,
        state: 'pending',
        createdAt: Date.now(),
        traceId,
    };

    activeOperations.set(id, operation as OptimisticOperation<unknown>);

    if (onStateChange) {
        stateChangeCallbacks.set(id, onStateChange as StateChangeCallback<unknown>);
    }

    logger.info('StateSync: Operation started', {
        component: 'stateSync',
        event: 'operation_started',
        traceId,
        operationId: id,
        operationType: type,
        timeout,
    });

    // Set timeout for automatic rollback
    const timeoutHandler = setTimeout(async () => {
        await handleTimeout(id);
    }, timeout);

    timeoutHandlers.set(id, timeoutHandler);

    return id;
}

/**
 * Confirms an optimistic operation (ACK received).
 */
export function confirmOperation(operationId: string): void {
    const operation = activeOperations.get(operationId);
    if (!operation) {
        logger.warn('StateSync: Unknown operation confirmed', {
            component: 'stateSync',
            event: 'unknown_confirmed',
            operationId,
        });
        return;
    }

    // Clear timeout
    const timeout = timeoutHandlers.get(operationId);
    if (timeout) {
        clearTimeout(timeout);
        timeoutHandlers.delete(operationId);
    }

    // Update state
    operation.state = 'confirmed';
    operation.confirmedAt = Date.now();

    logger.info('StateSync: Operation confirmed', {
        component: 'stateSync',
        event: 'operation_confirmed',
        traceId: operation.traceId,
        operationId,
        operationType: operation.type,
        duration: Date.now() - operation.createdAt,
    });

    // Notify callback
    const callback = stateChangeCallbacks.get(operationId);
    if (callback) {
        callback(operation);
    }

    // Cleanup
    cleanup(operationId);
}

/**
 * Fails an optimistic operation with an error.
 */
export async function failOperation(
    operationId: string,
    error: string
): Promise<void> {
    const operation = activeOperations.get(operationId);
    if (!operation) return;

    // Clear timeout
    const timeout = timeoutHandlers.get(operationId);
    if (timeout) {
        clearTimeout(timeout);
        timeoutHandlers.delete(operationId);
    }

    // Update state
    operation.state = 'failed';
    operation.error = error;

    const diagnostics = await captureDiagnostics(operation);

    logger.error('StateSync: Operation failed', {
        component: 'stateSync',
        event: 'operation_failed',
        traceId: operation.traceId,
        operationId,
        operationType: operation.type,
        error,
        diagnostics,
    });

    // Notify callback with diagnostics
    const callback = stateChangeCallbacks.get(operationId);
    if (callback) {
        callback(operation, diagnostics);
    }

    // Cleanup
    cleanup(operationId);
}

/**
 * Handles timeout for an operation.
 */
async function handleTimeout(operationId: string): Promise<void> {
    const operation = activeOperations.get(operationId);
    if (!operation) return;

    // Update state
    operation.state = 'timedout';
    operation.error = 'Confirmation timeout';

    const diagnostics = await captureDiagnostics(operation);

    logger.error('StateSync: Operation timed out - ROLLBACK', {
        component: 'stateSync',
        event: 'operation_timeout',
        traceId: operation.traceId,
        operationId,
        operationType: operation.type,
        duration: Date.now() - operation.createdAt,
        diagnostics,
    });

    // Notify callback with diagnostics
    const callback = stateChangeCallbacks.get(operationId);
    if (callback) {
        callback(operation, diagnostics);
    }

    // Cleanup
    cleanup(operationId);
}

/**
 * Cleans up an operation.
 */
function cleanup(operationId: string): void {
    activeOperations.delete(operationId);
    stateChangeCallbacks.delete(operationId);
    timeoutHandlers.delete(operationId);
}

/**
 * Gets the current operation state.
 */
export function getOperationState(
    operationId: string
): OptimisticOperation<unknown> | undefined {
    return activeOperations.get(operationId);
}

/**
 * Gets all pending operations.
 */
export function getPendingOperations(): OptimisticOperation<unknown>[] {
    return Array.from(activeOperations.values()).filter(
        (op) => op.state === 'pending'
    );
}
