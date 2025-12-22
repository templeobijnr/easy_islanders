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
exports.config = void 0;
exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
// =============================================================================
// TYPES
// =============================================================================
const logger = __importStar(require("firebase-functions/logger"));
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
    return value.toLowerCase() === "true";
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
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" || !process.env.K_SERVICE;
    _config = {
        gemini: {
            apiKey: requireEnv("GEMINI_API_KEY"),
            model: optionalEnv("GEMINI_MODEL", "gemini-2.0-flash-exp"),
            visionModel: optionalEnv("GEMINI_VISION_MODEL", "gemini-2.0-flash"),
            chatModel: optionalEnv("GEMINI_CHAT_MODEL", "gemini-2.0-flash"),
        },
        firebase: {
            storageBucket: (_b = (_a = process.env.FIREBASE_STORAGE_BUCKET) !== null && _a !== void 0 ? _a : process.env.STORAGE_BUCKET) !== null && _b !== void 0 ? _b : (process.env.GCLOUD_PROJECT
                ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app`
                : undefined),
            projectId: process.env.GCLOUD_PROJECT,
        },
        typesense: {
            apiKey: optionalEnv("TYPESENSE_API_KEY"),
            host: optionalEnv("TYPESENSE_HOST", "localhost"),
            port: optionalEnvInt("TYPESENSE_PORT", 8108),
            protocol: optionalEnv("TYPESENSE_PROTOCOL", "http"),
        },
        twilio: {
            accountSid: optionalEnv("TWILIO_ACCOUNT_SID"),
            authToken: optionalEnv("TWILIO_AUTH_TOKEN"),
            whatsappFrom: optionalEnv("TWILIO_WHATSAPP_FROM"),
        },
        stripe: {
            secretKey: optionalEnv("STRIPE_SECRET_KEY"),
            webhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET"),
        },
        google: {
            placesApiKey: optionalEnv("GOOGLE_PLACES_API_KEY") ||
                optionalEnv("GOOGLE_PLACES_API_KEY_ENV"),
        },
        mapbox: {
            token: optionalEnv("MAPBOX_TOKEN") || optionalEnv("VITE_MAPBOX_TOKEN"),
        },
        defaults: {
            hostEmail: optionalEnv("EASY_HOST_EMAIL"),
            hostPhone: optionalEnv("EASY_HOST_PHONE"),
        },
        flags: {
            devBypass: optionalEnvBool("ENABLE_DEV_BYPASS", false),
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
        logger.debug("✅ Configuration validated successfully");
    }
    catch (error) {
        console.error("❌ Configuration validation failed:", error);
        throw error;
    }
}
//# sourceMappingURL=env.js.map