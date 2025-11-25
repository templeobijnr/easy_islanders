# 🚕 Taxi Dispatch System - Quick Start Guide

## What's New

You now have **15 taxi listings** spread across all major cities in North Cyprus, all configured to use your WhatsApp number (`+905488639394`) for testing.

### Key Features:

1. **Smart Location Matching** - The system intelligently selects taxis based on:
   - Exact location match (e.g., "Kyrenia Marina" → selects marina taxi)
   - City match (e.g., "Nicosia" → selects Nicosia taxis)
   - Area keywords (Girne, Lefkoşa, etc.)
   - Vehicle quality (SUV/Minivan get slight boost)
   - Driver rating (higher rated = priority)
   - Random load distribution

2. **Rich Taxi Details** - Each taxi has:
   - Company name
   - Vehicle model, color, plate number
   - Capacity (4-8 passengers)
   - Rating (4.4-4.9 stars)
   - Amenities (AC, WiFi, GPS, etc.)
   - Service area

3. **Complete Tracking** - Every booking stores:
   - Customer details
   - Pickup/destination with GPS
   - Full taxi information
   - Status updates from driver

---

## 🚀 Setup & Testing

### Step 1: Seed the Database

Run the master seeding script to populate ALL data (taxis + markets + services):

```bash
cd functions

# With Firestore Emulator
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" \
GCLOUD_PROJECT="easy-islanders" \
TEST_VENDOR_PHONE="whatsapp:+905488639394" \
npx ts-node -r esbuild-register src/scripts/seedCityOS.ts
```

**Or** just seed taxis:

```bash
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" \
GCLOUD_PROJECT="easy-islanders" \
npx ts-node -r esbuild-register src/scripts/seedTaxiListings.ts
```

Expected output:
```
🚕 Starting Taxi Listings Seeding...
📱 All taxis configured with: whatsapp:+905488639394

✅ Created: Girne Express Taxi
   📍 Location: Kyrenia Center (Kyrenia)
   🚗 Vehicle: White Toyota Corolla (GNE-001)
   💰 Base rate: 50 TRY
   ⭐ Rating: 4.8/5

... (15 taxis total)

✅ ✅ ✅ Taxi Seeding Complete!

📊 Summary:
   Total Taxis: 15
   - Kyrenia: 6 taxis
   - Nicosia: 3 taxis
   - Famagusta: 2 taxis
   - Iskele: 2 taxis
```

### Step 2: Verify in Firestore

Check that listings were created:
```
Firestore Console → listings collection

Filter: domain == "Cars" AND type == "taxi"
Expected: 15 documents
```

### Step 3: Test Smart Dispatch

Open your app and test these scenarios:

#### Test 1: Kyrenia Pickup (Should select Kyrenia taxi)
```
User: "I need a taxi from Kyrenia Marina to Bellapais"
```

**Expected:**
- AI calls `dispatchTaxi` tool
- System selects "Kyrenia Premium Taxi" or "Girne Express Taxi" (high score for Kyrenia location)
- Creates booking in `taxiBookings` collection
- Sends WhatsApp to +905488639394:
  ```
  🚖 New Taxi Booking Request

  👤 Customer: John Doe
  📱 Contact: +905331234567

  📍 PICKUP LOCATION:
  Kyrenia Marina
  📲 TAP TO NAVIGATE:
  https://www.google.com/maps/dir/?api=1&destination=35.34,33.32

  🎯 DESTINATION:
  Bellapais
  ```

**AI Response:**
```
✅ Taxi dispatched!
Service: Kyrenia Premium Taxi
Vehicle: Black Mercedes GLC
Plate: KYR-777
Rating: ⭐ 4.9

The driver will contact you shortly.
```

#### Test 2: Nicosia Pickup (Should select Nicosia taxi)
```
User: "Get me a taxi from NEU to Lefkoşa center"
```

**Expected:**
- System selects "University Taxi Service" (exact match for NEU)
- AI shows vehicle details in response

#### Test 3: Generic Request (Should work anywhere)
```
User: "I need a taxi to the airport"
```

**Expected:**
- System selects any available taxi (probably Nicosia Airport Transfer due to high rating)
- Still works even without specific location

---

## 🔍 How Smart Selection Works

The system scores each taxi based on:

| Criteria | Points | Example |
|----------|--------|---------|
| **Exact location match** | +100 | "Kyrenia Marina" pickup → "Kyrenia Marina" taxi location |
| **City match** | +50 | "Nicosia" in pickup → taxi.city == "Nicosia" |
| **Area keywords** | +30 | "Girne" → matches "Kyrenia" |
| **Premium vehicle** | +5 | SUV or Minivan |
| **Driver rating** | +2 to +10 | rating * 2 (4.5★ = 9 points) |
| **Random distribution** | +0 to +10 | Load balancing |

### Example Scoring:

**Scenario:** User says "I need a taxi from Kyrenia Marina"

```
Kyrenia Premium Taxi (location: "Kyrenia Marina")
  ✓ Exact location match: +100
  ✓ City match (Kyrenia): +50
  ✓ Area keyword (Kyrenia): +30
  ✓ Premium vehicle (SUV): +5
  ✓ Rating (4.9): +9.8
  ✓ Random: +7.2
  = TOTAL: 202.0 points ⭐ SELECTED!

Girne Express Taxi (location: "Kyrenia Center")
  ✗ No exact location match: +0
  ✓ City match (Kyrenia): +50
  ✓ Area keyword (Girne): +30
  ✓ Standard vehicle: +0
  ✓ Rating (4.8): +9.6
  ✓ Random: +3.5
  = TOTAL: 93.1 points

Lefkoşa City Taxi (location: "Lefkoşa Center")
  ✗ No location match: +0
  ✗ No city match: +0
  ✗ No area keyword: +0
  ✓ Standard vehicle: +0
  ✓ Rating (4.5): +9.0
  ✓ Random: +5.3
  = TOTAL: 14.3 points
```

Result: **Kyrenia Premium Taxi wins!** 🎯

---

## 📊 Taxi Coverage Map

### Kyrenia (6 taxis)
- **Girne Express Taxi** - Kyrenia Center - Standard sedan
- **Kyrenia Premium Taxi** - Kyrenia Marina - Luxury SUV ⭐
- **Bellapais Taxi Service** - Bellapais - Local expert
- **Lapta Taxi Co.** - Lapta - Family minivan
- **Alsancak Taxi** - Alsancak - Affordable
- **Çatalköy Taxi Service** - Çatalköy - 24/7

### Nicosia (3 taxis)
- **Lefkoşa City Taxi** - City Center - Metered service
- **University Taxi Service** - NEU Campus - Student friendly
- **Nicosia Airport Transfer** - Ercan Airport - Premium minivan ⭐

### Famagusta (2 taxis)
- **Magusa Express Taxi** - City Center - Fast service
- **EMU Campus Taxi** - EMU Campus - Student rates

### Iskele (2 taxis)
- **Iskele Beach Taxi** - Long Beach - Beach transfers
- **Bafra Taxi Service** - Bafra Hotels - Luxury sedan ⭐

### Special Services:
- ✈️ **Airport Specialist**: Nicosia Airport Transfer (fixed rates, meet & greet)
- 🏖️ **Beach Specialist**: Iskele Beach Taxi (luggage space)
- 🎓 **Student Friendly**: University Taxi, EMU Campus Taxi (discounted)
- 👔 **Premium**: Kyrenia Premium, Nicosia Airport, Bafra (luxury vehicles)

---

## 🧪 Complete Test Scenarios

### Scenario 1: Marina to Restaurant (Local Trip)
```
User: "Book me a taxi from Kyrenia Marina to Set Fish Restaurant"

Expected Flow:
1. AI calls dispatchTaxi
2. System scores all taxis
3. Selects "Kyrenia Premium Taxi" (Marina location match)
4. Creates booking with GPS coordinates
5. Sends WhatsApp to +905488639394
6. User receives: "Taxi dispatched! Black Mercedes GLC (KYR-777)"

You (as driver) reply via WhatsApp:
"OK, 5 minutes"

System:
- Updates booking status to 'confirmed'
- Sends WhatsApp to user: "Taxi confirmed! Driver says: 'OK, 5 minutes'"
- Injects system message into chat

User asks: "Where's my taxi?"
AI: "Your taxi is confirmed! The driver (Kyrenia Premium Taxi - Black Mercedes GLC) confirmed 2 minutes ago. They said '5 minutes'."
```

### Scenario 2: Airport Transfer (Cross-City)
```
User: "I need airport pickup tomorrow at 8am from Bafra Hotel"

Expected Flow:
1. AI calls dispatchTaxi with pickupTime
2. System selects "Nicosia Airport Transfer" (airport specialist)
3. WhatsApp sent with pickup details
4. User gets: "Taxi dispatched! Mercedes Vito minivan, perfect for luggage."
```

### Scenario 3: University Student (Budget)
```
User: "Cheapest taxi from NEU to Famagusta old town"

Expected Flow:
1. AI calls dispatchTaxi
2. System selects "University Taxi Service" (NEU + affordable)
3. User gets: "Taxi dispatched! Student-friendly rates. VW Polo."
```

---

## 🔧 Troubleshooting

### Issue: AI selects wrong taxi (e.g., Nicosia taxi for Kyrenia pickup)

**Check:**
1. Is pickup location string clear? "Kyrenia" vs "in Kyrenia" vs "Kyrenia Marina"
2. Check console logs for scoring:
   ```
   🚕 [DispatchTaxi] Selected: Girne Express Taxi (Score: 123.4)
      📍 Taxi location: Kyrenia Center
      📍 Pickup location: kyrenia marina
   ```

3. Verify taxi has correct `location` and `city` fields in Firestore

### Issue: No taxis available

**Verify:**
```javascript
// Firestore query
listings
  .where('domain', '==', 'Cars')
  .where('type', '==', 'taxi')
  .where('isActive', '==', true)

// Should return 15 documents
```

### Issue: WhatsApp not received

**Check:**
1. Twilio credentials in `.env`
2. Taxi listing has `agentPhone: "whatsapp:+905488639394"`
3. Webhook logs: `firebase functions:log --only dispatchTaxi`

---

## 📈 Next Enhancements

Once V1 is tested, consider:

1. **Real-time Driver Tracking**
   - GPS updates every 30 seconds
   - Live ETA calculation
   - Map view in chat

2. **Dynamic Pricing**
   - Distance-based quotes
   - Surge pricing during peak hours
   - Discount codes

3. **Driver Availability**
   - Mark drivers as "busy" when accepting job
   - Queue system for multiple requests
   - Shift schedules

4. **Multi-Driver Broadcast**
   - Send to 3 drivers simultaneously
   - First to accept gets the job
   - Others auto-notified

5. **User Preferences**
   - Favorite drivers
   - Preferred vehicle types
   - Saved locations

---

## ✅ Summary

You now have:
- ✅ 15 taxis seeded across 4 cities
- ✅ Smart location-based selection
- ✅ Rich vehicle details
- ✅ Bi-directional WhatsApp sync
- ✅ Complete booking tracking
- ✅ All using +905488639394 for testing

**Next:** Run the seeding script and test it out! 🚀

```bash
npx ts-node -r esbuild-register src/scripts/seedCityOS.ts
```
