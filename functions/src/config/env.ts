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

// =============================================================================
// TYPES
// =============================================================================

import * as logger from "firebase-functions/logger";
export interface EnvConfig {
  // Core AI
  gemini: {
    apiKey: string;
    model: string;
    visionModel: string;
    chatModel: string;
  };

  // Firebase
  firebase: {
    storageBucket: string | undefined;
    projectId: string | undefined;
  };

  // Search
  typesense: {
    apiKey: string | undefined;
    host: string;
    port: number;
    protocol: string;
  };

  // Messaging
  twilio: {
    accountSid: string | undefined;
    authToken: string | undefined;
    whatsappFrom: string | undefined;
  };

  // Payments
  stripe: {
    secretKey: string | undefined;
    webhookSecret: string | undefined;
  };

  // Maps & Places
  google: {
    placesApiKey: string | undefined;
  };
  mapbox: {
    token: string | undefined;
  };

  // Defaults
  defaults: {
    hostEmail: string | undefined;
    hostPhone: string | undefined;
  };

  // Feature flags
  flags: {
    devBypass: boolean;
    isEmulator: boolean;
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue?: string): string | undefined {
  return process.env[name] || defaultValue;
}

function optionalEnvInt(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function optionalEnvBool(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
}

// =============================================================================
// CONFIG LOADER
// =============================================================================

let _config: EnvConfig | null = null;

export function loadConfig(): EnvConfig {
  if (_config) return _config;

  // In emulator/local, dotenv should already be loaded by index.ts
  const isEmulator =
    process.env.FUNCTIONS_EMULATOR === "true" || !process.env.K_SERVICE;

  _config = {
    gemini: {
      apiKey: requireEnv("GEMINI_API_KEY"),
      model: optionalEnv("GEMINI_MODEL", "gemini-2.5-flash") as string,
      visionModel: optionalEnv(
        "GEMINI_VISION_MODEL",
        "gemini-2.5-flash",
      ) as string,
      chatModel: optionalEnv("GEMINI_CHAT_MODEL", "gemini-2.5-flash") as string,
    },

    firebase: {
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ??
        process.env.STORAGE_BUCKET ??
        (process.env.GCLOUD_PROJECT
          ? `${process.env.GCLOUD_PROJECT}.firebasestorage.app`
          : undefined),
      projectId: process.env.GCLOUD_PROJECT,
    },

    typesense: {
      apiKey: optionalEnv("TYPESENSE_API_KEY"),
      host: optionalEnv("TYPESENSE_HOST", "localhost") as string,
      port: optionalEnvInt("TYPESENSE_PORT", 8108),
      protocol: optionalEnv("TYPESENSE_PROTOCOL", "http") as string,
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
      placesApiKey:
        optionalEnv("GOOGLE_PLACES_API_KEY") ||
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
export const config = new Proxy({} as EnvConfig, {
  get(_target, prop: keyof EnvConfig) {
    const cfg = loadConfig();
    return cfg[prop];
  },
});

/**
 * Validate that all required config is present (call on startup)
 */
export function validateConfig(): void {
  try {
    loadConfig();
    logger.debug("✅ Configuration validated successfully");
  } catch (error) {
    console.error("❌ Configuration validation failed:", error);
    throw error;
  }
}
