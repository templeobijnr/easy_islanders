/**
 * API Client with Retry Policy (NET-01)
 *
 * Centralized HTTP client with exponential backoff, jitter, and idempotency.
 *
 * INVARIANTS:
 * - Max 3 retry attempts with exponential backoff (1s, 2s, 4s + jitter).
 * - Respect Retry-After header when present.
 * - Non-idempotent requests (POST/PUT/DELETE) NEVER retry unless carrying idempotency key.
 * - All attempts logged with traceId, requestId, attemptNumber.
 * - Every request has a timeout (default 30s).
 *
 * @see Living Document Section 17.2.2 for invariants.
 */

import { logger, getSessionTraceId } from './logger';

/**
 * Retry policy configuration.
 */
const RETRY_CONFIG = {
    /** Maximum retry attempts */
    MAX_ATTEMPTS: 3,
    /** Base delay in milliseconds */
    BASE_DELAY_MS: 1000,
    /** Exponential factor */
    FACTOR: 2,
    /** Maximum jitter in milliseconds */
    MAX_JITTER_MS: 500,
    /** Default request timeout */
    DEFAULT_TIMEOUT_MS: 30_000,
} as const;

/**
 * HTTP methods that are idempotent by default.
 */
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Error response from API.
 */
export interface APIError {
    code: string;
    message: string;
    httpStatus: number;
    retryable: boolean;
    traceId: string;
    cause?: unknown;
}

/**
 * Request options.
 */
export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
    idempotencyKey?: string;
    signal?: AbortSignal;
}

/**
 * Response wrapper.
 */
export interface APIResponse<T> {
    data: T;
    status: number;
    traceId: string;
    requestId: string;
}

/**
 * Generates a unique request ID.
 */
function generateRequestId(): string {
    return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calculates delay with exponential backoff and jitter.
 */
function calculateDelay(attempt: number): number {
    const exponentialDelay =
        RETRY_CONFIG.BASE_DELAY_MS * Math.pow(RETRY_CONFIG.FACTOR, attempt);
    const jitter = Math.random() * RETRY_CONFIG.MAX_JITTER_MS;
    return exponentialDelay + jitter;
}

/**
 * Determines if a request is retryable.
 */
function isRetryable(
    method: string,
    status: number,
    idempotencyKey?: string
): boolean {
    // Not retryable if non-idempotent without key
    if (!IDEMPOTENT_METHODS.has(method) && !idempotencyKey) {
        return false;
    }

    // Retryable status codes
    return status === 429 || status >= 500;
}

/**
 * Parses Retry-After header.
 */
function parseRetryAfter(headers: Headers): number | null {
    const retryAfter = headers.get('Retry-After');
    if (!retryAfter) return null;

    // Try parsing as seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000;
    }

    // Try parsing as date
    const date = Date.parse(retryAfter);
    if (!isNaN(date)) {
        return Math.max(0, date - Date.now());
    }

    return null;
}

/**
 * Makes an API request with retry policy.
 *
 * @param url - Request URL
 * @param options - Request options
 * @returns API response
 * @throws APIError on failure
 */
export async function apiRequest<T>(
    url: string,
    options: RequestOptions = {}
): Promise<APIResponse<T>> {
    const {
        method = 'GET',
        headers = {},
        body,
        timeout = RETRY_CONFIG.DEFAULT_TIMEOUT_MS,
        idempotencyKey,
        signal,
    } = options;

    const traceId = getSessionTraceId();
    const requestId = generateRequestId();

    // Build headers
    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Trace-ID': traceId,
        'X-Request-ID': requestId,
        ...headers,
    };

    if (idempotencyKey) {
        requestHeaders['Idempotency-Key'] = idempotencyKey;
    }

    let lastError: APIError | undefined;
    let attempt = 0;

    while (attempt < RETRY_CONFIG.MAX_ATTEMPTS) {
        attempt++;

        logger.info('API: Request attempt', {
            component: 'apiClient',
            event: 'request_attempt',
            traceId,
            requestId,
            method,
            url,
            attempt,
            maxAttempts: RETRY_CONFIG.MAX_ATTEMPTS,
        });

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            // Combine with external signal if provided
            const combinedSignal = signal
                ? AbortSignal.any([signal, controller.signal])
                : controller.signal;

            const response = await fetch(url, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
                signal: combinedSignal,
            });

            clearTimeout(timeoutId);

            // Success
            if (response.ok) {
                const data = await response.json();

                logger.info('API: Request succeeded', {
                    component: 'apiClient',
                    event: 'request_success',
                    traceId,
                    requestId,
                    status: response.status,
                    attempt,
                });

                return {
                    data,
                    status: response.status,
                    traceId,
                    requestId,
                };
            }

            // Error response
            const errorBody = await response.json().catch(() => ({}));

            lastError = {
                code: errorBody.code || 'API_ERROR',
                message: errorBody.error || response.statusText,
                httpStatus: response.status,
                retryable: isRetryable(method, response.status, idempotencyKey),
                traceId,
                cause: errorBody,
            };

            // Check if retryable
            if (!lastError.retryable) {
                logger.error('API: Non-retryable error', {
                    component: 'apiClient',
                    event: 'request_failed_final',
                    traceId,
                    requestId,
                    status: response.status,
                    code: lastError.code,
                });
                throw lastError;
            }

            // Calculate retry delay
            const retryAfterMs = parseRetryAfter(response.headers);
            const delay = retryAfterMs ?? calculateDelay(attempt);

            logger.warn('API: Retryable error, waiting', {
                component: 'apiClient',
                event: 'request_retry_scheduled',
                traceId,
                requestId,
                status: response.status,
                delayMs: delay,
                attempt,
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
        } catch (error) {
            // Network or timeout error
            if (error instanceof Error && error.name === 'AbortError') {
                lastError = {
                    code: 'TIMEOUT',
                    message: 'Request timed out',
                    httpStatus: 0,
                    retryable: IDEMPOTENT_METHODS.has(method) || !!idempotencyKey,
                    traceId,
                    cause: error,
                };
            } else if (!(error as APIError).code) {
                lastError = {
                    code: 'NETWORK_ERROR',
                    message: error instanceof Error ? error.message : 'Network error',
                    httpStatus: 0,
                    retryable: IDEMPOTENT_METHODS.has(method) || !!idempotencyKey,
                    traceId,
                    cause: error,
                };
            } else {
                throw error; // Re-throw API errors
            }

            if (!lastError.retryable || attempt >= RETRY_CONFIG.MAX_ATTEMPTS) {
                logger.error('API: Request failed after retries', {
                    component: 'apiClient',
                    event: 'request_exhausted',
                    traceId,
                    requestId,
                    code: lastError.code,
                    attempts: attempt,
                });
                throw lastError;
            }

            const delay = calculateDelay(attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    // Should never reach here
    throw lastError;
}

/**
 * Convenience methods.
 */
export const api = {
    get: <T>(url: string, options?: Omit<RequestOptions, 'method'>) =>
        apiRequest<T>(url, { ...options, method: 'GET' }),

    post: <T>(url: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        apiRequest<T>(url, { ...options, method: 'POST', body }),

    put: <T>(url: string, body: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
        apiRequest<T>(url, { ...options, method: 'PUT', body }),

    delete: <T>(url: string, options?: Omit<RequestOptions, 'method'>) =>
        apiRequest<T>(url, { ...options, method: 'DELETE' }),
};
