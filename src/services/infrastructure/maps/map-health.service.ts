/**
 * Infrastructure Service: Map Health
 *
 * Responsibility:
 * - Validate Mapbox token
 * - Track map health and degradation status
 * - Expose health status for UI error boundaries
 *
 * Firestore Collections:
 * - None
 *
 * Layer: Infrastructure Service
 *
 * Dependencies:
 * - Mapbox API
 *
 * Notes:
 * - Part of WEB-04 (runtime stability)
 * - Safe to modify in isolation
 *
 * Stability: Core
 *
 * @see Living Document Section 18.4 for invariants.
 */

/**
 * Map health status.
 */
export interface MapHealthStatus {
    healthy: boolean;
    degraded: boolean;
    tokenValid: boolean;
    lastCheck: Date;
    errorMessage?: string;
}

/**
 * Current health status.
 */
let currentStatus: MapHealthStatus = {
    healthy: true,
    degraded: false,
    tokenValid: true,
    lastCheck: new Date(),
};

/**
 * Callbacks for health changes.
 */
const healthListeners: Array<(status: MapHealthStatus) => void> = [];

/**
 * Logs map health event.
 */
function logHealthEvent(
    event: 'check' | 'error' | 'recovery',
    details: Record<string, unknown>
): void {
    console.log(`[MapHealth] ${event}`, {
        ...details,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Updates health status and notifies listeners.
 */
function updateStatus(newStatus: Partial<MapHealthStatus>): void {
    currentStatus = {
        ...currentStatus,
        ...newStatus,
        lastCheck: new Date(),
    };

    healthListeners.forEach((listener) => listener(currentStatus));
}

/**
 * Handles map error event.
 */
export function handleMapError(error: Error | { message: string }): void {
    const errorMessage = error.message;

    logHealthEvent('error', { message: errorMessage });

    // Check for token-related errors
    const isTokenError =
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Invalid token');

    if (isTokenError) {
        updateStatus({
            healthy: false,
            degraded: true,
            tokenValid: false,
            errorMessage: 'Map token invalid or expired',
        });
    } else {
        updateStatus({
            healthy: false,
            degraded: true,
            errorMessage,
        });
    }
}

/**
 * Handles successful map load.
 */
export function handleMapLoad(): void {
    logHealthEvent('recovery', { status: 'map_loaded' });

    updateStatus({
        healthy: true,
        degraded: false,
        tokenValid: true,
        errorMessage: undefined,
    });
}

/**
 * Gets current map health status.
 */
export function getMapHealthStatus(): MapHealthStatus {
    return { ...currentStatus };
}

/**
 * Subscribes to health status changes.
 */
export function onHealthChange(
    callback: (status: MapHealthStatus) => void
): () => void {
    healthListeners.push(callback);

    // Immediately call with current status
    callback(currentStatus);

    return () => {
        const index = healthListeners.indexOf(callback);
        if (index > -1) {
            healthListeners.splice(index, 1);
        }
    };
}

/**
 * Checks if map is usable.
 */
export function isMapUsable(): boolean {
    return currentStatus.healthy && currentStatus.tokenValid;
}

/**
 * Validates Mapbox token by making a test request.
 */
export async function validateMapboxToken(token: string): Promise<boolean> {
    try {
        const response = await fetch(
            `https://api.mapbox.com/tokens/v2?access_token=${token}`
        );

        const valid = response.ok;

        logHealthEvent('check', { tokenValid: valid });

        updateStatus({
            tokenValid: valid,
            healthy: valid,
            degraded: !valid,
        });

        return valid;
    } catch (error) {
        logHealthEvent('error', {
            message: 'Token validation failed',
            error: String(error),
        });

        updateStatus({
            tokenValid: false,
            healthy: false,
            degraded: true,
            errorMessage: 'Failed to validate map token',
        });

        return false;
    }
}
