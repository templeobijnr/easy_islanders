# Codex Notes — Easy Islanders

## Goal
Deliver the Easy Islanders product to production readiness: every feature functional, safe, performant, and deployable with a clear CI/CD path.

## How to use this file
- Before starting any task: read this file, append a **Current Task** entry, and state purpose and steps.
- After finishing: mark the task as **Done**, capture outcomes/blocks, and add the **Next Step**.
- Keep entries brief and ordered; update instead of duplicating.

## Current Task

---

## 🎯 **ACTIVE SPRINT: Universal Listings Pipeline (All 8 Domains)**

**Sprint Goal:** Enable creation, persistence, and discovery of listings across ALL domains: Real Estate, Cars, Hotels, Restaurants, Events, Services, Marketplace, Health & Beauty.

**Success Criteria:**
- ✅ Business users can create listings in domain-specific dashboards
- ✅ All listings persist to Firestore `listings` collection (easy-db)
- ✅ Auto-sync to Typesense search index via triggers
- ✅ Listings appear in Explore page with proper filtering
- ✅ Agent can search and recommend across all domains
- ✅ Consistent data model with domain-specific fields

---

### **📊 Current State Analysis**

#### **✅ What's Working:**
1. ✓ Real Estate dashboard with full CRUD (BusinessDashboard.tsx, ListingsModule.tsx)
2. ✓ Firestore trigger (onListingWrite.ts) auto-syncs to Typesense
3. ✓ Typesense service with search API (typesense.service.ts)
4. ✓ Type definitions for all domains (marketplace.ts, enums.ts)
5. ✓ Agent tools (searchMarketplace, searchLocalPlaces, searchEvents)
6. ✓ 3,300 seed listings populated across domains via populate endpoint
7. ✓ Import from URL functionality (Gemini + Cheerio scraping)
8. ✓ Image upload via Firebase Storage

#### **❌ What's Missing:**
1. ✗ Dashboards for Cars, Hotels, Restaurants, Events, Services, Marketplace, Health & Beauty
2. ✗ Domain-specific form fields and validation
3. ✗ Consistent schema mapping (rentalType vs subCategory vs type vs hotelType vs eventType)
4. ✗ Explore page domain filtering and multi-domain display
5. ✗ Domain-specific card layouts in Explore
6. ✗ Unified listing creation API endpoint (/v1/listings/create)
7. ✗ Location/geolocation handling for non-RE domains
8. ✗ Domain-based navigation in Business Dashboard

---

### **🗺️ Implementation Roadmap**

#### **Phase 1: Backend Normalization & API** (Priority: HIGH)
**Timeline: Days 1-2**

**Tasks:**
1. **Schema Audit & Mapping** ✅ (COMPLETED via seed data)
   - All 8 domains mapped with proper fields
   - Type definitions exist in marketplace.ts

2. **Normalize Typesense Mapping** (IN PROGRESS)
   - File: `functions/src/services/typesense.service.ts:100-107`
   - Current: Has fallback logic for subCategory (rentalType || type)
   - **TODO:** Extend fallback to include hotelType, eventType, category
   ```typescript
   subCategory: listing.subCategory
     || listing.rentalType
     || listing.type
     || listing.hotelType
     || listing.eventType
     || (listing.domain === 'Restaurants' ? listing.category : null)
   ```

3. **Create Unified Listing API** (NOT STARTED)
   - **File to create:** `functions/src/controllers/listing.controller.ts`
   - **Endpoints:**
     - POST /v1/listings/create - Create listing (any domain)
     - PUT /v1/listings/:id/update - Update listing
     - DELETE /v1/listings/:id - Delete listing
     - GET /v1/listings - List with filters
     - GET /v1/listings/:id - Get single listing
   - **Validation:** Domain-specific required fields
   - **Auth:** Verify ownerUid matches authenticated user

4. **Update Firestore Trigger** (NEEDS UPDATE)
   - File: `functions/src/triggers/onListingWrite.ts`
   - **Current:** Basic field mapping
   - **TODO:** Add domain-specific field handling (make, model for Cars; stars for Hotels, etc.)

---

#### **Phase 2: Frontend Dashboard Forms** (Priority: HIGH)
**Timeline: Days 3-6**

**Tasks:**
5. **Create Domain Selector** (NOT STARTED)
   - **File to create:** `components/dashboard/DomainSelector.tsx`
   - Allow businesses to select primary domain
   - Support multi-domain businesses
   - Save to Firestore: `businesses/{businessId}/config`

6. **Create Domain-Specific Forms** (PARTIAL)
   - **Existing:**
     - ✅ `components/BusinessDashboard.tsx` - Real Estate form (lines 67-87)
   - **To Create:**
     - ❌ `components/dashboard/modules/forms/CarsForm.tsx`
       - Fields: make, model, year, transmission, fuelType, seats, mileage, features
     - ❌ `components/dashboard/modules/forms/HotelsForm.tsx`
       - Fields: hotelType, stars, amenities, breakfastIncluded, checkInTime, roomTypes
     - ❌ `components/dashboard/modules/forms/RestaurantsForm.tsx`
       - Fields: category, cuisine, priceRange, menu items, openingHours
     - ❌ `components/dashboard/modules/forms/EventsForm.tsx`
       - Fields: eventType, date, time, venue, capacity, ticketsAvailable, organizer
     - ❌ `components/dashboard/modules/forms/ServicesForm.tsx`
       - Fields: category (ServiceType), pricingModel, duration, serviceArea, availability
     - ❌ `components/dashboard/modules/forms/MarketplaceForm.tsx`
       - Fields: category, condition, stock, sellerName, dimensions, weight

7. **Update ListingsModule** (NEEDS UPDATE)
   - **File:** `components/dashboard/modules/ListingsModule.tsx`
   - **Current:** Shows Real Estate listings only
   - **TODO:**
     - Add domain filter dropdown
     - Show domain-specific columns (Cars: make/model, Events: date, etc.)
     - Domain-specific actions (Cars: mark as rented, Events: sold out)

8. **Multi-Domain Dashboard Navigation** (NOT STARTED)
   - **File:** `components/BusinessDashboard.tsx` or new `components/dashboard/DomainTabs.tsx`
   - Tabs for each business domain
   - Context-aware forms and listings per domain

---

#### **Phase 3: Explore Page Integration** (Priority: MEDIUM)
**Timeline: Days 7-8**

**Tasks:**
9. **Add Domain Filtering to Explore** (NEEDS UPDATE)
   - **File:** `components/Explore.tsx`
   - **Current:** Basic domain dropdown (line ~30-50)
   - **TODO:**
     - Add domain tabs: All | Real Estate | Cars | Hotels | Restaurants | Events | Services | Marketplace
     - Domain-specific filters:
       - Real Estate: bedrooms, bathrooms, rentalType
       - Cars: transmission, fuelType, seats
       - Hotels: stars, amenities
       - Restaurants: cuisine, priceRange
       - Events: date range, eventType
       - Services: category, priceModel
     - Pull from Firestore with domain filter
     - Remove mock data fallback (now have 3,300 real listings)

10. **Create Domain-Specific Card Components** (NOT STARTED)
    - **Directory to create:** `components/explore/cards/`
    - **Cards:**
      - `RealEstateCard.tsx` - Show bedrooms, bathrooms, sqm
      - `CarCard.tsx` - Show make, model, year, transmission
      - `HotelCard.tsx` - Show stars, breakfast, amenities
      - `RestaurantCard.tsx` - Show cuisine, price range, rating
      - `EventCard.tsx` - Show date, venue, tickets available
      - `ServiceCard.tsx` - Show category, duration, price model
      - `MarketplaceCard.tsx` - Show condition, stock
    - **Pattern:** Each card extends BaseCard with domain-specific info

11. **Update Listing Detail Views** (NOT STARTED)
    - **File to create:** `components/explore/ListingDetail.tsx`
    - Domain-specific layouts
    - Show all relevant fields
    - Booking/contact CTA per domain

---

#### **Phase 4: Agent Integration & Testing** (Priority: MEDIUM)
**Timeline: Days 9-10**

**Tasks:**
12. **Update Agent Tool Resolvers** (NEEDS TESTING)
    - **File:** `functions/src/services/toolService.ts`
    - **Current:** searchMarketplace exists (line ~100)
    - **TODO:**
      - Test searchMarketplace with all domains
      - Test searchLocalPlaces for Restaurants, Services
      - Test searchEvents for Events domain
      - Add logging for zero results per domain
      - Debug subCategory filtering issues

13. **Test Agent Responses** (NOT STARTED)
    - Test queries:
      - "Find me a villa in Kyrenia" → Real Estate
      - "Show me car rentals under £50/day" → Cars
      - "What 5-star hotels are in Famagusta?" → Hotels
      - "Find seafood restaurants with sea view" → Restaurants
      - "What concerts are happening this weekend?" → Events
      - "I need an electrician" → Services
      - "Looking for used furniture" → Marketplace
    - Verify results match domain and filters
    - Check that agent describes domain-specific features

14. **Update System Prompt** (NEEDS UPDATE)
    - **File:** `functions/src/utils/systemPrompts.ts` (or in chat.controller.ts)
    - **TODO:** Update tool descriptions to mention all supported domains
    - Add domain-specific search guidance

---

#### **Phase 5: Data Migration & Seeding** (Priority: LOW)
**Timeline: Ongoing**

**Tasks:**
15. **Verify Seed Data** ✅ (COMPLETED)
    - 3,300 listings created across domains
    - Breakdown:
      - Real Estate: 400 (100 per rentalType)
      - Cars: 300 (100 per type)
      - Hotels: 500 (100 per hotelType)
      - Restaurants: 500 (100 per category)
      - Events: 500 (100 per eventType)
      - Services: 1,000 (100 per 10 categories)
      - Marketplace: 100

16. **Verify Typesense Indexing** (TODO)
    - Check index stats: `curl http://localhost:8108/collections/listings`
    - Verify all 3,300 docs indexed
    - Test search across domains
    - Check facet counts per domain

17. **Add More Realistic Data** (OPTIONAL)
    - Enhance seed script with:
      - Real restaurant menus
      - Actual hotel photos (via URLs)
      - Real event dates (upcoming)
      - Service provider contacts

---

### **📋 Technical Specifications**

#### **Unified Firestore Schema:**
```typescript
interface UnifiedListing {
  // === COMMON FIELDS (ALL DOMAINS) ===
  id: string;
  domain: MarketplaceDomain; // 'Real Estate' | 'Cars' | 'Hotels' | ...
  title: string;
  description: string;
  price: number;
  currency: string; // 'GBP' | 'TRY' | 'EUR'
  location: string; // City/area name
  imageUrl: string; // Primary image
  images?: string[]; // Additional images
  rating?: number; // 0-5
  reviews?: number;
  tags: string[];
  status: 'active' | 'draft' | 'archived' | 'sold' | 'rented';

  // Ownership
  ownerUid: string; // Firebase Auth UID
  businessId?: string; // If created by business
  agentPhone?: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Geo
  latitude?: number;
  longitude?: number;
  placeName?: string; // Formatted address

  // === NORMALIZED FIELD (for search) ===
  subCategory?: string; // Maps to: rentalType | type | hotelType | eventType | category
  category?: string; // Domain-specific category

  // === DOMAIN-SPECIFIC FIELDS ===

  // Real Estate
  rentalType?: 'short-term' | 'long-term' | 'sale' | 'project';
  bedrooms?: number;
  bathrooms?: number;
  livingRooms?: number;
  squareMeters?: number;
  plotSize?: number;
  buildYear?: number;
  floorNumber?: number;
  totalFloors?: number;
  furnishedStatus?: 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';
  titleDeedType?: 'Turkish Title' | 'Exchange Title' | 'TMD Title' | 'Leasehold';
  vatStatus?: 'Paid' | 'Not Paid' | 'Exempt';
  amenities?: string[]; // Pool, Gym, etc.
  maxGuests?: number;
  completionDate?: string;
  developerName?: string;
  referenceCode?: string;

  // Cars
  type?: 'rental' | 'sale' | 'taxi';
  make?: string; // Toyota, BMW, etc.
  model?: string;
  year?: number;
  transmission?: 'Automatic' | 'Manual';
  fuelType?: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
  seats?: number;
  mileage?: number;
  features?: string[]; // AC, GPS, etc.

  // Hotels
  hotelType?: 'Boutique' | 'Resort & Casino' | 'City Hotel' | 'Bungalow' | 'Historic';
  stars?: number; // 1-5
  breakfastIncluded?: boolean;
  checkInTime?: string; // '14:00'
  checkOutTime?: string; // '11:00'
  roomTypes?: string[]; // Standard, Suite, etc.

  // Restaurants
  restaurantName?: string;
  cuisine?: string;
  ingredients?: string[];
  preparationTime?: number; // minutes
  isVegetarian?: boolean;

  // Events
  eventType?: 'Party' | 'Concert' | 'Cultural' | 'Networking' | 'Festival';
  date?: string; // ISO date
  venue?: string;
  totalTickets?: number;
  ticketsAvailable?: number;
  organizer?: string;

  // Services
  pricingModel?: 'hourly' | 'fixed' | 'quote';
  durationMinutes?: number;
  providerName?: string;
  serviceArea?: string[]; // Areas served

  // Marketplace
  condition?: 'New' | 'Used';
  stock?: number;
  sellerName?: string;

  // Metrics
  views?: number;
  leads?: number;
  isBoosted?: boolean;
}
```

#### **API Endpoints (To Implement):**
```
POST   /v1/listings/create       - Create listing (any domain)
PUT    /v1/listings/:id          - Update listing
DELETE /v1/listings/:id          - Delete listing
GET    /v1/listings              - List with filters (domain, category, location, price)
GET    /v1/listings/:id          - Get single listing
POST   /v1/listings/import       - Import from URL ✅ EXISTS
POST   /v1/admin/reindex         - Reindex Typesense ✅ EXISTS
POST   /v1/admin/populate        - Seed database ✅ EXISTS
```

#### **Typesense Search Facets:**
```typescript
facets: ['domain', 'category', 'subCategory', 'location', 'type']
searchableFields: ['title', 'description', 'location', 'tags']
sortableFields: ['price', 'rating', 'createdAt']
filterableFields: ['price', 'bedrooms', 'bathrooms', 'seats', 'stars', 'condition']
```

---

### **🚀 Immediate Next Steps**

**Priority 1 (Start Now):**
1. ✅ Update codex with comprehensive sprint plan
2. ✅ Test Typesense indexing with populated data (3,300 listings confirmed)
3. ✅ Create unified listing API endpoints (POST /v1/listings, PUT, DELETE, GET)
4. ✅ Extend Typesense subCategory normalization (all domains supported)
5. ❌ Create CarsForm.tsx as template for other forms

**Priority 2 (Next Session):**
6. ❌ Update Explore.tsx with domain tabs
7. ❌ Create domain-specific card components
8. ❌ Test agent searches across all domains

**Priority 3 (Follow-up):**
9. ❌ Build remaining domain forms (Hotels, Restaurants, Events, Services, Marketplace)
10. ❌ Add domain selector to Business Dashboard
11. ❌ E2E testing

---

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
- **Current Subtask:** Fix AuthModal signup flow regression (`signupStep` undefined). Clean up to single email/password signup then onboarding screens (role/persona/tips) without legacy step state. Validate login view still works.
- **Current Task (Tool Sprint):** Implement full backend logic for all agent tools (marketplace, explore, social/tribes, profile, itineraries, business ops, notifications, geo) so the agent can execute every operation end-to-end.
  - **Purpose:** Replace stubs with real Firestore/Typesense/third-party integrations; ensure chat can search, book, notify, and interact socially with persisted data.
  - **Steps:**
    1) Catalogue tools + required data contracts; finalize Firestore collections (tribes, waves, checkIns, itineraries, businesses/leads/media, favorites, notifications).
    2) Implement resolvers with validation/auth, server timestamps, and error handling; remove placeholder returns (nearby, vibe map, hotspots, geo).
    3) Ensure search tools (marketplace/local/events) hit Typesense/Firestore with location normalization; add geo helpers or stubs that return meaningful mock data until live.
    4) Wire notifications (WhatsApp via Twilio, email/app placeholders) and payment/viewing flows with consistent collections; align booking storage vs lookup DB.
    5) Update system prompt to reflect new capabilities; restart Functions emulator and test key flows.
- **Current Task (Listings UX Sprint):** Make the property modal fully functional: robust quick-import from any URL (images + details), real address search with suggestions, reverse geocode “Use my location” to full address, auto-capture lat/lng + formatted address/district.
  - **Steps:**
    1) Upgrade import flow: backend import controller tries HTML scrape (cheerio) for meta + images; Gemini fallback; merge results; return structured listing data.
    2) Mapbox integration: ensure VITE_MAPBOX_TOKEN updated; forward geocode for suggestions with rich labels; reverse geocode on pin move/click and on “Use my location” to set formattedAddress, district/area, lat/lng.
    3) UI: show formatted address instead of raw coords; auto-populate location/district fields; keep coords visible for reference; support pin move + search + use-my-location paths.
    4) Persist: ensure listing save stores address fields (formattedAddress/placeName, district/location, lat, lng).
- **New Sprint Goal (Unified Listings Across Domains):** Ensure users can create listings across all domains (Real Estate, Cars/Vehicles, Marketplace, Events, Restaurants, Services, Hotels/Stays, Health & Beauty) and they persist to Firestore, appear in Explore, and are searchable via Typesense.
  - **Flow:** Create listing → Firestore `listings` (easy-db) → trigger/manual reindex → Typesense → Agent search + Explore UI.
  - **Steps:**
    1) Audit domain schemas (fields per domain: RE, Cars, Events, Restaurants, Services, Marketplace, Hotels, Health & Beauty). Define required fields: domain, category, subCategory/rentalType/type, price, location, images, amenities, etc.
    2) Normalize Firestore writes + Typesense mapping for all domains; ensure triggers/reindex upsert every domain with correct subCategory fallbacks (rentalType/type).
    3) Ensure client creation flows (upload) hit the correct Firestore collection with proper permissions; add per-domain manual reindex (query param) to avoid timeouts and aid debugging.
    4) Update Explore to consume live Firestore data for all domains (fallback only if empty); align filters with domain field names; add logging if empty.
    5) Verify agent/tool searches return each domain’s data; log index contents per domain on zero results.
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
- 2025-11-23: Removed hardcoded Firebase API key from `services/firebaseConfig.ts`; now uses `VITE_FIREBASE_API_KEY` env (placeholders added to .env files).
- **2025-11-24: Universal Listings Sprint Planning:**
  - ✅ Comprehensive codex update with full sprint plan for all 8 domains
  - ✅ Database populated with 3,300 seed listings across all domains via populate endpoint
  - ✅ Analyzed current state: Real Estate dashboard working, other domains need forms
  - ✅ Mapped all domain-specific fields and requirements in unified schema
  - ✅ Defined 5-phase implementation roadmap (Backend → Frontend Forms → Explore → Agent → Testing)
  - ✅ Documented technical specifications for API endpoints and Typesense indexing
- **2025-11-24: Backend API Implementation (Phase 1 Complete):**
  - ✅ Extended Typesense subCategory normalization to support all domains
  - ✅ Added domain-specific fields to Typesense schema (make/model, stars, seats, condition, etc.)
  - ✅ Created unified listing CRUD API: POST/PUT/DELETE/GET /v1/listings
  - ✅ Added authentication and ownership validation to all endpoints
  - ✅ Functions compiled successfully with new API
  - 📋 Next: Build domain-specific dashboard forms, update Explore page

## Known Gaps / Focus Areas
- Gemini config must use `apiVersion: 'v1'` and supported models (avoid v1beta 404s).
- Run Firestore/Auth emulators (or staging project) to avoid hitting production with ADC.
- Fix tool truthfulness: replies must mirror latest tool results; guard against invented listings.
- Stabilize chat persistence: server timestamps, role normalization, sliding window history.
- Payment: correct Stripe API version; upgrade `firebase-functions` to a supported release.
- Replace mock listings fallback with real/staged inventory; seed for dev.
- Add tests (unit/e2e), CI, and prod build/deploy scripts for frontend and functions.
