# Merve Capabilities Specification

> Complete technical documentation of what Merve can do and how each capability works.

---

## Overview

Merve is an AI concierge for North Cyprus. She can take real-world actions via tools that execute backend logic and dispatch requests via WhatsApp.

---

## 1. 🚕 Call a Taxi

### What It Does
User says "I need a taxi" → Merve collects pickup/destination → Broadcasts to available drivers → Notifies user when driver accepts.

### Tool
`requestTaxi`

### Data Flow

```
User Message → Gemini calls requestTaxi(pickup, destination)
                    ↓
         taxi.tools.ts::requestTaxi()
                    ↓
         taxi.repository.findAvailableTaxis(district)
                    ↓
         Queries: taxi_drivers WHERE status='available' AND district=X
                    ↓
         For each driver: sendWhatsApp(driver.phone, message)
                    ↓
         Creates taxi_requests doc with status='pending'
                    ↓
         Returns requestId to user
```

### Required Data
- `taxi_drivers` collection with:
  - `status: 'available'`
  - `phone: '+905...'` (E.164 format)
  - `currentLocation.district: 'Girne'`

### Status
⚠️ **WORKS IF** `taxi_drivers` collection has data with correct format.

---

## 2. 🛒 Order Groceries/Supplies

### What It Does
User says "Order 2 bottles of water" → Merve collects items/address → Finds vendor → Sends WhatsApp to vendor.

### Tool
`orderHouseholdSupplies`

### Data Flow

```
User Message → Gemini calls orderHouseholdSupplies(items, address)
                    ↓
         misc.tools.ts::orderHouseholdSupplies()
                    ↓
         1. Get user phone from users/{userId}
         2. Query: listings WHERE merve.enabled=true LIMIT 20
         3. Filter for merve.actions[].actionType='order_supplies'
         4. Get vendor phone from action.dispatch.toE164
                    ↓
         Save to groceryOrders collection
                    ↓
         DispatchService.sendWhatsApp(vendorPhone, order details)
                    ↓
         Returns orderId + status
```

### Required Data
- `listings` with:
  - `merve.enabled: true`
  - `merve.actions[]: { actionType: 'order_supplies', enabled: true, dispatch: { toE164: '+905...' } }`

### Status
⚠️ **LIKELY BROKEN** - If no listings have `order_supplies` action, order saves but no dispatch.

---

## 3. 🍕 Order Food

### What It Does
User says "Order kebab" → Merve finds restaurants → Shows options → User confirms → Sends order to restaurant via WhatsApp.

### Tools
1. `searchRestaurants` - Find restaurants
2. `getRestaurantMenu` - Get menu items
3. `orderFood` - Create order proposal
4. (Confirmation gate) - User says YES/NO
5. `confirmFoodOrder` - Dispatch via WhatsApp

### Data Flow

```
User: "Show me restaurants"
         ↓
searchRestaurants({ cuisine, area })
         ↓
merveListingsRepository.searchByAction({ actionType: 'order_food' })
         ↓
Query: listings WHERE merve.enabled=true 
                  AND merve.actionTypesEnabled ARRAY-CONTAINS 'order_food'
         ↓
Returns list of restaurants
         ↓
User selects restaurant, items
         ↓
orderFood({ restaurantName, items, deliveryAddress })
         ↓
Creates food_orders doc with status='pending'
Returns pendingAction for confirmation
         ↓
User says "YES"
         ↓
Confirmation gate triggers confirmFoodOrder(orderId)
         ↓
Gets restaurant listing → Gets WhatsApp number → Sends order details
```

### Required Data
- `listings` with:
  - `merve.enabled: true`
  - `merve.actions[]: { actionType: 'order_food', enabled: true, dispatch: { toE164: '+905...' } }`
  - `merve.actionTypesEnabled: ['order_food']` (derived index)
- Optionally: `listings/{id}/menuItems` subcollection for menu

### Status
❌ **BROKEN** - Screenshot shows "No restaurants found". Listings likely missing `order_food` action or `actionTypesEnabled` index.

---

## 4. 🔧 Book Services (Plumber, Electrician)

### What It Does
User says "I need a plumber" → Merve finds providers → Creates request → Dispatches via WhatsApp.

### Tools
1. `findServiceProviders` - Search for providers
2. `bookService` - Create request proposal
3. (Confirmation gate) - User says YES/NO
4. `confirmServiceRequest` - Dispatch

### Data Flow

```
User: "I need a plumber"
         ↓
bookService({ serviceType: 'plumber', address, description })
         ↓
merveListingsRepository.searchByAction({ actionType: 'request_service' })
   OR searchByAction({ actionType: 'book_service' })
         ↓
Query: listings WHERE merve.enabled=true AND has matching action
         ↓
Creates service_requests doc
Returns pendingAction
         ↓
User confirms → confirmServiceRequest → WhatsApp dispatch
```

### Required Data
- `listings` with `merve.actions[]: { actionType: 'request_service' OR 'book_service' }`

### Status
⚠️ **LIKELY BROKEN** - Same issue as restaurants.

---

## 5. 🔍 Search Marketplace

### What It Does
User says "Show me villas for rent" → Searches Typesense index → Returns results.

### Tool
`searchMarketplace`

### Data Flow

```
User: "Show me rental properties"
         ↓
searchMarketplace({ domain: 'Real Estate', location: 'Kyrenia' })
         ↓
search.tools.ts::searchMarketplace()
         ↓
typesense.service.ts::searchListings()
         ↓
Query Typesense index (NOT Firestore)
         ↓
Returns hits with title, price, location, etc.
```

### Required Data
- Typesense index synced with listings

### Status
❌ **BROKEN** - Screenshot shows "No rental properties found". Either Typesense not synced or empty.

---

## 6. 📍 Find Nearby Places

### What It Does
User says "Restaurants near me" → Uses GPS + queries curated places collection.

### Tool
`getNearbyPlaces`

### Data Flow

```
User: "What's near me"
         ↓
getNearbyPlaces({ location: 'current', domain: 'food' })
         ↓
misc.tools.ts::getNearbyPlaces()
         ↓
placesRepository.getByCityId(marketId)
         ↓
Query: places collection
Filter by distance using Haversine
         ↓
Returns nearby places
```

### Required Data
- `places` collection with coordinates

### Status
⚠️ **CHECK** - Depends on `places` collection having data.

---

## 7. 💊 Find Pharmacy

### What It Does
User says "On-duty pharmacy" → Returns today's pharmacies.

### Tool
`findPharmacy`

### Data Flow

```
pharmacyRepository.getTodaysPharmacies(district)
         ↓
Query: pharmacies collection for today's date
         ↓
Returns list with Google Maps links
```

### Status
⚠️ **CHECK** - Needs `pharmacies` collection with daily data.

---

## 8. 📰 Get News

### Tool: `getNews`

Queries `news` collection via `newsRepository.getLatest()`.

---

## 9. 💱 Exchange Rates

### Tool: `getExchangeRate`

Currently returns **hardcoded rates** (not live API).

---

## Summary of Issues

| Capability | Status | Root Cause |
|:-----------|:-------|:-----------|
| Taxi | ⚠️ | Needs `taxi_drivers` data |
| Groceries | ⚠️ | Needs listings with `order_supplies` action |
| Food | ❌ | Listings missing `order_food` action |
| Services | ⚠️ | Listings missing `book_service` action |
| Marketplace | ❌ | Typesense empty or not synced |
| Nearby Places | ⚠️ | Needs `places` collection |
| Pharmacy | ⚠️ | Needs `pharmacies` data |
| News | ⚠️ | Needs `news` data |
| Exchange | ✅ | Works (hardcoded) |

---

## Fix Priorities

1. **Add `actionTypesEnabled` index** to all Merve-enabled listings
2. **Verify listings have correct `actionType`** values
3. **Sync Typesense** with listings collection
4. **Add taxi drivers** to `taxi_drivers` collection
