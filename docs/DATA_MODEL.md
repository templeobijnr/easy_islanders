# Easy Islanders Data Model – Canonical Schema & Sync

This document defines how catalog data is structured and how it flows between
domain‑specific collections and the unified `listings` collection used by
Discover, the Map, and the Agent.

The goal is:

- One **canonical public model** (`UnifiedListing`) for everything the user can
  discover / book.
- Rich **domain models** for stays, activities, places, events, experiences.
- A clear **sync strategy** so we never guess where a field comes from.

---

## 1. Collections and their roles

### 1.1 Public catalog surface – `listings`

- **Collection:** `listings`
- **Type:** [`UnifiedListing`](../src/types/UnifiedListing.ts)
- **Purpose:** Everything the user can *see* on the Discover page or Map:
  - Stays, activities, events, places, experiences
  - Their core info, location, price display, actions, booking configuration
- **Usage:**
  - All **consumer‑facing catalog reads** should go through `listings`.
  - The Agent also uses `listings` when recommending/acting on places.

### 1.2 Domain collections – rich type‑specific data

These collections hold the full business objects for admin and back‑office use:

- `stays` – rich stay schema (rooms, amenities, policies, host, pricing rules…)
- `activities` – flexible activity schema with pricing options, duration, rules
- `events` – time‑bound events (date, venue, organizer, tickets, etc.)
- `places` – informational places/POIs (restaurants, beaches, sights, shops)
- `experiences` – curated experiences/tours/workshops (could reuse activities)

Key points:

- Domain docs can contain **much more detail** than `UnifiedListing`.
- `listings` holds only what is needed for:
  - cards on Discover,
  - pins on the map,
  - and bootstrapping a booking request.

### 1.3 Bookings and messages

- `bookings`
  - Each booking request links to:
    - `listingId` (required)
    - `listingType` (`stay|activity|event|experience|place`)
    - optional domain ref (`stayId`, `activityId`, etc.) when applicable.
  - Denormalized fields:
    - `listingTitle`, `region`, and a snapshot of user selection.
- `bookingCommunications`
  - Stores all messages related to a booking (guest, admin, provider, system).
  - Identified by `bookingId` and `userId`.

Bookings and messages should **never** depend on domain collections to render
basic UI – they always rely on the denormalized `listing*` metadata and the
`listingId` reference.

---

## 2. Canonical model – `UnifiedListing`

The canonical public shape is defined in
`src/types/UnifiedListing.ts` as `UnifiedListing`.

Important fields (simplified):

- `type`: `place | activity | event | stay | experience`
- `category`: coarse category (`restaurants`, `spas_wellness`, `hotels_stays`, …)
- `subcategory?`: finer category (`sushi`, `thai_massage`, …)
- `title`, `description`, `address`
- `lat`, `lng`, `region`, `cityId`
- `phone?`, `email?`, `website?`
- `images[]`, `rating?`, `reviewCount?`, `priceLevel?`, `displayPrice?`
- `bookingEnabled`, `bookingOptions`, `actions`
- `showOnMap`, `googlePlaceId?`
- `createdAt`, `updatedAt`, `approved`, `featured?`

**Rule of thumb**

- If the field is needed on a **Discover card**, a **Map pin**, or a **booking
  sheet header**, it belongs on `UnifiedListing`.
- If the field is needed only on a **details page** or in internal admin
  flows, it can stay in the domain model.

---

## 3. Domain → UnifiedListing mapping

This section documents how each domain model projects into `UnifiedListing`.
Implementation details may live in services or Cloud Functions, but the mapping
itself should not change often.

### 3.1 Stays (`stays` → `listings`)

**Source collection:** `stays`  
**Target:** `listings` with `type = 'stay'`

Example mapping (conceptual):

- `UnifiedListing.id` → same as listing doc id (separate from stay id).
- `type` → `'stay'`
- `category` → `'hotels_stays'` (or more specific based on propertyType)
- `title` → `stay.basic.title`
- `description` → `stay.basic.description`
- `address` → `stay.locationDetails.addressLabel`
- `lat`,`lng` → from `stay.locationDetails.geo`
- `region` → `stay.locationDetails.region`
- `cityId` → `stay.locationDetails.city`
- `images[]` → `stay.basic.images`
- `displayPrice` → formatted from `stay.pricingDetails.baseNightly`
- `bookingEnabled` → `true` (for now)
- `bookingOptions` → preset for stays (date + guests, optional time)
- `actions` → standard: `call`, `navigate`, `book`, `whatsapp`, `share`
- `showOnMap` → `true` if coordinates exist
- `googlePlaceId` → optional, if stay was seeded from Google

Authoritative fields:

- **Pricing & availability** → `stays` collection is the source of truth.
- `UnifiedListing.displayPrice` is just a formatted snapshot.

### 3.2 Activities (`activities` → `listings`)

**Source:** `activities`  
**Target:** `listings` with `type = 'activity'`

Mapping:

- `type` → `'activity'`
- `category` → activity category (`spas_wellness`, `bowling_recreation`, …)
- `title` / `description` → from activity details
- `address` / `lat` / `lng` / `region` / `cityId` → from activity location
- `images[]` → primary + gallery images
- `displayPrice` → from base price + currency (`"£50"`, `"From €30 per person"`)
- `bookingOptions` → built from `ActivityPricing` configuration
- `actions` → `book`, `whatsapp`, `call`, `navigate`, `share`

Authoritative fields:

- Pricing model & options → `activities` is source of truth.
- `UnifiedListing.bookingOptions` is derived.

### 3.3 Places (`places` → `listings`)

**Source:** `places`  
**Target:** `listings` with `type = 'place'`

Mapping:

- `type` → `'place'`
- `category` → place category (`restaurants`, `beaches`, `cafes`, `gyms_fitness`, …)
- Title/description/address/location/images → from place doc / Google import.
- `bookingEnabled` → usually `false` or `true` for inquiry‑based flows only.
- `actions` → often `call`, `navigate`, `whatsapp`, `website`, `share`.

Authoritative fields:

- Place opening hours, menus, extra metadata → `places`.
- `UnifiedListing` only exposes what the UI needs.

### 3.4 Events & Experiences

Events and experiences follow the same pattern:

- `events` → `listings` with `type = 'event'`
- `experiences` → `listings` with `type = 'experience'`

Mapping focusses on:

- Time (`date`, `time range`) and venue.
- Images & description.
- Booking / join options.

---

## 4. Sync strategy

### 4.1 Read path (consumer app)

- Discover page (`/discover`) and any map views **must read from `listings`**.
- The Agent, when recommending places or performing actions, should prefer
  `listings` for:
  - basic info,
  - location,
  - booking configuration,
  - contact channels.

Domain collections are used behind the scenes by:

- Admin tooling (Control Tower),
- Pricing/availability logic,
- Detailed property/editor views.

### 4.2 Write path (admin / scripts)

General rule:

- Admin writes go to **domain collections first**, then update the
  corresponding `UnifiedListing`.

Examples:

1. **Create/Edit Stay**
   - Admin creates/edits a stay via Catalog Manager.
   - Client writes to `stays`.
   - A service or Cloud Function:
     - projects that stay into `UnifiedListing`,
     - upserts the corresponding `listings` document.

2. **Create/Edit Activity**
   - Admin creates an activity in `activities`.
   - Projection layer updates `listings` with type `'activity'`.

3. **Google Import for Places**
   - Admin imports a place from Google.
   - Place details are written to `places`.
   - `places` → `UnifiedListing` projection populates `listings`.

Direct writes to `listings` from the client should be considered
**legacy/temporary** and clearly marked in code and docs.

### 4.3 Bookings

When creating bookings:

- Use the `listingId` from `UnifiedListing` as the primary reference.
- Optionally store `domainRef`:
  - e.g. `{ stayId }`, `{ activityId }`, `{ eventId }`.
- Denormalize:
  - `listingTitle`, `listingCategory`, `region`, and price snapshot.

This allows the booking UI to render even if domain docs move or evolve.

---

## 5. Migration notes and cleanup

As we converge on this model:

- Any script or service that writes directly into `listings` should be:
  - audited,
  - either removed,
  - or updated to treat `listings` as a projection of domain data.
- The Discover page mapping logic should be kept in sync with this document so
  that:
  - types aren’t mis‑interpreted (`Cars`/mock data vs real catalog),
  - price and display fields are handled consistently.

Long‑term, this document should be the **single source of truth** for how
catalog data is structured in Firestore and how it flows into the user
experience.

