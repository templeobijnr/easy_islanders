/**
 * Location Service
 * 
 * Handles location permissions, current position, and distance calculations.
 */
import * as Location from 'expo-location';
import { logger } from '../utils/logger';

export interface Coordinates {
    latitude: number;
    longitude: number;
}

/**
 * Request foreground location permission
 */
export async function requestLocationPermission(): Promise<boolean> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        logger.log('Location permission status:', status);
        return status === 'granted';
    } catch (error) {
        logger.error('Failed to request location permission', error);
        return false;
    }
}

/**
 * Get the user's current location
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
    try {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            logger.warn('Location permission denied');
            return null;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });

        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
        };
    } catch (error) {
        logger.error('Failed to get location', error);
        return null;
    }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth radius in km
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(from.latitude)) *
        Math.cos(toRad(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
}
