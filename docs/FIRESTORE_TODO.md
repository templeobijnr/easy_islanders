# Firestore Implementation Plan — Easy Islanders

This doc tracks the Firestore work required to fully support all agent tools and flows. Update it as collections/indexes evolve.

## Collections & Schemas (target)
- `users/{uid}`
  - `displayName`, `email`, `type` (personal|business), `persona`, `interests`, `budget`, `location`, `onboarded`, `createdAt`, `updatedAt`
  - Subcollections: `favorites/{itemId}` -> { itemId, title, domain, createdAt }
- `businesses/{businessId}`
  - `ownerUid`, `name`, `description`, `phone`, `hours`, `availability`, `createdAt`, `updatedAt`
  - Subcollections: `media/{mediaId}` -> { mediaUrl, uploadedAt }; `leads/{leadId}` -> { ...lead fields, response, respondedAt }
- `listings/{listingId}`
  - Existing schema for marketplace items; ensure fields used by Typesense (title, price, location, domain, subCategory, description, imageUrl, amenities, type, businessId/ownerUid)
- `bookings/{bookingId}`
  - `userId`, `itemId`, `domain`, `itemTitle`, `itemImage`, `totalPrice`, `currency`, `customerName`, `customerContact`, `specialRequests`, `needsPickup`, `checkIn`, `checkOut`, `viewingTime`, `status`, timestamps
- `viewingRequests/{vrId}`
  - `listingId`, `listingTitle`, `listingOwnerContact`, `customerName`, `customerContact`, `preferredSlot`, `userId`, `status`, `createdAt`
- `tribes/{tribeId}`
  - `name`, `description`, `tags`, `ownerId`, `createdAt`
  - Subcollections: `members/{uid}` -> { joinedAt }; `posts/{postId}` -> { content, mediaUrl, userId, createdAt }
- `waves/{waveId}`
  - `from`, `to`, `status` (pending|accepted), `createdAt`, `respondedAt`
- `checkIns/{checkInId}`
  - `userId`, `placeId`, `placeName`, `location`, `createdAt`
- `itineraries/{itinId}`
  - `userId`, `title`, `createdAt`; subcollection `items/{itemId}` -> { itemId, title, day, addedAt }
- `notifications/{notifId}`
  - `userId`, `channel` (app|email|whatsapp), `message`, `status`, `createdAt`

## Indexes (likely required)
- `bookings`: index on `userId` and/or `itemId` if queried.
- `viewingRequests`: index on `listingId`.
- `tribes/{tribeId}/posts`: composite on `createdAt desc`.
- `checkIns`: index on `placeId`, maybe `createdAt desc`.
- `waves`: index on `to`, `status`.
- `itineraries/{itinId}/items`: `addedAt` ordering if needed.
- `businesses/{businessId}/leads`: `createdAt desc`.

## Tasks
- [ ] Confirm Firestore app initialization uses the intended DB (`easy-db` vs default) across booking/payment resolvers.
?- [ ] Seed dev data for listings, tribes, and check-ins to enable agent flows in emulators.
- [ ] Add Firestore security rules for new collections (tribes, waves, checkIns, itineraries, business media/leads, favorites).
- [ ] Create necessary composite indexes via `firestore.indexes.json` once queries are finalized.
- [ ] Ensure server timestamps (or ISO strings) are set consistently in tool resolvers.
- [ ] Decide geo strategy for `listNearbyUsers` and `getNearbyPlaces` (GeoPoint + geohash or external search).
- [ ] Align Typesense indexing with listings/events/local places (fields required by search tools).

## Open Questions
- Do we scope business data by `ownerUid` in queries, or allow public read of business profiles?
- For notifications: will app/email be sent via Cloud Functions triggers or direct tool calls?
- Do we need per-tenant partitioning for tribes/check-ins, or global?
