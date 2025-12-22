# Firebase Secrets Configuration

## Overview

Cloud Functions don't include `.env` files in deployment. You must configure secrets using Firebase Secrets Manager.

## Required Secrets

Based on your `.env` file, configure these secrets:

### 1. Gemini AI
```bash
# Set the API key
firebase functions:secrets:set GEMINI_API_KEY
# When prompted, paste: AIzaSyCdGsJSDjuNGftRIv48PdSF7LIXWGgAoZg

# Set the model (can also be a regular env var)
firebase functions:secrets:set GEMINI_MODEL
# When prompted, paste: gemini-2.0-flash-exp
```

### 2. Twilio WhatsApp
```bash
firebase functions:secrets:set TWILIO_ACCOUNT_SID
# Paste: ACbad9f82e9714b54130124872c8c17044

firebase functions:secrets:set TWILIO_AUTH_TOKEN
# Paste: cbb6ff720fb07e392a9b6a58ce16c7de

firebase functions:secrets:set TWILIO_WHATSAPP_FROM
# Paste: whatsapp:+14155238886
```

### 3. Typesense
```bash
firebase functions:secrets:set TYPESENSE_API_KEY
# Paste: 1tKl9bi4wzajns47HtdWXQCpjrY49hLE

# These can be regular env vars (not secret)
firebase functions:config:set typesense.host="gu5xaekcrsm7ynqbp-1.a1.typesense.net"
firebase functions:config:set typesense.port="443"
firebase functions:config:set typesense.protocol="https"
```

### 4. Stripe
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# Paste: sk_test_placeholder (or real key)

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Paste: whsec_placeholder (or real key)
```

### 5. Google Places & Mapbox
```bash
firebase functions:secrets:set GOOGLE_PLACES_API_KEY
# Paste your Google Places API key

firebase functions:secrets:set MAPBOX_TOKEN
# Paste: pk.eyJ1IjoiZWFzeWlzbGFuZGVycyIsImEiOiJjbWlhN2J2MHAwc2d6MmxzNGhtZ2ZycW0yIn0.mwu4ykEAtGggefvJmF977g
```

## Quick Setup Script

Run this to set all secrets at once:

```bash
# Navigate to project root
cd /Users/apple_trnc/Downloads/easy-islanders

# Set secrets (you'll be prompted for each value)
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set GEMINI_MODEL
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_WHATSAPP_FROM
firebase functions:secrets:set TYPESENSE_API_KEY
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set GOOGLE_PLACES_API_KEY
firebase functions:secrets:set MAPBOX_TOKEN
```

## Update Function Configurations

After setting secrets, update your functions to reference them:

```typescript
// In index.ts or specific functions
export const api = onRequest(
    {
        region: "europe-west1",
        memory: "512MiB",
        cors: true,
        secrets: [
            'GEMINI_API_KEY',
            'GEMINI_MODEL',
            'TWILIO_ACCOUNT_SID',
            'TWILIO_AUTH_TOKEN',
            'TWILIO_WHATSAPP_FROM',
            'TYPESENSE_API_KEY',
            'GOOGLE_PLACES_API_KEY',
            'MAPBOX_TOKEN'
        ]
    },
    app
);
```

## Verify Secrets

```bash
# List all secrets
firebase functions:secrets:access GEMINI_API_KEY

# View secret value (careful - will print to console)
firebase functions:secrets:access GEMINI_API_KEY --version latest
```

## After Configuration

1. Redeploy functions: `firebase deploy --only functions`
2. Secrets will be automatically injected as `process.env.*`
3. Local development still uses `.env` file

## Non-Secret Environment Variables

For non-sensitive config (like Typesense host), use regular config:

```bash
firebase functions:config:set typesense.host="gu5xaekcrsm7ynqbp-1.a1.typesense.net"
firebase functions:config:get
```

Access in code:
```typescript
const host = process.env.TYPESENSE_HOST || functions.config().typesense.host;
```
