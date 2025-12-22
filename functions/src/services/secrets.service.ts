/**
 * Secrets Service (SEC-04)
 *
 * Loads secrets from GCP Secret Manager at runtime.
 * Crashes on startup if required secrets are missing.
 *
 * INVARIANTS:
 * - NO secrets may be hardcoded or committed to git.
 * - Service MUST crash if required secrets are unavailable.
 * - Fail closed: missing secrets = service unavailable.
 *
 * @see Living Document Section 15.2, 17.3 for invariants.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as logger from 'firebase-functions/logger';

// Singleton client
let client: SecretManagerServiceClient | null = null;

// Cache for loaded secrets
const secretsCache = new Map<string, string>();

/**
 * Required secrets for the application.
 * If any of these are missing, the service WILL crash on startup.
 */
const REQUIRED_SECRETS = [
    'TWILIO_AUTH_TOKEN',
    'GEMINI_API_KEY',
] as const;

/**
 * Optional secrets that enhance functionality but don't block startup.
 */
const OPTIONAL_SECRETS = [
    'MAPBOX_TOKEN',
    'SENTRY_DSN',
] as const;

type RequiredSecretName = (typeof REQUIRED_SECRETS)[number];
type OptionalSecretName = (typeof OPTIONAL_SECRETS)[number];
type SecretName = RequiredSecretName | OptionalSecretName;

/**
 * Gets the Secret Manager client, creating it if needed.
 * In local development, returns null (secrets come from env).
 */
function getClient(): SecretManagerServiceClient | null {
    const isLocalDev = process.env.FUNCTIONS_EMULATOR === 'true' ||
        process.env.NODE_ENV === 'development';

    if (isLocalDev) {
        return null; // Use env vars in local dev
    }

    if (!client) {
        client = new SecretManagerServiceClient();
    }
    return client;
}

/**
 * Fetches a secret from GCP Secret Manager or falls back to env vars.
 * Caches the result for subsequent calls.
 */
async function fetchSecret(name: SecretName): Promise<string | undefined> {
    // Check cache first
    if (secretsCache.has(name)) {
        return secretsCache.get(name);
    }

    // Check env vars first (for local dev or override)
    const envValue = process.env[name];
    if (envValue) {
        secretsCache.set(name, envValue);
        return envValue;
    }

    // Fetch from Secret Manager
    const secretClient = getClient();
    if (!secretClient) {
        return undefined; // Local dev with no env var
    }

    try {
        const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
        if (!projectId) {
            logger.warn(`No project ID found for secret: ${name}`);
            return undefined;
        }

        const secretPath = `projects/${projectId}/secrets/${name}/versions/latest`;
        const [version] = await secretClient.accessSecretVersion({ name: secretPath });

        const payload = version.payload?.data;
        if (!payload) {
            return undefined;
        }

        const value = typeof payload === 'string' ? payload : payload.toString('utf8');
        secretsCache.set(name, value);
        return value;
    } catch (error) {
        logger.error(`Failed to fetch secret: ${name}`, { error });
        return undefined;
    }
}

/**
 * Gets a required secret. Throws if not available.
 * Call this at startup to fail fast.
 */
export async function getRequiredSecret(name: RequiredSecretName): Promise<string> {
    const value = await fetchSecret(name);
    if (!value) {
        throw new Error(`FATAL: Required secret '${name}' is missing. Service cannot start.`);
    }
    return value;
}

/**
 * Gets an optional secret. Returns undefined if not available.
 */
export async function getOptionalSecret(name: OptionalSecretName): Promise<string | undefined> {
    return fetchSecret(name);
}

/**
 * Validates all required secrets at startup.
 * MUST be called before the server starts accepting requests.
 * Crashes the process if any required secret is missing.
 */
export async function validateRequiredSecrets(): Promise<void> {
    logger.info('Validating required secrets...');

    const missing: string[] = [];

    for (const secretName of REQUIRED_SECRETS) {
        try {
            await getRequiredSecret(secretName);
            logger.info(`✓ Secret loaded: ${secretName}`);
        } catch (error) {
            missing.push(secretName);
            logger.error(`✗ Secret missing: ${secretName}`);
        }
    }

    if (missing.length > 0) {
        const message = `FATAL: Missing required secrets: ${missing.join(', ')}. Service cannot start.`;
        logger.error(message);
        throw new Error(message);
    }

    logger.info('All required secrets validated successfully.');
}

/**
 * Clears the secrets cache (for testing only).
 */
export function clearSecretsCache(): void {
    secretsCache.clear();
}
