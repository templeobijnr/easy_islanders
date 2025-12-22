"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequiredSecret = getRequiredSecret;
exports.getOptionalSecret = getOptionalSecret;
exports.validateRequiredSecrets = validateRequiredSecrets;
exports.clearSecretsCache = clearSecretsCache;
const secret_manager_1 = require("@google-cloud/secret-manager");
const logger = __importStar(require("firebase-functions/logger"));
// Singleton client
let client = null;
// Cache for loaded secrets
const secretsCache = new Map();
/**
 * Required secrets for the application.
 * If any of these are missing, the service WILL crash on startup.
 */
const REQUIRED_SECRETS = [
    'TWILIO_AUTH_TOKEN',
    'GEMINI_API_KEY',
];
/**
 * Optional secrets that enhance functionality but don't block startup.
 */
const OPTIONAL_SECRETS = [
    'MAPBOX_TOKEN',
    'SENTRY_DSN',
];
/**
 * Gets the Secret Manager client, creating it if needed.
 * In local development, returns null (secrets come from env).
 */
function getClient() {
    const isLocalDev = process.env.FUNCTIONS_EMULATOR === 'true' ||
        process.env.NODE_ENV === 'development';
    if (isLocalDev) {
        return null; // Use env vars in local dev
    }
    if (!client) {
        client = new secret_manager_1.SecretManagerServiceClient();
    }
    return client;
}
/**
 * Fetches a secret from GCP Secret Manager or falls back to env vars.
 * Caches the result for subsequent calls.
 */
async function fetchSecret(name) {
    var _a;
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
        const payload = (_a = version.payload) === null || _a === void 0 ? void 0 : _a.data;
        if (!payload) {
            return undefined;
        }
        const value = typeof payload === 'string' ? payload : payload.toString('utf8');
        secretsCache.set(name, value);
        return value;
    }
    catch (error) {
        logger.error(`Failed to fetch secret: ${name}`, { error });
        return undefined;
    }
}
/**
 * Gets a required secret. Throws if not available.
 * Call this at startup to fail fast.
 */
async function getRequiredSecret(name) {
    const value = await fetchSecret(name);
    if (!value) {
        throw new Error(`FATAL: Required secret '${name}' is missing. Service cannot start.`);
    }
    return value;
}
/**
 * Gets an optional secret. Returns undefined if not available.
 */
async function getOptionalSecret(name) {
    return fetchSecret(name);
}
/**
 * Validates all required secrets at startup.
 * MUST be called before the server starts accepting requests.
 * Crashes the process if any required secret is missing.
 */
async function validateRequiredSecrets() {
    logger.info('Validating required secrets...');
    const missing = [];
    for (const secretName of REQUIRED_SECRETS) {
        try {
            await getRequiredSecret(secretName);
            logger.info(`✓ Secret loaded: ${secretName}`);
        }
        catch (error) {
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
function clearSecretsCache() {
    secretsCache.clear();
}
//# sourceMappingURL=secrets.service.js.map