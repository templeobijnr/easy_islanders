/**
 * Circuit Breaker Middleware (CASC-03B)
 *
 * Protects system during partial outages by shedding load.
 * Stops human + client retry amplification.
 *
 * INVARIANTS:
 * - Rolling 60-second error rate window.
 * - If error rate > 50%, circuit OPENS.
 * - When OPEN, non-critical requests fast-fail with 503.
 * - Health, admin, and maintenance endpoints bypass breaker.
 * - Circuit transitions are logged with timestamp and error rate.
 *
 * STATES:
 * - CLOSED: Normal operation, all requests processed.
 * - OPEN: Fast-fail mode, non-critical requests rejected.
 * - HALF_OPEN: Testing if system recovered (not implemented for simplicity).
 *
 * @see Living Document Section 17.2 for invariants.
 */

import { Request, Response, NextFunction } from 'express';
import * as logger from 'firebase-functions/logger';

/**
 * Circuit breaker configuration.
 */
const CONFIG = {
    /** Window size in milliseconds */
    WINDOW_MS: 60_000,
    /** Error rate threshold to open circuit (0.0 - 1.0) */
    ERROR_THRESHOLD: 0.5,
    /** Minimum requests before threshold applies */
    MIN_REQUESTS: 10,
    /** Time circuit stays open before auto-reset (ms) */
    OPEN_DURATION_MS: 30_000,
} as const;

/**
 * Paths that bypass the circuit breaker.
 * These are critical for health checks and manual intervention.
 */
const BYPASS_PATHS = new Set([
    '/health',
    '/admin',
    '/maintenance',
    '/_internal',
]);

/**
 * Circuit state enum.
 */
type CircuitState = 'CLOSED' | 'OPEN';

/**
 * Request result for tracking.
 */
interface RequestResult {
    timestamp: number;
    success: boolean;
}

/**
 * Circuit breaker state.
 */
let circuitState: CircuitState = 'CLOSED';
let openedAt: number | null = null;

/**
 * Rolling window of request results.
 */
const requestWindow: RequestResult[] = [];

/**
 * Cleans up old entries from the rolling window.
 */
function cleanupWindow(): void {
    const cutoff = Date.now() - CONFIG.WINDOW_MS;
    while (requestWindow.length > 0 && requestWindow[0].timestamp < cutoff) {
        requestWindow.shift();
    }
}

/**
 * Calculates current error rate from the rolling window.
 */
function getErrorRate(): { errorRate: number; total: number; errors: number } {
    cleanupWindow();

    const total = requestWindow.length;
    if (total === 0) {
        return { errorRate: 0, total: 0, errors: 0 };
    }

    const errors = requestWindow.filter((r) => !r.success).length;
    return {
        errorRate: errors / total,
        total,
        errors,
    };
}

/**
 * Records a request result.
 */
export function recordRequest(success: boolean): void {
    requestWindow.push({
        timestamp: Date.now(),
        success,
    });

    // Evaluate circuit state after recording
    evaluateCircuit();
}

/**
 * Evaluates whether to open or close the circuit.
 */
function evaluateCircuit(): void {
    const { errorRate, total, errors } = getErrorRate();

    if (circuitState === 'CLOSED') {
        // Check if we should open
        if (total >= CONFIG.MIN_REQUESTS && errorRate > CONFIG.ERROR_THRESHOLD) {
            circuitState = 'OPEN';
            openedAt = Date.now();

            logger.error('CIRCUIT BREAKER OPENED', {
                errorRate: (errorRate * 100).toFixed(1) + '%',
                errors,
                total,
                threshold: (CONFIG.ERROR_THRESHOLD * 100).toFixed(0) + '%',
            });
        }
    } else if (circuitState === 'OPEN') {
        // Check if we should close (auto-reset after duration)
        if (openedAt && Date.now() - openedAt > CONFIG.OPEN_DURATION_MS) {
            circuitState = 'CLOSED';
            openedAt = null;

            logger.info('CIRCUIT BREAKER CLOSED (auto-reset)', {
                openDuration: CONFIG.OPEN_DURATION_MS / 1000 + 's',
            });
        }
    }
}

/**
 * Checks if a path should bypass the circuit breaker.
 */
function shouldBypass(path: string): boolean {
    for (const bypassPath of BYPASS_PATHS) {
        if (path.startsWith(bypassPath)) {
            return true;
        }
    }
    return false;
}

/**
 * Gets the current circuit state for monitoring.
 */
export function getCircuitState(): {
    state: CircuitState;
    errorRate: number;
    openedAt: number | null;
} {
    const { errorRate } = getErrorRate();
    return {
        state: circuitState,
        errorRate,
        openedAt,
    };
}

/**
 * Manually closes the circuit (admin override).
 */
export function forceCloseCircuit(): void {
    const previousState = circuitState;
    circuitState = 'CLOSED';
    openedAt = null;

    logger.info('CIRCUIT BREAKER FORCE CLOSED (admin)', {
        previousState,
    });
}

/**
 * Express middleware that implements circuit breaker pattern.
 * - Tracks request success/failure rates.
 * - Fast-fails requests when circuit is open.
 * - Bypasses critical paths (health, admin).
 */
export function circuitBreakerMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Bypass for critical paths
    if (shouldBypass(req.path)) {
        next();
        return;
    }

    // Check if circuit is open
    evaluateCircuit(); // Re-evaluate on each request

    if (circuitState === 'OPEN') {
        const traceId = req.traceId || 'unknown';

        logger.warn('Request rejected by circuit breaker', {
            traceId,
            path: req.path,
            method: req.method,
            circuitState,
        });

        res.status(503).json({
            success: false,
            error: 'Service temporarily overloaded. Please try again shortly.',
            code: 'CIRCUIT_BREAKER_OPEN',
            traceId,
        });
        return;
    }

    // Track response to record success/failure
    res.on('finish', () => {
        // Record result based on status code
        const success = res.statusCode < 500;
        recordRequest(success);
    });

    next();
}

/**
 * Clears the circuit breaker state (for testing only).
 */
export function clearCircuitState(): void {
    circuitState = 'CLOSED';
    openedAt = null;
    requestWindow.length = 0;
}
