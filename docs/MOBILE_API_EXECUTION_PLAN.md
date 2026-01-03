# Mobile API Execution Plan
**Timeline**: 1-2 days | **Engineers**: 1 Backend + 1 Mobile

---

## Goal

Expose HTTP routes so mobile replaces mock data with real API:
- **Discover**: listings query + detail
- **Connect**: feed + live venues + checkin
- **Notifications**: list + unread + mark read
- **Push**: token registration

---

## Backend Tasks

### 1) Catalog Listings
- **File**: `functions/src/routes/index.ts`
- **Route**: `GET /v1/catalog/listings?type=&region=&category=&approved=&limit=`
- **Auth**: `isAuthenticated`
- **Handler**: `CatalogController.getListings(ctx, query)`
- **Response**:
```json
{ "listings": [Listing], "total": 0, "hasMore": false }
```
- **Verify**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/v1/catalog/listings?limit=5" | jq .
```
- **If name differs**: search `getListings(` in `functions/src/modules/catalog/`

### 2) Listing Detail
- **File**: `functions/src/routes/index.ts`
- **Route**: `GET /v1/catalog/listings/:id`
- **Auth**: `isAuthenticated`
- **Handler**: `CatalogController.getListing(ctx, id)`
- **Response**:
```json
{ "listing": Listing }
```
- **Verify**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/v1/catalog/listings/$ID" | jq .
```

### 3) Connect Feed
- **File**: `functions/src/routes/index.ts`
- **Route**: `GET /v1/connect/feed?region=&limit=`
- **Auth**: `isAuthenticated`
- **Handler**: `ConnectController.getActiveFeed(ctx, query)`
- **Response**:
```json
{ "items": [UserActivity], "hasMore": false }
```
- **Verify**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/v1/connect/feed?limit=10" | jq .
```
- **If name differs**: search `getActiveFeed` in `functions/src/modules/connect/`

### 4) Connect Live Venues
- **File**: `functions/src/routes/index.ts`
- **Route**: `GET /v1/connect/live-venues?region=`
- **Auth**: `isAuthenticated`
- **Handler**: `ConnectController.getLiveVenues(ctx, query)`
- **Response**:
```json
{ "venues": [LiveVenue] }
```
- **Verify**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/v1/connect/live-venues" | jq .
```

### 5) Check-in
- **File**: `functions/src/routes/index.ts`
- **Route**: `POST /v1/connect/checkin`
- **Auth**: `isAuthenticated`
- **Body**: `{ "pinId": "string", "pinType": "place|stay|event|experience" }`
- **Handler**: `ConnectController.checkIn(ctx, body)`
- **Response**:
```json
{ "ok": true }
```
- **Verify**:
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/v1/connect/checkin" -d '{"pinId":"test","pinType":"place"}' | jq .
```

### 6) Notifications
- **File**: `functions/src/routes/index.ts`
- **Routes**:
  - `GET /v1/notifications?limit=&unreadOnly=`
  - `GET /v1/notifications/unread-count`
  - `POST /v1/notifications/:id/read`
- **Auth**: `isAuthenticated`
- **Handlers**:
  - `NotificationsService.getNotificationsForUser(userId, query)`
  - `NotificationsService.getUnreadCount(userId)`
  - `NotificationsService.markAsRead(id)`
- **Responses**:
```json
{ "notifications": [Notification], "unreadCount": 0 }
{ "unreadCount": 0 }
{ "ok": true }
```
- **Verify**:
```bash
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/v1/notifications?limit=20" | jq .
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/v1/notifications/unread-count" | jq .
```
- **If name differs**: search `getNotificationsForUser` in `functions/src/modules/notifications/`

### 7) Push Token Registration
- **File**: `functions/src/routes/index.ts`
- **Route**: `POST /v1/users/push-token`
- **Auth**: `isAuthenticated`
- **Body**: `{ "token": "ExponentPushToken[...]", "platform": "ios|android" }`
- **Handler**: Write to `pushTokens/{userId}` with merge
- **Response**:
```json
{ "ok": true }
```
- **Verify**:
```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API_URL/v1/users/push-token" -d '{"token":"ExponentPushToken[test]","platform":"ios"}' | jq .
```

### Error Contract (all routes)
```json
{ "error": { "code": "PERMISSION_DENIED|INVALID_INPUT|NOT_FOUND|INTERNAL_ERROR", "message": "string", "traceId": "string" } }
```

---

## Mobile Tasks

### Files to Create
- `apps/mobile/services/catalogApi.ts` — `getListings()`, `getListing(id)`
- `apps/mobile/services/connectApi.ts` — `getFeed()`, `getLiveVenues()`, `checkIn()`
- `apps/mobile/services/notificationsApi.ts` — `getNotifications()`, `getUnreadCount()`, `markAsRead()`

### Files to Update
- `apps/mobile/app/(tabs)/discover.tsx` — replace `MOCK_LISTINGS` with `catalogApi.getListings()`
- `apps/mobile/app/(tabs)/connect.tsx` — replace `MOCK_MARKERS`/`MOCK_FEED` with `connectApi.*`
- `apps/mobile/app/_layout.tsx` — register push token on auth state change

### Verify
- Launch app, sign in by phone
- Discover shows real listings
- Connect map shows real venues
- Connect feed shows real activity
- Notification badge shows unread count

---

## API Contracts

Use existing `@askmerve/contracts` types. If mismatch: align backend response to mobile types (don't change mobile first).

| Type | Source |
|------|--------|
| `Listing` | `packages/contracts/src/catalog.ts` or `modules/catalog/catalog.schema.ts` |
| `LiveVenue` | `packages/contracts/src/connect.ts` or `modules/connect/connect.schema.ts` |
| `UserActivity` | `packages/contracts/src/connect.ts` or `modules/connect/connect.schema.ts` |
| `Notification` | `modules/notifications/notifications.schema.ts` |

---

## Verification

### Backend
- [ ] All routes return 401 without token
- [ ] All routes return JSON with valid token
- [ ] All curl commands above succeed

### Mobile
- [ ] No `MOCK_*` usage in discover.tsx or connect.tsx
- [ ] Pull-to-refresh triggers network call
- [ ] Errors show traceId in logs

---

## Bad vs Good Outcomes

| Bad | Good |
|-----|------|
| Routes not behind `isAuthenticated` | All routes require auth |
| Inconsistent shape (`{data:...}` vs `{listings:...}`) | One shape per route |
| Mobile still uses mocks | Mobile shows Firestore data |
| 500 errors with no traceId | Errors include `{error:{code,message,traceId}}` |



