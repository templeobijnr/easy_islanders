# Merve Tool Inventory

> **Total: 55 tool functions** across 13 resolver files.
> This document maps each tool's purpose, data source, and flow.

---

## 1. Taxi & Transportation (`taxi.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `requestTaxi` | Create taxi request, broadcast to drivers | `users`, `taxi_requests`, `taxi_drivers` | Collect → Geocode → Persist → Broadcast via WhatsApp |
| `dispatchTaxi` | **DEPRECATED** - redirects to requestTaxi | Same | Legacy alias |

---

## 2. Search & Discovery (`search.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `searchMarketplace` | Search listings (properties, cars, services) | **Typesense** (indexed from `listings`) | Query Typesense → Return hits |
| `searchLocalPlaces` | Search POIs via Mapbox | **Mapbox API** (external) | Query Mapbox → Return places |
| `searchEvents` | Search events | **Typesense** (domain=Events) | Query Typesense → Return events |
| `searchHousingListings` | Search housing listings | **Typesense** (domain=Real Estate) | Query Typesense → Return housing |
| `searchPlaces` | Search curated places | **Typesense** + Mapbox fallback | Try Typesense → Fallback to Mapbox |

---

## 3. Food Ordering (`food.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `searchRestaurants` | Find restaurants by cuisine/area | `listings` via `merveListingsRepository.searchByAction()` | Query listings → Return restaurants |
| `getRestaurantMenu` | Get menu items for a restaurant | `listings/{id}/menuItems` via `listingDataRepository` | Query subcollection → Return menu |
| `orderFood` | Create food order proposal | `users`, `listings`, `food_orders` | Validate → Persist → Return pendingAction |
| `confirmFoodOrder` | Dispatch food order via WhatsApp | `food_orders`, `listings` | Read order → Resolve WhatsApp target → Dispatch |

---

## 4. Service Booking (`service.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `findServiceProviders` | Find plumbers, electricians, etc. | `listings` via `merveListingsRepository.searchByAction()` | Query listings → Return providers |
| `bookService` | Create service request proposal | `users`, `listings`, `service_requests` | Validate → Persist → Return pendingAction |
| `confirmServiceRequest` | Dispatch service request via WhatsApp | `service_requests`, `listings` | Read request → Dispatch |

---

## 5. Generic Requests (`requests.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `createServiceRequest` | Create generic service request | `requests` | Validate → Persist |
| `createOrder` | Create water/gas/grocery order | `requests` | Validate → Persist |

> **⚠️ REDUNDANCY**: These overlap with `food.tools` and `misc.tools`

---

## 6. Misc Tools (`misc.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `createConsumerRequest` | Create custom request | None (stub) | Return fake ID |
| `getRealTimeInfo` | Get weather/exchange rates | None (hardcoded) | Return static data |
| `consultEncyclopedia` | Knowledge base lookup | None (stub) | Return placeholder |
| `getNearbyPlaces` | Find nearby curated places | `places` via `placesRepository` + Mapbox | Geocode → Query places → Filter by distance |
| `orderHouseholdSupplies` | Order water/gas/groceries | `users`, `listings`, `groceryOrders` | Validate → Find vendor → Persist → Dispatch via WhatsApp |
| `requestService` | Request handyman/plumber | None (stub) | Return fake ID |
| `showMap` | Return map pin data | None | Return coordinates |
| `computeDistance` | Calculate distance between points | None | Haversine calculation |
| `fetchHotspots` | Get popular check-in spots | `checkIns` | Aggregate check-ins |
| `getAreaInfo` | Get area hotspots | `checkIns` | Call fetchHotspots |

> **⚠️ REDUNDANCY**: `orderHouseholdSupplies` overlaps with `requests.tools.createOrder`
> **⚠️ REDUNDANCY**: `requestService` overlaps with `service.tools.bookService`

---

## 7. Booking (`booking.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `createBooking` | Create booking document | `listings`, `bookings` | Validate → Persist → Return receipt |
| `scheduleViewing` | Schedule property viewing | `listings`, `viewingRequests` | Persist → Send WhatsApp to owner |
| `createPaymentIntent` | Create Stripe payment intent | `bookings`, Stripe (external) | Validate → Create intent |
| `initiateBooking` | Create held booking (ledger) | `listings`, `businesses/{id}/transactions` | Validate → Create draft → Hold → Return pendingAction |

---

## 8. Info Tools (`info.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `findPharmacy` | Find on-duty pharmacies | `pharmacies` via `pharmacyRepository` | Query → Return with maps links |
| `getNews` | Get latest news headlines | `news` via `newsRepository` | Query → Return articles |
| `getExchangeRate` | Get currency exchange rates | Hardcoded rates (TODO: API) | Lookup → Return rate |
| `showDirections` | Generate Google Maps directions link | None | Build URL → Return |

---

## 9. User Tools (`user.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `getUserProfile` | Get user profile | `users` | Read doc → Return |
| `updateUserProfile` | Update user preferences | `users` | Write doc |
| `saveFavoriteItem` | Save item to favorites | `users/{id}/favorites` | Write subcollection |
| `listFavorites` | List user favorites | `users/{id}/favorites` | Read subcollection |

---

## 10. Social Tools (`social.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `createTribe` | Create social tribe | `tribes` | Persist |
| `joinTribe` | Join a tribe | `tribes/{id}/members` | Add member |
| `leaveTribe` | Leave a tribe | `tribes/{id}/members` | Remove member |
| `postToTribe` | Post message to tribe | `tribes/{id}/posts` | Persist post |
| `listTribeMessages` | List tribe posts | `tribes/{id}/posts` | Query posts |
| `getTribeInfo` | Get tribe details | `tribes` | Read doc |
| `listTrendingTribes` | List popular tribes | `tribes` | Query recent |
| `waveUser` | Send wave to user | `waves` | Persist |
| `acceptWave` | Accept wave | `waves` | Update status |
| `listNearbyUsers` | List nearby users | `checkIns` | Query recent check-ins |
| `checkInToPlace` | Check in to a place | `checkIns` | Persist |
| `getCheckInsForPlace` | Get check-ins for place | `checkIns` | Query by placeId |
| `fetchVibeMapData` | Get vibe map data | None (stub) | Return empty |

> **⚠️ TO REMOVE**: All `*Tribe*` and `*Wave*` tools (per user request)

---

## 11. Communication (`communication.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `sendWhatsAppMessage` | Send WhatsApp via Twilio | `DispatchService`, `notifications` | Dispatch → Log |
| `sendAppNotification` | Send in-app notification | `notifications` | Persist |
| `sendEmailNotification` | Send email (TODO) | None | Stub |

---

## 12. Itinerary (`itinerary.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `createItinerary` | Create trip itinerary | `itineraries` | Persist |
| `addToItinerary` | Add item to itinerary | `itineraries/{id}/items` | Add item |
| `removeFromItinerary` | Remove item from itinerary | `itineraries/{id}/items` | Delete item |
| `getItinerary` | Get itinerary with items | `itineraries`, `itineraries/{id}/items` | Read |
| `saveItinerary` | Save itinerary (no-op) | None | Return success |

---

## 13. Business Tools (`business.tools.ts`)

| Tool | Purpose | Data Source | Flow |
|:-----|:--------|:------------|:-----|
| `updateBusinessInfo` | Update business details | `businesses` | Write |
| `updateBusinessAvailability` | Update availability | `businesses` | Write |
| `updateBusinessHours` | Update operating hours | `businesses` | Write |
| `uploadBusinessMedia` | Upload media to business | `businesses/{id}/media` | Write subcollection |
| `listBusinessLeads` | List leads for business | `businesses/{id}/leads` | Query |
| `respondToLead` | Respond to a lead | `businesses/{id}/leads` | Update doc |

---

## Summary: Redundancy Analysis

| Domain | Overlapping Tools | Recommended Canonical |
|:-------|:------------------|:----------------------|
| Search | `searchMarketplace`, `searchLocalPlaces`, `searchPlaces`, `getNearbyPlaces` | `searchPlaces` (unified) |
| Restaurant Search | `searchRestaurants`, `searchLocalPlaces` (restaurants) | `searchRestaurants` |
| Order Supplies | `orderHouseholdSupplies`, `createOrder` | `orderHouseholdSupplies` |
| Service Request | `requestService`, `bookService`, `createServiceRequest` | `bookService` |
| Booking | `createBooking`, `initiateBooking` | `initiateBooking` (ledger-based) |

---

## Tools to Remove (Per User Request)

- `createTribe`
- `joinTribe`
- `leaveTribe`
- `postToTribe`
- `listTribeMessages`
- `getTribeInfo`
- `listTrendingTribes`
- `waveUser`
- `acceptWave`
