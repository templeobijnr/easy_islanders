"use strict";
/**
 * Environment Configuration Service
 *
 * Type-safe access to environment variables with validation on startup.
 * Prevents runtime crashes from missing or invalid configuration.
 *
 * Usage:
 *   import { config } from './config/env';
 *   const apiKey = config.gemini.apiKey;
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
// =============================================================================
// VALIDATION
// =============================================================================
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function optionalEnv(name, defaultValue) {
    return process.env[name] || defaultValue;
}
function optionalEnvInt(name, defaultValue) {
    const value = process.env[name];
    if (!value)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
function optionalEnvBool(name, defaultValue) {
    const value = process.env[name];
    if (!value)
        return defaultValue;
    return value.toLowerCase() === 'true';
}
// =============================================================================
// CONFIG LOADER
// =============================================================================
let _config = null;
function loadConfig() {
    var _a, _b;
    if (_config)
        return _config;
    // In emulator/local, dotenv should already be loaded by index.ts
    const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || !process.env.K_SERVICE;
    _config = {
        gemini: {
            apiKey: requireEnv('GEMINI_API_KEY'),
            model: optionalEnv('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
            visionModel: optionalEnv('GEMINI_VISION_MODEL', 'gemini-2.0-flash'),
            chatModel: optionalEnv('GEMINI_CHAT_MODEL', 'gemini-2.0-flash'),
        },
        firebase: {
            storageBucket: (_b = (_a = process.env.FIREBASE_STORAGE_BUCKET) !== null && _a !== void 0 ? _a : process.env.STORAGE_BUCKET) !== null && _b !== void 0 ? _b : (process.env.GCLOUD_PROJECT ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app` : undefined),
            projectId: process.env.GCLOUD_PROJECT,
        },
        typesense: {
            apiKey: optionalEnv('TYPESENSE_API_KEY'),
            host: optionalEnv('TYPESENSE_HOST', 'localhost'),
            port: optionalEnvInt('TYPESENSE_PORT', 8108),
            protocol: optionalEnv('TYPESENSE_PROTOCOL', 'http'),
        },
        twilio: {
            accountSid: optionalEnv('TWILIO_ACCOUNT_SID'),
            authToken: optionalEnv('TWILIO_AUTH_TOKEN'),
            whatsappFrom: optionalEnv('TWILIO_WHATSAPP_FROM'),
        },
        stripe: {
            secretKey: optionalEnv('STRIPE_SECRET_KEY'),
            webhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET'),
        },
        google: {
            placesApiKey: optionalEnv('GOOGLE_PLACES_API_KEY') || optionalEnv('GOOGLE_PLACES_API_KEY_ENV'),
        },
        mapbox: {
            token: optionalEnv('MAPBOX_TOKEN') || optionalEnv('VITE_MAPBOX_TOKEN'),
        },
        defaults: {
            hostEmail: optionalEnv('EASY_HOST_EMAIL'),
            hostPhone: optionalEnv('EASY_HOST_PHONE'),
        },
        flags: {
            devBypass: optionalEnvBool('ENABLE_DEV_BYPASS', false),
            isEmulator,
        },
    };
    return _config;
}
/**
 * Get configuration (lazy-loaded singleton)
 */
exports.config = new Proxy({}, {
    get(_target, prop) {
        const cfg = loadConfig();
        return cfg[prop];
    },
});
/**
 * Validate that all required config is present (call on startup)
 */
function validateConfig() {
    try {
        loadConfig();
        console.log('✅ Configuration validated successfully');
    }
    catch (error) {
        console.error('❌ Configuration validation failed:', error);
        throw error;
    }
}
//# sourceMappingURL=env.js.map