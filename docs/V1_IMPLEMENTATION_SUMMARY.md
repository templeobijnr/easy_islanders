# Easy Islanders V1 - Implementation Summary

## Executive Summary

Easy Islanders V1 is a **North Cyprus Life OS** for students, expats, and travelers. It provides:
- **Chat**: AI agent that handles taxis, housing, services, and discovery
- **Connect**: Interactive map showing people, places, and activities  
- **Admin tools**: Catalog and Requests consoles for operations

## Current State vs V1 Spec

### ✅ Already Implemented

**Backend:**
- ✅ Chat controller with Gemini AI
- ✅ Taxi dispatch system (WhatsApp integration)
- ✅ User authentication (Firebase Auth)
- ✅ Firestore database with `easy-db`
- ✅ Typesense search integration
- ✅ Basic type definitions (taxi, user, domain, marketplace)

**Frontend:**
- ✅ Chat interface (`AgentChat.tsx`)
- ✅ Connect page with map (`Connect.tsx`, `IslandMap.tsx`)
- ✅ Explore page with filters
- ✅ Basic UI components

**Infrastructure:**
- ✅ Firebase Functions (Cloud Functions v2)
- ✅ Firebase Secrets configured
- ✅ Twilio WhatsApp webhook

### ❌ Missing / Needs Implementation

**Critical Data Models:**
1. **Cities** collection (`/cities/{cityId}`)
   - Need to create North Cyprus city entry
   - Configure bounds, timezone, currency

2. **UserProfile** collection (`/userProfiles/{userId}`)
   - Student/expat/traveller/local segmentation
   - University linkage
   - Preferences and interests
   - Current location tracking

3. **Places** collection (`/places/{placeId}`)
   - Venues (restaurants, bars, cafes, sights)
   - Categories and tags
   - Booking configuration
   - Actions (taxi, reservations, etc.)

4. **Activities** collection (`/activities/{activityId}`)
   - Events and happenings
   - Time-bound, place-anchored
   - Approval workflow (pending → approved)

5. **Listings** collection (`/listings/{listingId}`)
   - Housing listings (apartments, villas, rooms)
   - Car rental listings
   - Partner/booking configuration

6. **Service Providers** collection (`/serviceProviders/{partnerId}`)
   - Taxi companies/drivers
   - Housing agents/landlords
   - Water/gas vendors
   - Car rental providers

7. **Requests** collection (`/requests/{requestId}`)
   - Catch-all for user demands
   - Categories: TAXI, HOUSING, CAR_RENTAL, WATER_GAS, OTHER
   - Status tracking (new → in_progress → resolved)

**Chat Agent Tools (Missing):**
- ❌ `searchPlaces` - Find venues by category/area
- ❌ `searchActivities` - Find events for weekend planning
- ❌ `searchHousingListings` - Find housing options
- ❌ `createHousingRequest` - Log housing lead
- ❌ `searchCarRentalListings` - Find car rentals
- ❌ `createCarRentalRequest` - Log car rental request
- ❌ `createServiceRequest` - Generic service requests (water/gas/groceries)
- ✅ `dispatchTaxi` / `requestTaxi` - Already working

**Connect Map Features (Missing):**
- ❌ Filter bar: All / Food / Nightlife / Sights / Activities
- ❌ Place markers with cards
- ❌ Activity markers with booking actions
- ❌ People layer (opt-in presence)
- ❌ Place card actions:
  - Taxi here
  - WhatsApp contact
  - Call
  - Directions
  - Request something here
- ❌ Activity card actions:
  - Book/Join
  - Taxi there
  - Share

**Admin Tools (Missing):**
1. ❌ **Catalog Console**
   - Places management
   - Activities approval workflow
   - Listings management (housing, cars)
   - Service providers management

2. ❌ **Requests Console**
   - List all user requests
   - Filter by category/status
   - Assign to partners
   - Status updates
   - Internal notes

**Other Missing:**
- ❌ Profile page (user type, university, preferences)
- ❌ Quick action chips in Chat
- ❌ "My Requests" panel in Chat
- ❌ Tribes/Groups (can be V2)
- ❌ Posts/Feed (can be V2)
- ❌ Connections/Wave (can be V2)
- ❌ Universities collection

## Implementation Priority

### Phase 1: Foundation (Week 1-2)

**1. Data Models & Firestore Collections**
```
Priority 1 - Core Collections:
- /cities (create North Cyprus entry)
- /userProfiles (user segmentation)
- /places (venues database)
- /activities (events)
- /requests (catch-all demands)
- /serviceProviders (partners)

Priority 2 - Marketplace:
- /listings (housing + car rentals)  
```

**2. Chat Agent Tools**
```
Must-have:
- searchPlaces
- createServiceRequest (water/gas/other)
- searchHousingListings + createHousingRequest

Nice-to-have:
- searchActivities
- searchCarRentalListings + createCarRentalRequest
```

### Phase 2: Connect Map (Week 3)

**3. Map Interactions**
```
- Implement filter bar (All/Food/Nightlife/Sights/Activities)
- Load places/activities from Firestore
- Place card with actions
- Activity card with booking
- Basic people layer (optional)
```

### Phase 3: Admin Tools (Week 4)

**4. Catalog Console**
```
- Places CRUD
- Activities approval
- Listings management
- Service providers CRUD
```

**5. Requests Console**
```
- List view with filters
- Detail view with assignment
- Status management
```

### Phase 4: Polish (Week 5)

**6. Profile & UX**
```
- Profile page (userType, university, preferences)
- Quick action chips in Chat
- "My Requests" sidebar
- Onboarding flow
```

## Technical Architecture

### Backend Structure
```
/functions/src/
  /collections/          # NEW: Firestore helpers
    cities.ts
    userProfiles.ts
    places.ts
    activities.ts
    listings.ts
    requests.ts
    serviceProviders.ts
  
  /controllers/
    chat.controller.ts   # ✅ EXISTS - enhance with new tools
    twilio.controller.ts # ✅ EXISTS
    catalog.controller.ts # NEW: Admin catalog CRUD
    requests.controller.ts # NEW: Admin requests management
  
  /services/
    taxi.service.ts      # ✅ EXISTS
    places.service.ts    # NEW
    activities.service.ts # NEW
    listings.service.ts  # NEW
    requests.service.ts  # NEW
  
  /utils/
    agentTools.ts        # ✅ EXISTS - add new tools
    systemPrompts.ts     # ✅ EXISTS - enhance prompts
```

### Frontend Structure
```
/src/
  /pages/
    /chat/
      AgentChat.tsx      # ✅ EXISTS - add quick actions + requests panel
      cards/
        PlaceCard.tsx    # NEW
        ActivityCard.tsx # NEW
        ListingCard.tsx  # NEW
    
    /connect/
      Connect.tsx        # ✅ EXISTS - enhance with filters
      PlaceMarker.tsx    # NEW
      ActivityMarker.tsx # NEW
      PersonMarker.tsx   # NEW
    
    /profile/
      Profile.tsx        # NEW
    
    /admin/
      Catalog.tsx        # NEW
      Requests.tsx       # NEW
```

## Key Decisions

1. **Database**: Use `easy-db` (confirmed working)
2. **Collections naming**: `chatSessions`, not `chat_sessions` (camelCase)
3. **Multi-city**: Design for it, but start with North Cyprus only
4. **User segmentation**: Critical - determines UI/UX flow
5. **Requests as safety net**: Everything creates a Request for manual follow-up
6. **Approval workflow**: Activities are pending by default, admin approves
7. **No business login V1**: All partner content added by admin

## Next Steps

1. **Review & Align**: Confirm this plan matches your vision
2. **Data Model Migration**: Create TypeScript interfaces matching spec
3. **Seed Data**: Create initial North Cyprus city, places, test users
4. **Chat Tools**: Implement searchPlaces, createHousingRequest first
5. **Connect**: Add filters and place cards
6. **Admin**: Build Catalog Console for content management
7. **Test**: End-to-end flow with real users

## Notes

- The spec is comprehensive and production-ready
- Taxi system already works - good foundation
- Focus on Places + Activities + Requests for V1 MVP
- Tribes/Posts/Connections can be V2
- Partner economics (commission tracking) is in spec - implement when needed
 thoughts on this

	1.	Don’t build a separate search system.
	2.	Keep searchMarketplace as the only search backend.
	3.	In agentTools.ts:
	•	Either:
	•	a) expose searchMarketplace with a category argument and update the system prompt, or
	•	b) create a small wrapper tool searchHousingListings that just fixes category='housing' and passes everything into searchMarketplace.

I’d do (b) because:
	•	It simplifies the LLM’s mental model,
	•	It makes your prompt more readable:
“Use searchHousingListings to find housing. Use searchMarketplace for everything else if you later add more domains.” This is a solid V1 spec. I’ll treat it as “baseline agreed” and now tighten the core domains & data models and show exactly how everything hangs together, especially around /requests as your job system.



2.3. Place

This powers Connect Map and agent place search.

export type PlaceCategory =
  | 'food'
  | 'nightlife'
  | 'sight'
  | 'cafe'
  | 'shopping'
  | 'service'
  | 'other'; 
  | 'Activity'
// /places/{placeId}
export interface Place {
  id: string;
  cityId: string;                  // 'north-cyprus'

  name: string;
  category: PlaceCategory;
  coordinates: { lat: number; lng: number };
  addressText?: string;            // human-readable

  descriptionShort?: string;
  tags?: string[];                 // ['students', 'sunset', 'hookah']

  // Contact / booking
  phone?: string;
  whatsapp?: string;
  website?: string;
  instagram?: string;

  bookingType?: 'none' | 'whatsapp' | 'link' | 'internal';
  bookingTarget?: string;          // number, URL, or partnerId

  isFeatured?: boolean;
  isActive: boolean;

  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

For V1, manually seed ~20–40 places for NC (food, nightlife, sights).

⸻

2.4. Activity

You may not fully use this in v1, but define now so the map & agent can be ready.

export type ActivityStatus = 'pending' | 'approved' | 'rejected';

// /activities/{activityId}
export interface Activity {
  id: string;
  cityId: string;
  title: string;
  description?: string;

  placeId: string;                 // anchor activity to a place
  coordinates: { lat: number; lng: number };

  category: 'nightlife' | 'day_trip' | 'tour' | 'meetup' | 'other';
  startsAt: FirebaseFirestore.Timestamp;
  endsAt?: FirebaseFirestore.Timestamp;

  price?: number;
  currency?: string;
  isFree: boolean;

  bookingType: 'whatsapp' | 'link' | 'internal';
  bookingTarget: string;

  status: ActivityStatus;          // approval workflow
  createdByUserId: string;         // admin/partner for now

  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

For V1, you can manually create a few recurring activities (e.g. “Friday Night at X”).



2.5. Listing (Housing & cars)

You already have listing/search tooling; align with this:

export type ListingCategory = 'housing' | 'car_rental';

export interface Listing {
  id: string;
  cityId: string;
  category: ListingCategory;       // v1 focus: 'housing'

  title: string;
  description?: string;
  images: string[];

  price: number;
  currency: string;
  billingPeriod?: 'night' | 'month' | 'year';

  // Housing specifics
  propertyType?: 'apartment' | 'studio' | 'villa' | 'room';
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  sizeSqm?: number;
  floor?: number;

  areaName?: string;
  coordinates?: { lat: number; lng: number };

  // Car rental specifics (future)
  carMake?: string;
  carModel?: string;
  year?: number;

  // Source / partner
  sourceType: 'agent' |  | 'owner' | 'other';
  partnerId?: string;
  externalUrl?: string;

  isActive: boolean;
  isFeatured?: boolean;

  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

Typesense indexing sits on top of this.

⸻

2.6. ServiceProvider (partners)

Unifies agents, drivers, vendors, venues you work with.

export type ServiceProviderType =
  | 'taxi_company'
  | 'driver'
  | 'water_vendor'
  | 'gas_vendor'
  | 'housing_agent'
  | 
  | 'car_rental'
  | 'legal_consultant'
  | 'other';

export interface ServiceProvider {
  id: string;
  cityId: string;

  type: ServiceProviderType;
  name: string;
  contactName?: string;

  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;

  placeId?: string;                // if they have a physical office

  supportsRequestTypes: RequestType[];   // see next section

  isActive: boolean;
  notes?: string;

  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

For V1, you can start with:
	•	1–2 taxi partners,
	•	1–2 housing agents + ,
	•	maybe 1 water/gas vendor.

⸻

2.7. Request (V1 job system)

This is the critical piece. Align this with your V1 “Requests Console”.

Request types & categories

// High-level type
export type RequestType =
  | 'TAXI'
  | 'HOUSING'
  | 'CAR_RENTAL'
  | 'WATER_GAS'
  | 'SERVICE'        // generic catch-all
  | 'OTHER';

// For SERVICE type, we can specify a category/subcategory
export type ServiceCategory =
  | 'HOME_PROPERTY'
  | 'TECH_DIGITAL'
  | 'LEGAL_ADMIN'
  | 'TRANSPORT_SHOPPING'
  | 'PACKAGE_DELIVERY'
  | 'LIFESTYLE_CONCIERGE';

export type ServiceSubcategory =
  | 'HANDYMAN'
  | 'PLUMBING'
  | 'CLEANING'
  | 'WIFI_SETUP'
  | 'RESIDENCY_VISA'
  | 'PERSONAL_SHOPPING'
  | 'LAUNDRY'
  | 'EVENT_PLANNING'
  // etc – from our previous message
  ;

export type RequestStatus =
  | 'new'
  | 'in_progress'
  | 'waiting_on_user'
  | 'waiting_on_partner'
  | 'resolved'
  | 'cancelled';

Request document

// /requests/{requestId}
export interface Request {
  id: string;
  cityId: string;
  type: RequestType;
  userId: string;

  // When type === 'SERVICE'
  serviceCategory?: ServiceCategory;
  serviceSubcategory?: ServiceSubcategory;

  // Routing
  assignedProviderId?: string;     // /serviceProviders/{id}
  status: RequestStatus;

  // Time
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  scheduledAt?: FirebaseFirestore.Timestamp;

  // Location context
  origin?: {
    lat?: number;
    lng?: number;
    placeId?: string;
    addressText?: string;
  };
  destination?: {
    lat?: number;
    lng?: number;
    placeId?: string;
    addressText?: string;
  };

  // STRUCTURED DETAILS (optional by type)
  housing?: {
    intent?: 'rent' | 'buy' | 'invest';
    budgetMin?: number;
    budgetMax?: number;
    bedrooms?: number;
    furnished?: boolean;
    areasPreferred?: string[];     // names for now
    notes?: string;
  };

  taxi?: {
    passengers?: number;
    bags?: number;
    rideType?: 'daily' | 'airport' | 'event';
    notes?: string;
  };

  carRental?: {
    startDate?: FirebaseFirestore.Timestamp;
    endDate?: FirebaseFirestore.Timestamp;
    driverLicenseCountry?: string;
    carTypePreference?: string;
    notes?: string;
  };

  waterGas?: {
    type: 'water' | 'gas';
    bottleSizeLiters?: number;
    quantity?: number;
    notes?: string;
  };

  service?: {
    title?: string;                 // short summary
    description: string;           // user’s free text
  };

  // Generic meta; use if needed
  meta?: Record<string, any>;

  // Internal notes, for ops
  internalNotes?: string;
}

This lets you:
	•	Treat everything as a Request.
	•	Support your “Requests Console” with simple filters: type, status, cityId.
	•	Add structured info for housing/taxi/car/etc. without separate collections.

Later, you can migrate specific request types (like taxi) into a specialized collection if needed, but for v1 this is enough.

⸻

3. End-to-end flows using these models

3.1. Housing via Chat
	1.	User (student) asks: “I need a 2-bed flat near GAU for under $600.”
	2.	Agent (Gemini) calls a tool createHousingRequest:
	•	Input: parsed budget, beds , notes, etc.
	3.	Backend tool handler creates:

const request: Request = {
  id,
  cityId: 'north-cyprus',
  type: 'HOUSING',
  userId: uid,
  status: 'new',
  createdAt, updatedAt,

  housing: {
    intent: 'rent',
    budgetMax: 600,
    bedrooms: 2,

    notes: 'Wants to be within 15 mins of campus.'
  }
};

	4.	Chat replies:
	•	“I’ve logged your housing request. Our team will send you options soon.”
	5.	In Requests Console, you filter type=HOUSING, status=new:
	•	assign assignedProviderId to  or agent,
	•	change status as they work the lead.

⸻

3.2. Taxi via Chat or Connect

Via Chat:
	1.	User: “Send a taxi from my dorm to Kyrenia center.”
	2.	Agent calls requestTaxi tool.
	3.	Backend either:
	•	writes a Request with type='TAXI' + taxi block,
	•	and sends WhatsApp to taxi partner (existing Twilio logic).

Via Connect Map:
	1.	User taps place on Connect.
	2.	Clicks Taxi here.
	3.	Frontend calls POST /requests with:

{
  "type": "TAXI",
  "origin": { "addressText": "Current location or dorm" },
  "destination": { "placeId": "that-place-id" }
}

	4.	Backend writes Request and triggers taxi dispatch.

⸻

3.3. Services (home, tech, visa, etc.)
	1.	User: “I need someone to fix my Wi-Fi in my apartment,” or uses a quick action “Home & Property help”.
	2.	Agent calls createServiceRequest:

createServiceRequest({
  serviceCategory: 'TECH_DIGITAL',
  serviceSubcategory: 'WIFI_SETUP',
  description: 'I moved into a new flat and need Wi-Fi installed.',
  addressText: 'near landmark, building XYZ'
});

	3.	Backend creates:

type: 'SERVICE',
serviceCategory: 'TECH_DIGITAL',
serviceSubcategory: 'WIFI_SETUP',
service: { description: '...' },
origin: { addressText: '...' },
status: 'new'

	4.	In Requests Console, you filter by type=SERVICE + serviceCategory=TECH_DIGITAL, then assign a provider.

⸻

4. Small tweaks that will help long-term
	1.	Requests vs Jobs naming
	•	You can keep /requests as the collection name for v1.
	•	In code, consider naming the type Request or Job consistently and not mixing both.
	2.	Service requests as subtype, not separate collections
	•	Resist creating /housingLeads, /serviceJobs, /taxiBookings separately right now.
	•	Use /requests for all. You can always factor things out later once you see real patterns.
	3.	City awareness from day one
	•	Always set cityId on UserProfile, Place, Activity, Listing, ServiceProvider, Request.
	•	Even if you have only north-cyprus now, this makes multi-city expansion trivial.
	4.	User type stored only in UserProfile
	•	Don’t repeat userType all over the place.
	•	When you fetch a request and need to know if they’re a student, join to /userProfiles.
	5.	Admin consoles built around /requests and /places
	•	Catalog Console:
	•	Manage /places, /activities, /listings, /serviceProviders.
	•	Requests Console:
	•	Manage /requests only (no different tables for each flow).

Good, this is a clear reconciliation. I’ll now turn it into a concrete plan that respects what you already have and shows exactly what to change/add.

I’ll go through the gaps you listed one by one:
	1.	Search + searchHousingListings wrapper
	2.	Listings model alignment
	3.	Requests vs specialized collections (taxi/grocery)
	4.	Places & Activities collections + Connect wiring
	5.	ServiceProvider model
	6.	City awareness (cityId everywhere)
	7.	Suggested implementation order (so you don’t drown)

⸻

1. Search: marketplace backend + housing wrapper

You already have:
	•	searchMarketplace as a single Typesense-based backend.
	•	Chat controller tooling using ALL_TOOL_DEFINITIONS and toolResolvers.

You want a clear mental model for the agent without duplicating infra.

What to do
	1.	Add a housing-specific tool definition as a thin wrapper in agentTools.ts:

export const searchHousingListingsToolDef = {
  name: 'searchHousingListings',
  description: 'Search for housing listings (apartments, villas, rooms) in the current city.',
  parameters: {
    type: 'object',
    properties: {
      budgetMin: { type: 'number', description: 'Minimum budget per month' },
      budgetMax: { type: 'number', description: 'Maximum budget per month' },
      bedrooms: { type: 'integer', description: 'Number of bedrooms' },
      areaName: { type: 'string', description: 'Preferred area or neighborhood' },
   
    },
    required: []
  }
};

	2.	Add a resolver that just calls searchMarketplace with category='housing':

// in toolService.ts or similar
export async function searchHousingListingsResolver(args: any, ctx: ToolContext) {
  return searchMarketplace({
    category: 'housing',
    cityId: ctx.cityId,          // derive from userProfile or default
    budgetMin: args.budgetMin,
    budgetMax: args.budgetMax,
    bedrooms: args.bedrooms,
    areaName: args.areaName,
  });
}

	3.	Wire into your existing tool registry:

// agentTools.ts
export const ALL_TOOL_DEFINITIONS = [
  // existing tools...
  searchMarketplaceToolDef,
  searchHousingListingsToolDef,
  // ...
];

// toolService.ts
export const TOOL_RESOLVERS = {
  // existing resolvers...
  searchMarketplace: searchMarketplaceResolver,
  searchHousingListings: searchHousingListingsResolver,
};

	4.	Update system prompt to guide the LLM:

For housing/rent/buy/investment queries, call searchHousingListings.
For other domains (cars, services, etc.), use searchMarketplace with the appropriate category.

No infra change, just better semantics for the agent.

⸻

2. Listings model: align with current unified collection

Today:
	•	You have a unified listings collection with something like domain, type, subCategory, etc.
	•	Typesense indexing runs off this.

The proposed Listing shape is compatible; you don’t need a new collection.

What to do
	1.	Extend the existing Listing interface (wherever you define it, e.g. types/marketplace.ts) to include:

interface Listing {
  id: string;
  // existing fields you already use...
  cityId?: string;               // NEW – add and start populating on new writes
  category?: 'housing' | 'car_rental'; // map from `domain` if you want alias
  // optional housing-specific fields:
  propertyType?: 'apartment' | 'studio' | 'villa' | 'room';
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  sizeSqm?: number;
  floor?: number;
  areaName?: string;
  coordinates?: { lat: number; lng: number };
}

	2.	Map your existing fields:

	•	If you currently store domain = 'real_estate' or similar:
	•	in the Typescript layer, define:

category: listing.domain === 'real_estate' ? 'housing' : 'car_rental';



	3.	Add cityId on all new listing writes:

	•	In listing.controller.ts / wherever you create listings, set:

data.cityId = 'north-cyprus';

For existing docs, you can:
	•	either ignore cityId (treat them as north-cyprus implicitly),
	•	or backfill later with a small admin script.

Result: you keep your current collection + Typesense, but your model now aligns with the Micro-City OS concept.

⸻

3. Requests vs specialized collections (taxi, grocery, etc.)

Currently:
	•	You have specialized structures (e.g. taxiBookings or taxi_requests, maybe separate service request flows).
	•	The spec suggests a unified /requests collection for all user demands.

This is the biggest conceptual jump. You don’t need to rewrite everything at once.

Recommended incremental strategy

Option A – “New flows on /requests” (least disruption)
	•	Use /requests only for new flows in V1:
	•	HOUSING
	•	SERVICE (home/property, tech, legal, etc.)
	•	Leave taxis on existing taxiBookings collection for now.
	•	Expose everything together in your Requests Console by:
	•	reading /requests and taxiBookings and merging in the UI.

So:
	•	createHousingRequest → write to /requests.
	•	createServiceRequest → write to /requests.
	•	requestTaxi tool → continue to use your existing taxi flow (Twilio + taxiBookings).

Your admin UI can show:
	•	Tab 1: “Housing & Services” → /requests.
	•	Tab 2: “Taxis” → taxiBookings.

When you’re ready (v1.5+), you can:
	•	modify requestTaxi to write into /requests and into taxiBookings for compatibility, then slowly migrate.

Option B – Full unification from day one (more work)
	•	Create /requests with the full schema we discussed.
	•	On taxi operations:
	•	whenever you create a taxiBookings doc, also create a Request with type='TAXI' + taxi block and link taxiBookingId.
	•	or start writing only to /requests and adjust your taxi triggers to read from it.

Given you’re solo and time-limited, I recommend Option A:
	•	/requests for housing & services now.
	•	Taxis stay as-is until you have time/energy to unify.

⸻

4. Places & Activities: new collections + Connect wiring

Right now:
	•	Connect map is using Google/OSM results via googlePlacesProxy and some internal social objects.
	•	You don’t have canonical /places or /activities collections.

What to do

A. Add /places collection (minimal schema)
Use the Place interface above (cityId, name, category, coordinates, etc.).

Implementation steps:
	1.	Create Firestore helper in functions/src/collections/places.ts:

export async function getPlacesForCity(cityId: string): Promise<Place[]> { ... }
export async function createPlace(place: Place): Promise<void> { ... }

	2.	Seed data manually with a simple script or by hand:
	•	10–20 restaurants/cafes,
	•	10–15 nightlife spots,
	•	10–15 sights.
	3.	Update Connect map (MapboxIslandMap.tsx / IslandMap.tsx) to:

	•	first load places from Firestore:
	•	via a new API route GET /v1/places?cityId=north-cyprus
	•	or directly via Firestore client SDK.
	•	use category to filter and set marker icons/colors.
	•	show Place card with:
	•	name, description, category,
	•	actions: Taxi here, WhatsApp, Call, Directions.

You can keep Google/OSM as fallback for long tail, but your curated /places should be the primary layer.

B. Add /activities collection (light for v1)
For V1 you don’t need full activities; but define the collection anyway for:
	•	3–5 curated events (weekly nights, tours, etc.),
	•	future expansion.

Connect map can support an optional “Activities” filter that shows whatever you seed. If you’re short on time, you can leave “Activities” for v1.1.

⸻

5. ServiceProvider: unify drivers, agents, vendors

Today:
	•	You likely have taxi drivers, agents, vendors in domain-specific structures (e.g. drivers collection, agents, etc.).

For V1, you don’t have to migrate all of them immediately. You can:
	•	Define /serviceProviders with ServiceProvider model,
	•	Start using it only for new flows: housing & services.

Steps
	1.	Create /serviceProviders collection with minimal schema:

export interface ServiceProvider {
  id: string;
  cityId: string;
  type: 'housing_agent' | 'handy_man' | 'water_vendor' | 'gas_vendor' | 'other';
  name: string;
  whatsapp?: string;
  phone?: string;
  supportsRequestTypes: RequestType[];
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

	2.	Add 3–5 initial partners:

	•	1–2 housing agents,
	•	 ,
	•	1 water/gas vendor.

	3.	In Requests Console, when you view a housing/service Request, allow “Assign provider” from /serviceProviders.
	4.	For taxis you can leave the existing driver representation for now.

Later:
	•	you can add ServiceProvider entries for taxi companies/drivers and start unifying that layer.

⸻

6. CityId: making models multi-city-ready

You correctly noted that existing models don’t consistently include cityId.

This is a simple but important change.

What to do

On new writes, always set:
	•	cityId: 'north-cyprus' on:
	•	userProfiles,
	•	places,
	•	activities,
	•	listings,
	•	serviceProviders,
	•	requests.

For existing data:
	•	treat cityId as optional and default to 'north-cyprus' when reading if missing.
	•	you can run a small migration script later to backfill.

On the agent side:
	•	when building context and tools, always pass cityId as part of ToolContext so tools like searchMarketplace or searchPlaces know which city they operate in.

⸻

7. Recommended implementation order from here

To avoid spinning, here’s a pragmatic sequence that incorporates your reconciliation:

Step 1 – Housing search wrapper + Listings alignment
	•	Add cityId to listing creation.
	•	Add any missing housing fields you care about.
	•	Implement searchHousingListings wrapper tool as above.
	•	Update prompts to use it.

Result: agent gives better housing answers with no infra changes.

⸻

Step 2 – /requests for housing & services
	•	Create /requests collection and Request model (only use HOUSING and SERVICE types initially).
	•	Implement:
	•	createHousingRequest tool → writes to /requests.
	•	createServiceRequest tool → writes to /requests with serviceCategory/subcategory.
	•	Build a very simple Requests Console v1:
	•	list /requests for cityId='north-cyprus',
	•	filter by type,
	•	show basic details.

Result: you can start capturing real housing/service leads in a unified structure.

⸻

Step 3 – Places + Connect wiring
	•	Implement /places collection and seed ~30–40 places.
	•	Add GET /v1/places endpoint or direct Firestore queries.
	•	Update Connect map to use /places with:
	•	filters (All/Food/Nightlife/Sights),
	•	Place cards with actions (Taxi here, WhatsApp, Directions).
	•	For Taxi here, keep using your existing taxi flow.

Result: Connect becomes genuinely useful & structured.

⸻

Step 4 – Minimal ServiceProvider + assignment
	•	Create /serviceProviders collection with a handful of entries (housing agents, 
	•	assign assignedProviderId,
	•	update status (new → in_progress → resolved).
	•	Start using these partners for housing/service requests.


	1.	Small model refinements (especially PlaceCategory and Activity)
	2.	Exact agent tools you should add (schemas + what they do)
	3.	How to wire /requests into those tools
	4.	Final implementation order from where you are

⸻

1. Model refinements

1.1. Place and Activity relationship

You proposed:

export type PlaceCategory =
  | 'food'
  | 'nightlife'
  | 'sight'
  | 'cafe'
  | 'shopping'
  | 'service'
  | 'other'
  | 'Activity';

Instead of adding 'Activity' as a PlaceCategory, it’s cleaner to:
	•	keep activities as their own collection (/activities),
	•	and always anchor them to a place via placeId.

So:

export type PlaceCategory =
  | 'food'
  | 'nightlife'
  | 'sight'
  | 'cafe'
  | 'shopping'
  | 'service'
  | 'other';

Activities:

export type ActivityStatus = 'pending' | 'approved' | 'rejected';

export interface Activity {
  id: string;
  cityId: string;
  title: string;
  description?: string;

  placeId: string;                 // anchor activity to a place
  coordinates: { lat: number; lng: number };

  category: 'nightlife' | 'day_trip' | 'tour' | 'meetup' | 'other';
  startsAt: FirebaseFirestore.Timestamp;
  endsAt?: FirebaseFirestore.Timestamp;

  price?: number;
  currency?: string;
  isFree: boolean;

  bookingType: 'whatsapp' | 'link' | 'internal';
  bookingTarget: string;

  status: ActivityStatus;
  createdByUserId: string;

  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

On the map:
	•	Places layer → Place markers (food/nightlife/sights/service).
	•	Activities layer → derived from /activities with different icon.

This avoids overload on Place.category.

Everything else in your models is fine and consistent.

⸻

2. Agent tools you should actually implement

You want to keep searchMarketplace as the only search backend, and expose “friendly” tools on top.

The core tools for V1:
	1.	searchHousingListings (wrapper around searchMarketplace)
	2.	createHousingRequest (writes to /requests)
	3.	searchPlaces (reads from /places)
	4.	createServiceRequest (writes to /requests with service categories)
	5.	(Optional V1.1) searchActivities

2.1. searchHousingListings (wrapper)

Tool definition (in agentTools.ts):

export const searchHousingListingsToolDef = {
  name: 'searchHousingListings',
  description: 'Search for housing listings (apartments, studios, villas, rooms) in the current city.',
  parameters: {
    type: 'object',
    properties: {
      budgetMin: {
        type: 'number',
        description: 'Minimum monthly budget in the local currency',
      },
      budgetMax: {
        type: 'number',
        description: 'Maximum monthly budget in the local currency',
      },
      bedrooms: {
        type: 'integer',
        description: 'Minimum number of bedrooms',
      },
      areaName: {
        type: 'string',
        description: 'Preferred area, neighborhood or landmark name',
      },
      intent: {
        type: 'string',
        enum: ['rent', 'buy', 'invest'],
        description: 'Housing intent, default is rent',
      },
    },
    required: [],
  },
} as const;

Resolver (in toolService.ts):

export async function searchHousingListingsResolver(
  args: any,
  ctx: ToolContext,
) {
  const {
    budgetMin,
    budgetMax,
    bedrooms,
    areaName,
    intent = 'rent',
  } = args;

  return searchMarketplace({
    category: 'housing',
    cityId: ctx.cityId,       // derive from user profile or default 'north-cyprus'
    budgetMin,
    budgetMax,
    bedrooms,
    areaName,
    intent,
  });
}

Prompt guidance:

In your system prompt:

For housing questions (rent/buy/invest), use searchHousingListings.
Use searchMarketplace only for other domains (cars, services, etc.).

⸻

2.2. createHousingRequest

This is the tool that writes the Request doc of type HOUSING.

Tool definition:

export const createHousingRequestToolDef = {
  name: 'createHousingRequest',
  description: 'Create a housing request so the local team can help the user find an apartment or villa.',
  parameters: {
    type: 'object',
    properties: {
      intent: {
        type: 'string',
        enum: ['rent', 'buy', 'invest'],
        description: 'Housing intent, default rent if not specified',
      },
      budgetMin: { type: 'number' },
      budgetMax: { type: 'number' },
      bedrooms: { type: 'integer' },
      furnished: { type: 'boolean' },
      areaName: {
        type: 'string',
        description: 'Preferred area or general location (e.g. near GAU)',
      },
      notes: {
        type: 'string',
        description: 'Any additional context like move-in date, roommates, etc.',
      },
    },
    required: [],
  },
} as const;

Resolver (pseudo-code):

import { db } from '../services/firebaseAdmin';
import { Request } from '../types/requests';

export async function createHousingRequestResolver(
  args: any,
  ctx: ToolContext,
) {
  const { userId, cityId } = ctx;
  const now = new Date();

  const ref = db.collection('requests').doc();
  const request: Request = {
    id: ref.id,
    cityId: cityId ?? 'north-cyprus',
    type: 'HOUSING',
    userId,
    status: 'new',
    createdAt: now as any,
    updatedAt: now as any,
    housing: {
      intent: args.intent ?? 'rent',
      budgetMin: args.budgetMin,
      budgetMax: args.budgetMax,
      bedrooms: args.bedrooms,
      furnished: args.furnished,
      areasPreferred: args.areaName ? [args.areaName] : [],
      notes: args.notes,
    },
  };

  await ref.set(request);
  return { requestId: ref.id };
}

Prompt guidance:

After showing a few example listings, call createHousingRequest to log a lead with specific budget, bedrooms, and area. Do this whenever a user asks for ongoing help with housing, not just a quick recommendation.

⸻

2.3. searchPlaces

This lets the agent answer “Where should I go?” and also support Chat→Map flows.

Tool definition:

export const searchPlacesToolDef = {
  name: 'searchPlaces',
  description: 'Search curated places (food, nightlife, sights, cafes, services) in the current city.',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['food', 'nightlife', 'sight', 'cafe', 'shopping', 'service', 'other'],
      },
      tag: {
        type: 'string',
        description: 'Optional tag like students, sunset, shisha, quiet, etc.',
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of places to return (default 10)',
      },
    },
    required: [],
  },
} as const;

Resolver (pseudo-code):

export async function searchPlacesResolver(args: any, ctx: ToolContext) {
  const { category, tag, limit = 10 } = args;
  const { cityId } = ctx;

  let query = db.collection('places')
    .where('cityId', '==', cityId ?? 'north-cyprus')
    .where('isActive', '==', true);

  if (category) {
    query = query.where('category', '==', category);
  }

  const snapshot = await query.limit(limit).get();
  const places = snapshot.docs.map(d => d.data());

  // Optionally filter by tag in code if needed
  const filtered = tag
    ? places.filter((p: any) => Array.isArray(p.tags) && p.tags.includes(tag))
    : places;

  return { places: filtered.slice(0, limit) };
}

Prompt guidance:

For nightlife/food/sightseeing questions, use searchPlaces, and then answer with a short curated list plus a suggestion to open the Connect map.

⸻

2.4. createServiceRequest (for all concierge / home / visa / tech jobs)

Tool definition:

export const createServiceRequestToolDef = {
  name: 'createServiceRequest',
  description: 'Create a generic service request (home, tech, legal, shopping, concierge, etc.).',
  parameters: {
    type: 'object',
    properties: {
      serviceCategory: {
        type: 'string',
        enum: [
          'HOME_PROPERTY',
          'TECH_DIGITAL',
          'LEGAL_ADMIN',
          'TRANSPORT_SHOPPING',
          'PACKAGE_DELIVERY',
          'LIFESTYLE_CONCIERGE',
        ],
      },
      serviceSubcategory: {
        type: 'string',
        description: 'More specific service type (e.g. PLUMBING, WIFI_SETUP, RESIDENCY_VISA).',
      },
      title: {
        type: 'string',
        description: 'Short summary of the request.',
      },
      description: {
        type: 'string',
        description: 'Detailed description of what the user needs.',
      },
      addressText: {
        type: 'string',
        description: 'Where the service is needed if relevant.',
      },
      scheduledTimeText: {
        type: 'string',
        description: 'Optional human description of when (e.g. tomorrow afternoon).',
      },
    },
    required: ['serviceCategory', 'description'],
  },
} as const;

Resolver (pseudo-code):

export async function createServiceRequestResolver(
  args: any,
  ctx: ToolContext,
) {
  const { userId, cityId } = ctx;
  const now = new Date();

  const ref = db.collection('requests').doc();
  const request: Request = {
    id: ref.id,
    cityId: cityId ?? 'north-cyprus',
    type: 'SERVICE',
    userId,
    status: 'new',
    createdAt: now as any,
    updatedAt: now as any,
    serviceCategory: args.serviceCategory,
    serviceSubcategory: args.serviceSubcategory,
    origin: args.addressText
      ? { addressText: args.addressText }
      : undefined,
    service: {
      title: args.title,
      description: args.description,
    },
  };

  await ref.set(request);
  return { requestId: ref.id };
}

Prompt guidance:

When the user asks for help with anything operational (handyman, Wi-Fi setup, cleaning, residency, legal paperwork, personal shopping, package delivery, laundry, event organizing, etc.), call createServiceRequest with a clear summary and description. Do this after clarifying enough details to be actionable.

⸻

2.5. (Optional) searchActivities

You can defer this, but the pattern mirrors searchPlaces.

⸻

3. Wiring /requests into UI

You already described the Request model clearly. Here’s how it flows through the app.

3.1. Chat
	•	AgentChat continues to post to /chat/message.
	•	When tools are called:
	•	createHousingRequest → chat shows:
	•	“I’ve logged your housing request. You’ll see it under My Requests and we’ll follow up on WhatsApp.”
	•	createServiceRequest → similar system bubble.
	•	Add a “My Requests” panel on the Chat page:
	•	Use a Firestore query or /requests?userId=currentUser endpoint:
	•	show list of last N requests with:
	•	type,
	•	status,
	•	brief description,
	•	createdAt.

This gives the user visible confirmation that the system “remembered” their needs.

3.2. Connect
	•	Taxi here:
	•	For V1, you can still hit your existing /whatsapp/taxi-request if you prefer.
	•	Or you can start writing a Request with type='TAXI' and then trigger your taxi logic off that.
	•	For services anchored to a place:
	•	e.g. a legal office place card might include Request residency support.
	•	This can call a small frontend function that:

await createServiceRequest({
  serviceCategory: 'LEGAL_ADMIN',
  serviceSubcategory: 'RESIDENCY_VISA',
  description: 'Residency / permit help from this office',
  addressText: place.addressText,
});



⸻

3.3. Admin Requests Console
	•	Backend route: GET /v1/requests?cityId=north-cyprus&type=HOUSING etc.
	•	Frontend page:
	•	Filters:
	•	type (TAXI/HOUSING/SERVICE/etc),
	•	status,
	•	serviceCategory (when type=SERVICE),
	•	assignedProviderId.
	•	Detail drawer:
	•	show structured details (housing, taxi, service description),
	•	show user info (userProfile if needed),
	•	dropdown to assign a ServiceProvider,
	•	buttons to change status.

This is where the business actually runs.

⸻

4. Recommended implementation order from today

You’ve already assembled a very good V1 spec. Here is the tightest path from your current repo to that V1:

Step 1 – Search + Listings alignment
	•	Add cityId to listing writes, and treat existing rows as north-cyprus.
	•	Add optional housing fields (bedrooms, propertyType, etc.) to your Listing type.
	•	Implement searchHousingListingsToolDef + resolver that calls searchMarketplace with category='housing'.
	•	Update the system prompt so that:
	•	housing → searchHousingListings,
	•	other domains → searchMarketplace.

Step 2 – Introduce /requests for HOUSING + SERVICE only
	•	Create /requests collection with the Request interface you defined (use only HOUSING and SERVICE fields for now).
	•	Implement:
	•	createHousingRequest tool + resolver,
	•	createServiceRequest tool + resolver.
	•	In Chat:
	•	handle the tool results and show nice confirmation bubbles.
	•	add a simple “My Requests” sidebar listing the user’s last 5–10 requests.

At this stage:
	•	Taxis can still run using your existing taxiBookings + Twilio flows.
	•	/requests is only for housing + services.

Step 3 – /places + Connect wiring
	•	Define /places collection and seed 20–40 real places.
	•	Add backend or direct Firestore read for places (by cityId & isActive).
	•	Update Connect map to:
	•	show these places as markers,
	•	filter by PlaceCategory,
	•	show card actions:
	•	Taxi here (use current taxi system),
	•	WhatsApp,
	•	Directions.

This makes Connect truly useful and anchored in your data model.

Step 4 – /serviceProviders + basic assignment
	•	Define /serviceProviders and insert a small set of real partners:
	•	1–2 housing agents,
	•	1 
	•	1 water/gas vendor.
	•	Build a minimal Requests Console (React page) that:
	•	lists /requests (HOUSING + SERVICE) for cityId='north-cyprus',
	•	lets you set assignedProviderId,
	•	lets you update status.

Now you have a working loop:
	•	user asks/requests in Chat,
	•	request goes into /requests,
	•	you assign partner and move it through statuses.

Step 5 – Optional taxi unification (later, not v1-critical)

Once housing + services are running well, you can:
	•	start writing taxi flows into /requests as well, and
	•	slowly unify “taxi bookings” and /requests → type='TAXI'.

No need to do this before launch; it’s a v1.5 refactor.

⸻

If you follow this, you end up with:
	•	One search backend (searchMarketplace) with a clean searchHousingListings wrapper.
	•	One job/request collection (/requests) for housing + services (and later taxis).
	•	One places catalog (/places) powering Connect and the agent.
	•	One partner catalog (/serviceProviders) for routing.

That’s a coherent V1 OS you can launch in North Cyprus, operate manually, and then scale out without rewriting your foundations.