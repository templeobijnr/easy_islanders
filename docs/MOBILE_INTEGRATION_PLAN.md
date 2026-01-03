# Mobile App Integration Plan
**Principal Mobile Engineer Report**
**Date**: 2025-01-22

---

## Executive Summary

The mobile app (`apps/mobile/`) is **already scaffolded** with Expo SDK 54 + React Native 0.81.5. Core infrastructure exists (auth, API client, notifications), but **Discover and Connect screens use mock data** because required HTTP endpoints are not yet exposed.

**Verdict**: Shared packages + API client are well-designed. Backend modules exist but lack HTTP routes. This is a **"last mile" integration problem**, not a full build.

---

## Phase 0 — Reconnaissance Results

### 0.1 Mobile App Tech Stack (Confirmed)

| Component | Technology | Status |
|-----------|------------|--------|
| Framework | Expo SDK 54, React Native 0.81.5 | ✅ Ready |
| Navigation | expo-router (file-based) | ✅ Ready |
| Auth | @react-native-firebase/auth (Phone) | ✅ Ready |
| API Client | Custom with retry, traceId, idempotency | ✅ Ready |
| Shared Types | @askmerve/contracts, @askmerve/shared | ✅ Ready |
| Push Notifications | expo-notifications | ✅ Ready |
| Maps | react-native-maps | ✅ Ready |
| State | Local useState (minimal) | ✅ Acceptable for v1 |

### 0.2 Backend Auth Approach

```
Firebase Auth → Phone number sign-in → ID Token
↓
Mobile: auth().currentUser.getIdToken()
↓
API: Authorization: Bearer <token>
↓
Backend middleware: isAuthenticated (validates Firebase token)
```

**File**: `functions/src/middleware/auth.ts`
**Contract**: Firebase ID token in Authorization header

### 0.3 Backend Module → HTTP Route Mapping

| Module | Controller | HTTP Routes Exposed | Mobile Status |
|--------|------------|---------------------|---------------|
| **Chat** | `chat.controller.ts` | `POST /chat/message` ✅ | ✅ Working |
| **Catalog** | `catalog.controller.ts` | ❌ No public HTTP routes | 🔴 MOCK DATA |
| **Connect** | `connect.controller.ts` | ❌ No HTTP routes | 🔴 MOCK DATA |
| **Notifications** | `notifications.service.ts` | ❌ No HTTP routes | 🔴 NOT CONNECTED |
| **Identity** | `identity.service.ts` | Partial (via auth triggers) | ✅ Acceptable |

### 0.4 Current Mobile Screens

| Screen | File | Data Source | Status |
|--------|------|-------------|--------|
| Chat | `app/(tabs)/chat.tsx` | `POST /v1/chat/message` | ✅ Working |
| Discover | `app/(tabs)/discover.tsx` | **MOCK_LISTINGS** | 🔴 Needs API |
| Connect | `app/(tabs)/connect.tsx` | **MOCK_MARKERS**, **MOCK_FEED** | 🔴 Needs API |
| Activity | `app/(tabs)/activity.tsx` | Unknown | ❓ To verify |
| Listing Detail | `app/listing/[id].tsx` | Unknown | ❓ To verify |
| Phone Auth | `app/(auth)/phone.tsx` | Firebase Auth | ✅ Working |

---

## Phase 1 — Gap Analysis (Backend Contracts Missing)

### GAP-001: Catalog Public Query Endpoint

**Problem**: Mobile Discover screen needs to fetch listings by type/region/category.

**Backend state**:
- `CatalogController.getListings()` exists ✅
- HTTP route **NOT exposed** ❌

**Mobile expectation**:
```typescript
GET /v1/catalog/listings?type=place&region=kyrenia&approved=true
Authorization: Bearer <token>

Response: { listings: Listing[] }
```

**Minimal fix**: Add route in `functions/src/http/v1/` or `routes/index.ts`:
```typescript
router.get("/v1/catalog/listings", isAuthenticated, async (req, res) => {
  const ctx = req.authContext;
  const query = req.query; // type, region, category, approved
  const listings = await CatalogController.getListings(ctx, query);
  res.json({ listings });
});
```

---

### GAP-002: Connect Feed & Live Venues Endpoints

**Problem**: Mobile Connect screen needs feed and live venues.

**Backend state**:
- `ConnectController.getActiveFeed()` exists ✅
- `ConnectController.getLiveVenues()` exists ✅
- HTTP routes **NOT exposed** ❌

**Mobile expectation**:
```typescript
GET /v1/connect/feed?region=kyrenia&limit=50
Authorization: Bearer <token>

GET /v1/connect/live-venues?region=kyrenia
Authorization: Bearer <token>

POST /v1/connect/checkin
Authorization: Bearer <token>
Body: { pinId: string, pinType: "place" | "stay" | ... }
```

**Minimal fix**: Add routes:
```typescript
router.get("/v1/connect/feed", isAuthenticated, ConnectController.getActiveFeed);
router.get("/v1/connect/live-venues", isAuthenticated, ConnectController.getLiveVenues);
router.post("/v1/connect/checkin", isAuthenticated, ConnectController.checkIn);
router.post("/v1/connect/join", isAuthenticated, ConnectController.joinEvent);
```

---

### GAP-003: Notifications HTTP Routes

**Problem**: Mobile needs to fetch notifications and mark as read.

**Backend state**:
- `NotificationsService.getNotificationsForUser()` exists ✅
- `NotificationsService.markAsRead()` exists ✅
- `NotificationsService.getUnreadCount()` exists ✅
- HTTP routes **NOT exposed** ❌

**Mobile expectation**:
```typescript
GET /v1/notifications?limit=50&unreadOnly=true
Authorization: Bearer <token>

POST /v1/notifications/:id/read
Authorization: Bearer <token>

GET /v1/notifications/unread-count
Authorization: Bearer <token>
```

---

### GAP-004: Push Token Registration

**Problem**: Mobile gets Expo push token but backend has no endpoint to store it.

**Backend state**: No push token storage endpoint.

**Mobile expectation**:
```typescript
POST /v1/users/push-token
Authorization: Bearer <token>
Body: { token: "ExponentPushToken[xxx]", platform: "ios" | "android" }
```

**Minimal fix**: Add to Identity module or user profile:
```typescript
// In identity.service.ts or new push-tokens collection
async function savePushToken(userId: string, token: string, platform: string): Promise<void> {
  await db.collection("pushTokens").doc(userId).set({ token, platform, updatedAt: new Date() }, { merge: true });
}
```

---

### GAP-005: Nearby/Geospatial Query

**Problem**: Mobile Discover shows "Near You" sorted by distance.

**Backend state**: No geo-spatial query capability.

**Two options**:
1. **Client-side sort** (acceptable for v1): Fetch all listings, sort by haversine distance on mobile.
2. **Backend geo query** (future): Add GeoFirestore or Typesense geo filtering.

**Recommendation**: Use client-side sort for v1. Mark geo query as v2.

---

## Phase 2 — Mobile Integration Map (Screen → API)

| Screen | API Endpoint | Auth | Data Model | File |
|--------|--------------|------|------------|------|
| **Chat** | `POST /v1/chat/message` | Required | `ChatResponse` | `services/chatApi.ts` |
| **Discover** | `GET /v1/catalog/listings` | Required | `Listing[]` | **GAP-001** |
| **Connect Feed** | `GET /v1/connect/feed` | Required | `UserActivity[]` | **GAP-002** |
| **Connect Map** | `GET /v1/connect/live-venues` | Required | `LiveVenue[]` | **GAP-002** |
| **Check-in** | `POST /v1/connect/checkin` | Required | `CheckIn` | **GAP-002** |
| **Notifications** | `GET /v1/notifications` | Required | `Notification[]` | **GAP-003** |
| **Mark Read** | `POST /v1/notifications/:id/read` | Required | `void` | **GAP-003** |
| **Push Token** | `POST /v1/users/push-token` | Required | `void` | **GAP-004** |
| **Listing Detail** | `GET /v1/catalog/listings/:id` | Optional | `Listing` | **GAP-001** |

---

## Phase 3 — Milestone Plan (Dependency Ordered)

### Milestone 1: Backend Route Exposure (Blocked by: Nothing)
**Duration**: 1 day
**Owner**: Backend Engineer

**Deliverables**:
1. Add `GET /v1/catalog/listings` route → hooks to `CatalogController.getListings`
2. Add `GET /v1/catalog/listings/:id` route → hooks to `CatalogController.getListing`
3. Add `GET /v1/connect/feed` route → hooks to `ConnectController.getActiveFeed`
4. Add `GET /v1/connect/live-venues` route → hooks to `ConnectController.getLiveVenues`
5. Add `POST /v1/connect/checkin` route → hooks to `ConnectController.checkIn`
6. Add `GET /v1/notifications` route → hooks to `NotificationsService.getNotificationsForUser`
7. Add `POST /v1/notifications/:id/read` route → hooks to `NotificationsService.markAsRead`
8. Add `POST /v1/users/push-token` route → new endpoint

**Acceptance**:
- [ ] `curl -H "Authorization: Bearer <token>" https://.../v1/catalog/listings` returns listings
- [ ] `curl -H "Authorization: Bearer <token>" https://.../v1/connect/feed` returns feed
- [ ] `curl -H "Authorization: Bearer <token>" https://.../v1/notifications` returns notifications

---

### Milestone 2: Mobile API Integration (Blocked by: M1)
**Duration**: 2 days
**Owner**: Mobile Engineer

**Deliverables**:
1. Create `services/catalogApi.ts` with typed client for listings
2. Create `services/connectApi.ts` with typed client for feed/venues/checkin
3. Create `services/notificationsApi.ts` with typed client for notifications
4. Replace MOCK_LISTINGS in `discover.tsx` with API call
5. Replace MOCK_MARKERS/MOCK_FEED in `connect.tsx` with API call
6. Add Notifications tab or badge count to tab bar

**Acceptance**:
- [ ] Discover shows real listings from Firestore
- [ ] Connect Map shows real live venues
- [ ] Connect Feed shows real user activity
- [ ] Notification badge shows unread count

---

### Milestone 3: Push Notification End-to-End (Blocked by: M1, M2)
**Duration**: 1 day
**Owner**: Mobile + Backend

**Deliverables**:
1. On app startup, register push token and send to backend
2. Backend stores push token per user
3. Backend sends push notifications via Firebase Cloud Messaging
4. Mobile handles notification tap → deep link to relevant screen

**Acceptance**:
- [ ] User receives push when booking is confirmed
- [ ] User receives push when event invite is sent
- [ ] Tapping push opens relevant screen

---

### Milestone 4: Listing Detail & Booking (Blocked by: M1, M2)
**Duration**: 2 days
**Owner**: Mobile Engineer

**Deliverables**:
1. Wire `listing/[id].tsx` to fetch from `GET /v1/catalog/listings/:id`
2. Display listing images, description, location, booking options
3. Add "Chat to Book" button that opens Chat with pre-filled context
4. Handle booking confirmation flow

**Acceptance**:
- [ ] Listing detail page shows all images in stable order
- [ ] "Chat to Book" opens chat with listing context
- [ ] Booking confirmation shown in chat

---

### Milestone 5: Production Hardening (Blocked by: M1-M4)
**Duration**: 2 days
**Owner**: Mobile + DevOps

**Deliverables**:
1. EAS Build configured for iOS + Android
2. App signing keys stored securely (EAS Secrets)
3. Environment config (dev/staging/prod API URLs)
4. Crash reporting (Sentry or Firebase Crashlytics)
5. App Store / Play Store submission prep

**Acceptance**:
- [ ] `eas build --platform ios --profile production` succeeds
- [ ] `eas build --platform android --profile production` succeeds
- [ ] TestFlight / Internal Testing track upload succeeds

---

## Phase 4 — Mobile Project Structure

```
apps/mobile/
├── app/                          # expo-router pages
│   ├── _layout.tsx               # Root layout (AuthProvider)
│   ├── (auth)/                   # Auth screens (phone, verify)
│   ├── (tabs)/                   # Main tabs
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── activity.tsx          # Home/Activity feed
│   │   ├── chat.tsx              # Chat with Merve ✅
│   │   ├── discover.tsx          # Near You listings (needs API)
│   │   └── connect.tsx           # Map + Feed (needs API)
│   ├── listing/[id].tsx          # Listing detail
│   └── job/[id].tsx              # Job detail
├── components/                   # Shared UI components
│   ├── ErrorBoundary.tsx
│   └── Map/                      # Platform-specific map
├── context/
│   └── AuthContext.tsx           # Firebase auth context ✅
├── services/                     # API clients
│   ├── apiClient.ts              # Base client with retry ✅
│   ├── chatApi.ts                # Chat API ✅
│   ├── catalogApi.ts             # TODO: Listings API
│   ├── connectApi.ts             # TODO: Connect API
│   ├── notificationsApi.ts       # TODO: Notifications API
│   ├── locationService.ts        # Location services ✅
│   └── notificationService.ts    # Push notifications ✅
├── theme/
│   ├── index.ts
│   └── tokens.ts                 # Design tokens
├── utils/
│   ├── env.ts                    # Environment config
│   ├── logger.ts                 # Structured logging
│   └── storage.ts                # Secure storage
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
└── package.json
```

---

## Phase 5 — Contracts Needed from Backend

### 5.1 Catalog Listings Contract

```typescript
// Request
GET /v1/catalog/listings?type=place&region=kyrenia&category=restaurant&approved=true&limit=50

// Response
{
  "listings": [
    {
      "id": "abc123",
      "type": "place",
      "category": "restaurant",
      "title": "Harbor Cafe",
      "description": "Waterfront dining...",
      "images": ["https://...", "https://..."],
      "address": "123 Harbor Rd, Kyrenia",
      "lat": 35.34,
      "lng": 33.32,
      "region": "kyrenia",
      "approved": true,
      "bookingEnabled": true
    }
  ],
  "total": 42,
  "hasMore": true
}
```

### 5.2 Connect Feed Contract

```typescript
// Request
GET /v1/connect/feed?region=kyrenia&limit=50

// Response
{
  "items": [
    {
      "id": "activity123",
      "type": "checkin",
      "userId": "user456",
      "userName": "John D.",
      "pinId": "listing789",
      "pinType": "place",
      "pinTitle": "Harbor Cafe",
      "createdAt": "2025-01-22T10:30:00Z",
      "expiresAt": "2025-01-22T22:30:00Z"
    }
  ]
}
```

### 5.3 Notifications Contract

```typescript
// Request
GET /v1/notifications?limit=50&unreadOnly=true

// Response
{
  "notifications": [
    {
      "id": "notif123",
      "type": "booking_confirmed",
      "title": "Booking Confirmed!",
      "body": "Your reservation at Harbor Cafe is confirmed for Jan 25.",
      "data": { "bookingId": "booking456", "listingId": "listing789" },
      "createdAt": "2025-01-22T10:30:00Z",
      "readAt": null
    }
  ],
  "unreadCount": 3
}
```

---

## Phase 6 — Verification Checklist

### Per-Milestone Verification

**M1 (Backend Routes)**:
- [ ] All routes return 401 without auth token
- [ ] All routes return valid JSON with auth token
- [ ] Error responses follow standard envelope: `{ error: { code, message } }`

**M2 (Mobile API Integration)**:
- [ ] Discover shows listings from Firestore
- [ ] Connect Map shows real pins
- [ ] No console errors in Metro
- [ ] Pull-to-refresh works on all list screens

**M3 (Push Notifications)**:
- [ ] Push token registration succeeds
- [ ] Test push from Firebase console arrives
- [ ] Notification tap navigates to correct screen

**M4 (Listing Detail)**:
- [ ] Image carousel shows all images
- [ ] Map pin shows listing location
- [ ] "Chat to Book" opens chat with context

**M5 (Production)**:
- [ ] iOS build installs on TestFlight
- [ ] Android build installs from Play Internal Testing
- [ ] No crash on first launch
- [ ] Deep links work from push notifications

---

## Appendix A: Environment Configuration

```typescript
// apps/mobile/utils/env.ts
export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://us-central1-merve-app-nc.cloudfunctions.net/api',
  FIREBASE_PROJECT_ID: 'merve-app-nc',
  MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
};
```

---

## Appendix B: Error Handling Contract

All API errors must return:

```typescript
{
  "error": {
    "code": "PERMISSION_DENIED" | "INVALID_INPUT" | "NOT_FOUND" | "INTERNAL_ERROR",
    "message": "Human-readable error message",
    "traceId": "trace-abc123"  // For debugging
  }
}
```

Mobile must handle:
- 401 → Redirect to auth
- 403 → Show permission error
- 404 → Show "not found" UI
- 429 → Retry with backoff (already in apiClient.ts)
- 500+ → Show generic error, log traceId

---

**END OF REPORT**

**Next Action**: Backend engineer to expose HTTP routes (Milestone 1), then mobile engineer wires up real API calls (Milestone 2).



