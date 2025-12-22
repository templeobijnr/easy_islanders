/**
 * HTTP Client for AskMerve API
 *
 * Provides authenticated HTTP requests with automatic token injection.
 * Works with both web and mobile via StorageAdapter abstraction.
 *
 * Pattern based on existing apps/web/src/services/v1Api.ts
 */

import type { StorageAdapter } from './storage';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the HTTP client.
 */
export interface HttpClientConfig {
    /** Base URL for API (e.g., https://api.askmerve.app) */
    baseUrl: string;

    /** Storage adapter for token management */
    storage: StorageAdapter;

    /** Function to get current Firebase auth token */
    getAuthToken: () => Promise<string | null>;

    /** Optional request timeout in milliseconds (default: 30000) */
    timeout?: number;
}

/**
 * Standard API response format from backend.
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    traceId?: string;
    idempotent?: boolean;
}

/**
 * Error thrown when API request fails.
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly traceId?: string,
        public readonly responseBody?: unknown
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// =============================================================================
// URL HELPERS
// =============================================================================

/**
 * Normalize base URL by removing trailing slashes.
 */
function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

/**
 * Build full URL for V1 API endpoint.
 */
function buildV1Url(baseUrl: string, path: string): string {
    const normalizedBase = normalizeBaseUrl(baseUrl);
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const withV1 = normalizedPath.startsWith('/v1/')
        ? normalizedPath
        : `/v1${normalizedPath}`;

    return `${normalizedBase}${withV1}`;
}

// =============================================================================
// HTTP CLIENT
// =============================================================================

export class HttpClient {
    private config: Required<HttpClientConfig>;

    constructor(config: HttpClientConfig) {
        this.config = {
            ...config,
            timeout: config.timeout ?? 30000,
        };
    }

    /**
     * Make an authenticated GET request.
     */
    async get<T>(path: string): Promise<ApiResponse<T>> {
        return this.request<T>('GET', path);
    }

    /**
     * Make an authenticated POST request.
     */
    async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>('POST', path, body);
    }

    /**
     * Make an authenticated PUT request.
     */
    async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
        return this.request<T>('PUT', path, body);
    }

    /**
     * Make an authenticated DELETE request.
     */
    async delete<T>(path: string): Promise<ApiResponse<T>> {
        return this.request<T>('DELETE', path);
    }

    /**
     * Core request method with auth injection and error handling.
     */
    private async request<T>(
        method: string,
        path: string,
        body?: unknown
    ): Promise<ApiResponse<T>> {
        const url = buildV1Url(this.config.baseUrl, path);

        // Get auth token
        const token = await this.config.getAuthToken();
        if (!token) {
            throw new ApiError('Authentication required', 401);
        }

        // Build headers
        const headers: HeadersInit = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            this.config.timeout
        );

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Parse response
            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            const payload = isJson ? await response.json() : await response.text();

            // Handle error responses
            if (!response.ok) {
                const errorMessage =
                    typeof payload === 'string'
                        ? payload
                        : payload?.error || payload?.message || `HTTP ${response.status}`;

                throw new ApiError(
                    errorMessage,
                    response.status,
                    typeof payload === 'object' ? payload?.traceId : undefined,
                    payload
                );
            }

            return payload as ApiResponse<T>;
        } catch (error: unknown) {
            clearTimeout(timeoutId);

            if (error instanceof ApiError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ApiError('Request timeout', 408);
                }
                throw new ApiError(error.message, 0);
            }

            throw new ApiError('Unknown error', 0);
        }
    }
}
