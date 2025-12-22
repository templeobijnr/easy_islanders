#!/bin/bash
# Firebase Secrets Setup Script
# This script sets up all required secrets for Cloud Functions

set -e  # Exit on error

echo "🔐 Setting up Firebase Secrets for Cloud Functions"
echo "=================================================="
echo ""
echo "This will set up all required secrets from your .env file."
echo "You'll be prompted to paste each secret value."
echo ""

cd "$(dirname "$0")"

# Load .env file
if [ -f "functions/.env" ]; then
    echo "✅ Found .env file"
    source functions/.env
else
    echo "❌ Error: functions/.env file not found"
    exit 1
fi

echo ""
echo "📝 Setting up secrets..."
echo ""

# Set each secret from .env
echo "Setting GEMINI_API_KEY..."
echo "$GEMINI_API_KEY" | npx firebase functions:secrets:set GEMINI_API_KEY

echo "Setting TWILIO_ACCOUNT_SID..."
echo "$TWILIO_ACCOUNT_SID" | npx firebase functions:secrets:set TWILIO_ACCOUNT_SID

echo "Setting TWILIO_AUTH_TOKEN..."
echo "$TWILIO_AUTH_TOKEN" | npx firebase functions:secrets:set TWILIO_AUTH_TOKEN

echo "Setting TWILIO_WHATSAPP_FROM..."
echo "$TWILIO_WHATSAPP_FROM" | npx firebase functions:secrets:set TWILIO_WHATSAPP_FROM

echo "Setting TYPESENSE_API_KEY..."
echo "$TYPESENSE_API_KEY" | npx firebase functions:secrets:set TYPESENSE_API_KEY

echo "Setting MAPBOX_TOKEN..."
echo "$VITE_MAPBOX_TOKEN" | npx firebase functions:secrets:set MAPBOX_TOKEN

echo "Setting GOOGLE_PLACES_API_KEY (if you have one)..."
if [ -n "$GOOGLE_PLACES_API_KEY" ]; then
    echo "$GOOGLE_PLACES_API_KEY" | npx firebase functions:secrets:set GOOGLE_PLACES_API_KEY
else
    echo "placeholder_key" | npx firebase functions:secrets:set GOOGLE_PLACES_API_KEY
fi

echo "Setting STRIPE_SECRET_KEY..."
echo "$STRIPE_SECRET_KEY" | npx firebase functions:secrets:set STRIPE_SECRET_KEY

echo "Setting STRIPE_WEBHOOK_SECRET..."
echo "$STRIPE_WEBHOOK_SECRET" | npx firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

echo ""
echo "✅ All secrets configured successfully!"
echo ""
echo "🚀 Now you can deploy with: firebase deploy --only functions"
