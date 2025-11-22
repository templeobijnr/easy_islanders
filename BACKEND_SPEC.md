
# Backend Specification: Easy Islanders

## 1. Application Overview
**Easy Islanders** is an AI-led marketplace for island experiences (North Cyprus). It combines a traditional listing marketplace (Real Estate, Cars, Events) with an AI Concierge, a Social Network ("Connect"), and a Business Administration dashboard.

**Current Architecture:**
- **Frontend:** React + TypeScript (Single Page Application).
- **Current Data Source:** Direct Firebase Firestore calls + LocalStorage mock data.
- **AI:** Google Gemini API (Client-side integration).

**Backend Goal:**
Replace direct Firebase/Mock calls with a structured RESTful API (or GraphQL) to handle data persistence, authentication, business logic, and AI proxying.

---

## 2. Authentication & User Context
All protected endpoints must require a Bearer Token (JWT).

### Endpoints
- `POST /api/auth/login` - Authenticate user. Returns JWT + User Object.
- `POST /api/auth/signup` - Create new user (Personal or Business).
- `GET /api/auth/me` - Get current user profile, settings, and notifications.
- `PUT /api/users/{id}/profile` - Update profile, interests, and bio.

### Data Model: User
```json
{
  "id": "string (UUID)",
  "email": "string",
  "type": "personal | business",
  "rank": "Explorer | Islander | Local Legend",
  "trustScore": "number (0-100)",
  "businessName": "string (optional)",
  "profile": {
    "passportStamps": "Array<Stamp>",
    "interests": ["Hiking", "Crypto", "Dining"]
  }
}
```

---

## 3. View: Home (Hero & Agent Chat)
**Route:** `/`
**Purpose:** Landing page and primary AI interaction point.

### Data Requirements
1.  **User History:** The AI needs context on previous bookings to provide relevant suggestions.
2.  **Featured Items:** "Featured Stays" and "Lifestyle Highlights" sections.

### Endpoints
- `POST /api/chat/message`
    - **Input:** `{ message: string, context: { location, userId } }`
    - **Output:** AI Text Response + Structured `recommendations` array.
    - **Note:** Backend should wrap Gemini API calls here to secure the API Key.
- `GET /api/listings/featured`
    - **Output:** Array of `UnifiedItem` (High rating listings).

### Navigation Links
- **"Choose Your Agent"**: Scrolls to `#agent` section.
- **"Explore Marketplace"**: Navigates to `Explore` view.
- **"View All Experiences"**: Navigates to `Explore` view with `domain=Events` filter.

---

## 4. View: Explore (Marketplace)
**Route:** `/explore`
**Purpose:** Search and filter all listing types (Real Estate, Cars, Services, etc.).

### Data Requirements
The page relies heavily on filtering a unified dataset of items.

### Endpoints
- `GET /api/listings`
    - **Query Params:**
        - `domain`: "Real Estate", "Cars", "Services", etc.
        - `minPrice`, `maxPrice`: number.
        - `location`: string (District).
        - `type`: "sale", "rental".
        - `category`: "Villa", "Apartment".
    - **Response:** Array of `UnifiedItem`.

### Data Model: UnifiedItem
A polymorphic object representing any sellable item.
```json
{
  "id": "string",
  "domain": "Real Estate | Cars | ...",
  "title": "string",
  "price": "number",
  "location": "string",
  "imageUrl": "string",
  "rating": "number",
  "agentPhone": "string",
  "metadata": {
    // Dynamic fields based on domain
    "bedrooms": 3, // Real Estate
    "transmission": "Automatic", // Cars
    "date": "ISO-Date" // Events
  }
}
```

### Navigation Links
- **Listing Card Click**: Opens `BookingModal` or `ProductDetailModal` (Overlay).

---

## 5. View: Connect (Social Feed)
**Route:** `/connect`
**Purpose:** Social network for users to post updates, check into locations, and join groups.

### Data Requirements
1.  **Social Feed:** A mixed feed of user statuses, reviews, and plans.
2.  **Hot Zones:** Live activity map/bar showing busy locations.
3.  **Groups:** Communities user can join.
4.  **Passport:** User's gamified travel log.

### Endpoints
- `GET /api/social/feed`
    - **Params:** `interest` (filter by tag).
    - **Response:** Array of `SocialPost` (includes Author object).
- `POST /api/social/feed`
    - **Payload:** `{ content, type: 'status'|'plan'|'review', location, imageUrl }`.
- `POST /api/social/posts/{id}/like`: Vouch/Like a post.
- `GET /api/social/zones`
    - **Response:** List of `HotZone` (Location, activeUserCount, isTrending).
- `GET /api/social/groups`
    - **Response:** List of groups + `isMember` boolean for current user.

### Navigation Links
- **"View Full Map"**: Toggles `IslandMap` component.
- **"Join Group"**: Updates local user state and sends backend request.

---

## 6. View: Requests (Consumer)
**Route:** `/requests`
**Purpose:** Users post custom requests ("I need a vintage Mustang") for businesses to fulfill.

### Endpoints
- `GET /api/requests/me`: Get current user's active requests.
- `POST /api/requests`: Create new request `{ content, budget, domain }`.

---

## 7. View: Promotions
**Route:** `/promotions`
**Purpose:** Feed of discounted items (`isBoosted: true`).

### Endpoints
- `GET /api/listings/promotions`: Returns listings where `isBoosted = true`.
- `GET /api/users/subscriptions`: Returns categories user has subscribed to for alerts.
- `PUT /api/users/subscriptions`: Toggle alerts for specific domains.

---

## 8. View: Business Dashboard
**Route:** `/dashboard`
**Access:** Restricted to `user.type === 'business'`.

### Overview Module
- `GET /api/business/stats`: Returns `revenue`, `activeBookings`, `views`, `leads`.

### Listings Module
- `GET /api/business/listings`: Get inventory owned by this business.
- `POST /api/business/listings`: Create new listing.
- `PUT /api/business/listings/{id}`: Update stock, price, or details.
- `DELETE /api/business/listings/{id}`: Remove listing.

### CRM Module
- `GET /api/business/clients`: List of users who have booked or messaged.
- `POST /api/business/clients/import`: Bulk CSV upload endpoint.
- `PUT /api/business/clients/{id}`: Update status (Pipeline stage: New -> Negotiation -> Closed).

### Orders/Bookings Module
- `GET /api/business/orders`: List bookings/orders.
- `PUT /api/business/orders/{id}/status`: Update status (e.g., 'Cooking' -> 'Ready', 'Pending' -> 'Confirmed').

### Marketing Module
- `POST /api/business/broadcast`: Send push/email notification to previous customers.

### Navigation Links
- **"Exit to App"**: Returns to Consumer Home.
- **Sidebar**: Switches internal dashboard modules (Overview, Listings, CRM, etc.).

---

## 9. View: Control Tower (Super Admin)
**Route:** `/admin`
**Access:** Restricted to `user.role === 'admin'`.

### Data Requirements
"God mode" view of the entire platform.

### Endpoints
- `GET /api/admin/system-health`: Server latency, DB status.
- `GET /api/admin/live-activity`: Real-time feed of logins/bookings (WebSocket stream preferred).
- `GET /api/admin/financials`: Global revenue platform-wide.
- `POST /api/admin/maintenance`: Toggle system maintenance mode.

---

## 10. Booking & Payments Logic
**Component:** `BookingModal.tsx`

**Flow:**
1.  User selects item -> "Book Now".
2.  **Checkout:** User enters details + Upsells.
3.  **Payment:**
    - `POST /api/bookings/initiate`: Creates a pending booking ID.
    - `POST /api/payments/process`: Handles Credit Card (Stripe) or Crypto mock.
    - **On Success:** Backend updates Booking status to `confirmed`, sends Email/WhatsApp receipt.

---

## 11. AI Tool Integrations (Backend)
The frontend `AgentChat` uses specific tool definitions. The backend must support the logic for these if moving AI server-side.

| Tool Name | Backend Logic Needed |
| :--- | :--- |
| `searchMarketplace` | Maps to `GET /api/listings` with complex filter queries. |
| `consultEncyclopedia` | specific static data lookup (local laws, visas). |
| `getRealTimeInfo` | Integrates with 3rd party APIs (OpenWeather, Currency Layer). |
| `initiateBooking` | Maps to `POST /api/bookings/initiate`. |
| `createConsumerRequest` | Maps to `POST /api/requests`. |
| `dispatchTaxi` | Creates a booking with `domain: 'Cars'` and `type: 'taxi'`. |

---

## 12. Database Schema Suggestions (NoSQL/Firestore Style)

*   **Users**: Profile, Auth, Roles.
*   **Listings**: The core product catalog (polymorphic).
*   **Bookings**: Transaction records linking `User` and `Listing`.
*   **SocialPosts**: User generated content.
*   **SocialGroups**: Communities.
*   **Clients**: Business-specific view of Users (CRM data).
*   **Conversations**: Chat logs between Users and Businesses.
*   **Requests**: Unfulfilled consumer demands.
