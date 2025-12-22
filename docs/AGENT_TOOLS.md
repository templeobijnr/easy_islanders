# Agent Tools (Inventory, Execution Model, Data Flows)

This doc describes the **LLM tool surface area** (“function calling”), the **execution loop**, and the **authoritative data flows** for each tool.

## Source Of Truth

- **Tool declarations (what the LLM is allowed to call):** `functions/src/utils/agentTools.ts`
- **Tool resolvers (what actually runs in backend):** `functions/src/services/tools/index.ts`
- **Channel-agnostic orchestration + confirmation gate:** `functions/src/services/agent/orchestrator.service.ts`
- **Pending action persistence (confirmation gate state):** `functions/src/repositories/chat.repository.ts`
- **Execution ledger primitives:** `functions/src/repositories/transaction.repository.ts`

## How Tool Calling Works (Runtime)

### 1) Request enters a channel
- App chat (legacy loop): `functions/src/controllers/chat.controller.ts`
- WhatsApp (channel-agnostic): `functions/src/services/channels/whatsapp.service.ts` → `functions/src/services/agent/orchestrator.service.ts`

### 2) Orchestrator runs the confirmation gate first
Before any LLM call, the orchestrator checks `chatSessions/{sessionId}.pendingAction`.
- **YES** → confirms the pending action (ledger confirm / order dispatch / service dispatch)
- **NO** → releases hold (ledger) or clears pending proposal

This prevents “hallucinated confirmation” and ensures **explicit user confirmation** before commitments.

### 3) Orchestrator loads context
In parallel:
- `chatSessions/{sessionId}/messages` (recent history)
- `users/{userId}/memory/main` (memory slice)
- `users/{userId}` (light profile/persona hints)

### 4) LLM tool loop
The LLM responds with `functionCalls()`. The orchestrator:
1. Looks up the resolver in `toolResolvers`
2. Executes it with:
   - `args` (the LLM-supplied structured arguments)
   - `ctx` (server-trusted execution context: `{ userId, sessionId, channel, location, actor }`)
3. Sends tool results back to the LLM as `functionResponse`

**Context contract / normalization helper:** `functions/src/services/tools/toolContext.ts`

## Tool Counts (Current)

- **Gemini-declared tools:** 59 (from `functions/src/utils/agentTools.ts`)
- **Resolver keys:** 66 (from `functions/src/services/tools/index.ts`)
  - 59 are callable by Gemini (declared)
  - 7 are **internal helpers** (resolvers exist but are not declared as LLM tools):
    - `confirmFoodOrder`, `confirmServiceRequest` (confirmation gate uses these)
    - `createBooking` (legacy, not declared)
    - `detectDistrictFromCoordinates` (helper)
    - `findServiceProviders`, `getRestaurantMenu` (read helpers; currently not declared)
    - `showMap` (UI helper; currently not declared)

## Per-Tool Data Flow (Reads/Writes)

Legend:
- **Read** = Firestore/DB read
- **Write** = Firestore write
- **External** = HTTP vendor call
- **Confirm-gated** = returns `pendingAction` + requires YES/NO before commit/dispatch

### Search & Discovery

#### `searchMarketplace`
- Resolver: `functions/src/services/tools/search.tools.ts`
- External: Typesense (`functions/src/services/typesense.service.ts` shim → `integrations/typesense/typesense.gateway.ts`)
- Read/Write: none (no Firestore)
- Output: array of simplified listing hits

#### `searchLocalPlaces`
- Resolver: `functions/src/services/tools/search.tools.ts`
- External: Mapbox Geocoding (`functions/src/services/mapbox.service.ts` shim → `integrations/maps/mapbox.gateway.ts`)
- Read/Write: none (no Firestore)
- Output: POI hits with coordinates

#### `searchEvents`
- Resolver: `functions/src/services/tools/search.tools.ts`
- External: Typesense
- Read/Write: none (no Firestore)

#### `searchHousingListings`
- Resolver: `functions/src/services/tools/search.tools.ts`
- External: Typesense
- Read/Write: none (no Firestore)

#### `searchPlaces`
- Resolver: `functions/src/services/tools/search.tools.ts`
- External: Typesense (preferred) → Mapbox fallback
- Read/Write: none (no Firestore)

---

### Booking & Payments

#### `initiateBooking` (Ledger-backed: draft → hold)
- Resolver: `functions/src/services/tools/booking.tools.ts` → `functions/src/services/tools/booking-ledger.tools.ts`
- Confirm-gated: **Yes** (`pendingAction.kind='confirm_transaction'`)
- Read:
  - `listings/{itemId}` via `listingRepository.getById()` (to resolve `businessId`)
  - fallback: `businesses/{itemId}` (only to confirm itemId is literally a business doc)
  - optional enrichment: `users/{userId}` (to attach `phoneE164` for notifications)
- Write (authoritative ledger):
  - `businesses/{businessId}/transactions/{txId}` (`createDraft`)
  - `businesses/{businessId}/resourceLocks/{lockKey}` (`createHold`)
  - `businesses/{businessId}/transactions/{txId}/events/{eventId}` (append-only audit events)
  - `idempotency/{scope}:{key}` (dedupe draft/hold)
- Output:
  - `awaitingConfirmation=true`
  - `confirmationPrompt` (user-facing text)
  - `pendingAction` (stored to `chatSessions/{sessionId}`)

#### `scheduleViewing`
- Resolver: `functions/src/services/tools/booking.tools.ts`
- Confirm-gated: no (creates a viewing request immediately; does not confirm a scarce resource)
- Read:
  - `listings/{listingId}` (validate listing + fetch owner contact)
- Write:
  - `viewingRequests/{vrId}` (new viewing request)
- External:
  - Twilio WhatsApp notification to owner/agent (best-effort; failure does not fail request)

#### `createPaymentIntent`
- Resolver: `functions/src/services/tools/booking.tools.ts` → `domains/billing/payment.service.ts`
- Confirm-gated: no (but should only be called after explicit “pay now” UX)
- Read/Write:
  - depends on `paymentService` implementation (Stripe or other gateway)

---

### Taxi & Transportation

#### `requestTaxi`
- Resolver: `functions/src/services/tools/taxi.tools.ts` → `domains/dispatch/taxi.service.ts`
- Confirm-gated: no (dispatch is its own workflow; driver acceptance is the “confirmation”)
- Read:
  - `users/{userId}` (to backfill phone/name if missing)
- Write:
  - performed inside `taxi.service.createAndBroadcastRequest()` (typically `taxiRequests/*`, driver broadcast docs, etc.)
- External:
  - reverse geocoding (implementation in `functions/src/utils/reverseGeocode`)

#### `dispatchTaxi` (legacy alias)
- Resolver: `functions/src/services/tools/taxi.tools.ts`
- Behavior: normalizes args → calls `requestTaxi`

---

### User Profile & Favorites

#### `getUserProfile`
- Resolver: `functions/src/services/tools/user.tools.ts`
- Read: `users/{userId}`

#### `updateUserProfile`
- Resolver: `functions/src/services/tools/user.tools.ts`
- Write: `users/{userId}` (merge update)

#### `saveFavoriteItem`
- Resolver: `functions/src/services/tools/user.tools.ts`
- Write: `users/{userId}/favorites/{itemId}`

#### `listFavorites`
- Resolver: `functions/src/services/tools/user.tools.ts`
- Read: `users/{userId}/favorites` (limit 50)

---

### Social (Tribes, Waves, Check-ins)

#### `createTribe`
- Resolver: `functions/src/services/tools/social.tools.ts`
- Write: `tribes/{tribeId}`

#### `joinTribe`
- Write: `tribes/{tribeId}/members/{userId}`

#### `leaveTribe`
- Write: delete `tribes/{tribeId}/members/{userId}`

#### `postToTribe`
- Write: `tribes/{tribeId}/posts/{postId}`

#### `listTribeMessages`
- Read: `tribes/{tribeId}/posts` (orderBy createdAt desc)

#### `getTribeInfo`
- Read: `tribes/{tribeId}`

#### `listTrendingTribes`
- Read: `tribes` (orderBy createdAt desc; approximate trending)

#### `waveUser`
- Write: `waves/{waveId}`

#### `acceptWave`
- Write: merge `waves/{waveId}` status update

#### `listNearbyUsers`
- Read: `checkIns` (orderBy createdAt desc; heuristic “nearby”)

#### `checkInToPlace`
- Write: `checkIns/{checkInId}`

#### `getCheckInsForPlace`
- Read: `checkIns` filtered by `placeId` (orderBy createdAt desc)

#### `fetchVibeMapData`
- Resolver currently returns a stub payload (no DB reads)

---

### Itineraries

#### `createItinerary`
- Write: `itineraries/{itineraryId}`

#### `addToItinerary`
- Write: `itineraries/{itineraryId}/items/{itemId}`

#### `removeFromItinerary`
- Write: delete `itineraries/{itineraryId}/items/{itemId}`

#### `getItinerary`
- Read:
  - `itineraries/{itineraryId}`
  - `itineraries/{itineraryId}/items`

#### `saveItinerary`
- Resolver currently returns `success: true` without writes (placeholder)

---

### Business Ops (V1-style direct writes; proposal gating recommended)

#### `updateBusinessInfo`
- Write: `businesses/{businessId}` (merge)

#### `updateBusinessAvailability`
- Write: `businesses/{businessId}` (merge)

#### `updateBusinessHours`
- Write: `businesses/{businessId}` (merge)

#### `uploadBusinessMedia`
- Write: `businesses/{businessId}/media/{mediaId}`

#### `listBusinessLeads`
- Read: `businesses/{businessId}/leads` (orderBy createdAt desc)

#### `respondToLead`
- Write: merge `businesses/{businessId}/leads/{leadId}` response fields

---

### Communication / Notifications

#### `sendWhatsAppMessage`
- Resolver: `functions/src/services/tools/communication.tools.ts` → `integrations/twilio/twilio.gateway.ts`
- External: Twilio send
- Write: `notifications/*` (log the send)

#### `sendAppNotification`
- Write: `notifications/*`

#### `sendEmailNotification`
- Resolver is a stub (email gateway not implemented yet)

---

### Places & Geo

#### `getNearbyPlaces`
- Resolver: `functions/src/services/tools/misc.tools.ts`
- Behavior:
  1) Use `ctx.location` if user shared GPS (preferred)
  2) Else attempt geocoding via Mapbox
  3) Filter curated Firestore places by distance (Haversine) or fall back to `areaName` text match
- Read:
  - `places` via `placesRepository.getByCityId('north-cyprus')`
- External:
  - Mapbox geocoding (optional; falls back if unavailable)

#### `computeDistance`
- Resolver: `functions/src/services/tools/misc.tools.ts`
- Read/Write: none
- Note: currently expects `"lat,lng"` strings (Haversine)

#### `fetchHotspots`
- Read: `checkIns` (orderBy createdAt desc, limit 200)

#### `getAreaInfo`
- Read: `checkIns` (via `fetchHotspots`)

---

### Requests (V1 “write request and let ops fulfill”)

#### `createServiceRequest`
- Resolver: `functions/src/services/tools/requests.tools.ts`
- Write: `requests/{requestId}` (type SERVICE)

#### `createOrder`
- Write: `requests/{requestId}` (type ORDER)

---

### Consumer: Food Ordering (Proposal → Confirm → Dispatch)

#### `searchRestaurants`
- Read: `restaurants` (admin catalog) via `restaurantRepository.search()`

#### `orderFood`
- Confirm-gated: **Yes** (`pendingAction.kind='confirm_order'`)
- Read:
  - `users/{userId}` (name/phone)
  - `restaurants/*` and `restaurants/{id}/menuItems/*` (admin catalog)
- Write:
  - `foodOrders/{orderId}` with `status='pending'`
- External (on confirm, not on propose):
  - Twilio WhatsApp dispatch in `confirmFoodOrder`

#### `confirmFoodOrder` (internal, not declared)
- Read: `foodOrders/{orderId}`
- Write: update `foodOrders/{orderId}` to confirmed + store dispatch metadata
- External: Twilio WhatsApp to the restaurant/vendor number

---

### Consumer: Service Booking (Proposal → Confirm → Dispatch)

#### `bookService`
- Confirm-gated: **Yes** (`pendingAction.kind='confirm_service'`)
- Read:
  - `users/{userId}`
  - `service_providers` (admin catalog) via `serviceProviderRepository.findByServiceAndArea()`
- Write:
  - `serviceRequests/{requestId}` with `status='pending'`

#### `confirmServiceRequest` (internal, not declared)
- Read: `serviceRequests/{requestId}`, `service_providers/{providerId}`
- Write: update `serviceRequests/{requestId}` to confirmed + store dispatch metadata
- External: Twilio WhatsApp to provider phone

---

### Info (Read-only / cached)

#### `findPharmacy`
- Read: `pharmacies_on_duty/{YYYY-MM-DD}` (admin cache)

#### `getNews`
- Read: `news_cache/latest` (admin cache)

#### `getExchangeRate`
- No Firestore (currently uses static map; real API can be added later)

#### `showDirections`
- No Firestore (returns a Google Maps deeplink)

---

## Notes / Gaps To Watch

- Some “tool” resolvers are stubs (`consultEncyclopedia`, `getRealTimeInfo`, `sendEmailNotification`, `saveItinerary`, etc.). These should be treated as **non-authoritative** until connected to real sources.
- Business ops tools currently write directly to `businesses/{businessId}`. Roadmap direction is to move to **proposal → approve → apply** for authoritative changes.
- Firestore emulator integration tests require Java (Firestore emulator dependency). In environments without Java, unit tests still run, but emulator tests cannot.

