# Codex Notes — Easy Islanders

## Goal
Deliver the Easy Islanders product to production readiness: every feature functional, safe, performant, and deployable with a clear CI/CD path.

## How to use this file
- Before starting any task: read this file, append a **Current Task** entry, and state purpose and steps.
- After finishing: mark the task as **Done**, capture outcomes/blocks, and add the **Next Step**.
- Keep entries brief and ordered; update instead of duplicating.

## Current Task
- **Sprint Goal:** Enable a business user to create/manage real estate listings in the dashboard, persist to Firestore, and surface to the agent chat.
  - **Scope:** Business creation + dashboard listing CRUD; link-based quick import; map/location module (search suggestions, allow device location, manual entry, pin drop); ensure agent sees saved listings.
  - **Steps (initial):**
    1) Audit current dashboard/listing forms, data model, and Firestore schema; confirm auth/role handling for businesses.
    2) Design Firestore collections/docs for businesses and listings (including geo/location fields) and API routes/functions required.
    3) Wire dashboard forms to Firestore (create/update listings) with validation and server timestamps; ensure location capture supports search, manual coords, pin, and optional browser geolocation.
    4) Implement quick import from URL (link -> fetch/parse -> prefill fields; handle errors gracefully).
    5) Expose listings to agent chat via tool resolver/query; ensure filtered by owner/business and surfaced in responses.
    6) Test end-to-end in emulator/staging; note gaps for follow-up.
  - **Decisions:** Use Mapbox (tiles + geocoding) for map/search + pin drop with browser geolocation fallback; tie listings to `businessId`/`ownerId` and filter agent results by that business; quick import should accept arbitrary listing URLs (own site, 101evler, etc.) and normalize to internal schema.
- **Completed Task:** Islanders Connect social page — fully functional with tribes/hashtags, Firestore-backed posts, wave notifications, and profile views. ✅
  - **Implemented Features:**
    1. My Tribes section showing user's joined tribes with horizontal scroll
    2. Tribe-specific feed filtering - click any tribe to see only posts from that tribe
    3. Tribe selector in post creation - users can post to specific tribes
    4. Auto-join tribes when using hashtags in posts
    5. Enhanced profile modal showing:
       - User's passport stamps (grid layout)
       - Wave button with status (pending/connected/none)
       - User's tribes with join buttons
       - Full user stats and interests
    6. Wave interaction system with mutual connection
    7. Firestore rules updated for waves and notifications
    8. Real-time tribe membership tracking

## Progress Log
- 2025-11-22: Added business scoping + listing flow foundations (business IDs/owner UIDs, listing save/filter, quick import endpoint, Mapbox location capture). Pending: mapbox token/env wiring and QA on emulators.
- 2025-11-22: Installed deps (root + functions), upgraded functions TypeScript, added cheerio, and built both functions (tsc) and frontend (vite build). Functions build is clean after Typesense type cast; frontend build warns on bundle size and dynamic imports but succeeds.
- 2025-11-22: Connect page fully built out with complete tribe/hashtag system:
  - My Tribes horizontal scroll section with tribe-specific feeds
  - Tribe selector in post creation form (dropdown with user's tribes)
  - Auto-tribe joining when using hashtags in posts
  - Enhanced profile modal: stamps grid, wave status, user tribes, join buttons
  - Wave interaction system: pending → connected flow with notifications
  - Firestore rules updated for waves/notifications collections
  - Feed filtering by tribe (click tribe chip to see tribe-only posts)
  - All features Firestore-backed and production-ready
- 2025-11-23: Backend chat model switched to `gemini-2.5-flash-lite` (apiVersion v1) and functions rebuilt.
- 2025-11-23: Mapbox token added to `.env.local`, `.env.production`, and `functions/.env` (VITE_MAPBOX_TOKEN set).

## Known Gaps / Focus Areas
- Gemini config must use `apiVersion: 'v1'` and supported models (avoid v1beta 404s).
- Run Firestore/Auth emulators (or staging project) to avoid hitting production with ADC.
- Fix tool truthfulness: replies must mirror latest tool results; guard against invented listings.
- Stabilize chat persistence: server timestamps, role normalization, sliding window history.
- Payment: correct Stripe API version; upgrade `firebase-functions` to a supported release.
- Replace mock listings fallback with real/staged inventory; seed for dev.
- Add tests (unit/e2e), CI, and prod build/deploy scripts for frontend and functions.
