import Constants from 'expo-constants';

/**
 * Type-safe environment configuration for the mobile app.
 * 
 * Environment variables are read from:
 * 1. app.json/app.config.js extra field
 * 2. process.env (for EAS builds)
 * 3. Fallback defaults
 */

const getEnvValue = (key: string, defaultValue: string): string => {
    // Try expo config extra first
    const extraValue = Constants.expoConfig?.extra?.[key];
    if (typeof extraValue === 'string' && extraValue.length > 0) {
        return extraValue;
    }

    // Try process.env
    const processValue = process.env[key];
    if (typeof processValue === 'string' && processValue.length > 0) {
        return processValue;
    }

    return defaultValue;
};

/**
 * Application environment configuration.
 * All environment values are validated at startup.
 */
export const ENV = {
    /**
     * Base URL for the AskMerve API.
     * Defaults to production if not specified.
     */
    API_URL: getEnvValue(
        'EXPO_PUBLIC_API_URL',
        'https://europe-west1-easy-islanders.cloudfunctions.net/api/v1'
    ),

    /**
     * Whether the app is running in development mode.
     */
    IS_DEVELOPMENT: __DEV__,

    /**
     * Current app version from expo config.
     */
    APP_VERSION: Constants.expoConfig?.version ?? '1.0.0',

    /**
     * Expo SDK version.
     */
    EXPO_SDK_VERSION: Constants.expoConfig?.sdkVersion ?? 'unknown',
} as const;

/**
 * Validate that required environment variables are set.
 * Call this at app startup to catch configuration issues early.
 */
export function validateEnv(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!ENV.API_URL || ENV.API_URL.length === 0) {
        errors.push('API_URL is not configured');
    }

    if (!ENV.API_URL.startsWith('http://') && !ENV.API_URL.startsWith('https://')) {
        errors.push('API_URL must be a valid HTTP/HTTPS URL');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export type Env = typeof ENV;
