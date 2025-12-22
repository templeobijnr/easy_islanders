/**
 * Retry Policy (NET-04)
 *
 * Exponential backoff with jitter and AbortController support.
 *
 * INVARIANTS:
 * - Backoff: baseDelay * 2^attempt + jitter.
 * - Only retry on retryable errors (5xx, network, rate limit).
 * - Never retry on 4xx client errors.
 * - AbortController integration for cancellation.
 * - All attempts logged with traceId.
 *
 * @see Living Document Section 18.4 for invariants.
 */

/**
 * Retry policy configuration.
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    jitterFactor: number;
}

/**
 * Default retry configurations by operation type.
 */
export const DEFAULT_CONFIGS: Record<string, RetryConfig> = {
    api: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        jitterFactor: 0.2,
    },
    webhook: {
        maxAttempts: 5,
        baseDelayMs: 500,
        maxDelayMs: 30000,
        jitterFactor: 0.3,
    },
    critical: {
        maxAttempts: 5,
        baseDelayMs: 2000,
        maxDelayMs: 60000,
        jitterFactor: 0.25,
    },
};

/**
 * Retry result.
 */
export interface RetryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
    aborted: boolean;
}

/**
 * Logs retry event.
 */
function logRetry(
    event: 'attempt' | 'success' | 'failure' | 'aborted',
    details: Record<string, unknown>
): void {
    console.log(`[RetryPolicy] ${event}`, {
        ...details,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Calculates retry delay with exponential backoff and jitter.
 */
export function calculateDelay(
    attempt: number,
    config: RetryConfig
): number {
    // Exponential backoff: baseDelay * 2^attempt
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);

    // Add jitter: ±jitterFactor
    const jitterRange = cappedDelay * config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;

    return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Checks if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        // Network errors - retryable
        if (
            message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('econnreset')
        ) {
            return true;
        }

        // Rate limiting - retryable
        if (message.includes('429') || message.includes('rate limit')) {
            return true;
        }

        // Server errors (5xx) - retryable
        if (message.includes('500') || message.includes('502') ||
            message.includes('503') || message.includes('504')) {
            return true;
        }

        // Client errors (4xx) - NOT retryable
        if (message.includes('400') || message.includes('401') ||
            message.includes('403') || message.includes('404')) {
            return false;
        }
    }

    // Unknown errors - treat as retryable
    return true;
}

/**
 * Sleeps for specified milliseconds with abort support.
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, ms);

        if (signal) {
            signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('Aborted'));
            });
        }
    });
}

/**
 * Executes a function with retry policy.
 *
 * @param fn - Function to execute.
 * @param options - Retry options.
 * @returns Retry result.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        traceId: string;
        operationName: string;
        config?: RetryConfig;
        signal?: AbortSignal;
    }
): Promise<RetryResult<T>> {
    const {
        traceId,
        operationName,
        config = DEFAULT_CONFIGS.api,
        signal,
    } = options;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
        // Check for abort
        if (signal?.aborted) {
            logRetry('aborted', { traceId, operationName, attempt });
            return {
                success: false,
                error: new Error('Operation aborted'),
                attempts: attempt,
                aborted: true,
            };
        }

        try {
            logRetry('attempt', {
                traceId,
                operationName,
                attempt: attempt + 1,
                maxAttempts: config.maxAttempts,
            });

            const data = await fn();

            logRetry('success', {
                traceId,
                operationName,
                attempts: attempt + 1,
            });

            return {
                success: true,
                data,
                attempts: attempt + 1,
                aborted: false,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Check if retryable
            if (!isRetryableError(error)) {
                logRetry('failure', {
                    traceId,
                    operationName,
                    attempt: attempt + 1,
                    error: lastError.message,
                    retryable: false,
                });

                return {
                    success: false,
                    error: lastError,
                    attempts: attempt + 1,
                    aborted: false,
                };
            }

            // If not last attempt, wait before retry
            if (attempt < config.maxAttempts - 1) {
                const delay = calculateDelay(attempt, config);

                logRetry('attempt', {
                    traceId,
                    operationName,
                    attempt: attempt + 1,
                    nextRetryMs: delay,
                    error: lastError.message,
                });

                try {
                    await sleep(delay, signal);
                } catch {
                    // Aborted during sleep
                    return {
                        success: false,
                        error: new Error('Operation aborted'),
                        attempts: attempt + 1,
                        aborted: true,
                    };
                }
            }
        }
    }

    logRetry('failure', {
        traceId,
        operationName,
        attempts: config.maxAttempts,
        error: lastError?.message,
        exhausted: true,
    });

    return {
        success: false,
        error: lastError,
        attempts: config.maxAttempts,
        aborted: false,
    };
}

/**
 * Gets retry config for an operation type.
 */
export function getRetryConfig(operationType: string): RetryConfig {
    return DEFAULT_CONFIGS[operationType] ?? DEFAULT_CONFIGS.api;
}
