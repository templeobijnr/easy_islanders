#!/usr/bin/env bash
set -euo pipefail

# Replaces `console.log` with:
# - `logger.debug` in `src/**` (imports from `@/utils/logger`)
# - `logger.debug` in `functions/src/**` (imports from `firebase-functions/logger`)
node scripts/replace-console.mjs

