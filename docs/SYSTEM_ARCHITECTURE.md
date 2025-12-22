# Easy Islanders System Architecture

## Overview

Easy Islanders (AskMerve) is a multi-tenant AI-powered concierge platform built on Firebase + React. Users interact with an AI agent (Merve) to discover, book, and manage local services.

---

## 1. Core Entities

### Users
```typescript
interface User {
  id: string;              // Firebase Auth UID
  name: string;
  email: string;
  type: 'personal' | 'business';
  businessId?: string;     // For business owners
  phone?: string;
  settings?: UserSettings;
  profile?: UserProfile;
}

// Custom Claims (JWT token)
interface TokenClaims {
  uid: string;
  email?: string;
  role?: 'user' | 'business' | 'owner' | 'admin';
  businessId?: string;
  admin?: boolean;
}
```

### Listings (UnifiedListing)
Central catalog entity for all discoverable items:
```typescript
interface UnifiedListing {
  id: string;
  type: 'place' | 'activity' | 'event' | 'stay' | 'experience';
  category: string;        // 'restaurants', 'spas_wellness', 'hotels_stays'
  title: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  region: string;
  images: string[];
  displayPrice?: string;
  rating?: number;
  bookingEnabled: boolean;
  bookingOptions?: BookingOptions;
  actions?: Action[];      // 'call', 'book', 'whatsapp', 'navigate'
  approved: boolean;
  showOnMap: boolean;
}
```

### Bookings
```typescript
interface Booking {
  id: string;
  userId: string;
  itemId: string;          // listingId reference
  itemTitle: string;
  domain: MarketplaceDomain;
  status: 'payment_pending' | 'confirmed' | 'cancelled' | ...;
  totalPrice: number;
  date: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  specialRequests?: string;
  whatsappStatus?: 'sending' | 'sent' | 'read' | 'replied';
}
```

### Jobs (Sprint 1 - Order Flow)
```typescript
interface Job {
  id: string;
  ownerUserId: string;     // Creator
  status: 'collecting' | 'confirming' | 'dispatching' | 'completed' | 'cancelled';
  merchantTarget: MerchantTarget;
  items: JobItem[];
  summary?: JobSummary;
  jobCode: string;         // 6-char unique code
  createdAt: Timestamp;
  confirmedAt?: Timestamp;
  dispatchedAt?: Timestamp;
}
```

### Businesses (Multi-tenant)
```typescript
interface Business {
  id: string;
  ownerId: string;
  name: string;
  config: BusinessConfig;
  // ... Tenant data (Functions-only access)
}
```

---

## 2. Firestore Collections

### Public Read Collections
| Collection | Purpose | Write Access |
|------------|---------|--------------|
| `listings` | Unified catalog (Discover, Map, Agent) | Admin only |
| `places` | POIs (restaurants, beaches, etc.) | Admin only |
| `activities` | Bookable activities | Admin only |
| `events` | Time-bound events | Admin only |
| `stays` | Hotels/accommodations | Admin only |
| `experiences` | Tours/workshops | Admin only |

### User-Owned Collections
| Collection | Purpose | Access |
|------------|---------|--------|
| `users/{userId}` | User profile | Owner only |
| `bookings` | User bookings | Owner + Admin |
| `notifications` | User notifications | Owner only |
| `itineraries` | Travel itineraries | Owner only |
| `chatSessions/{sessionId}/messages` | Chat history | Session owner |
| `jobs` | Order jobs | Owner only |

### Functions-Only Collections (Tenant Data)
| Collection | Purpose |
|------------|---------|
| `businesses` | Tenant business data |
| `business_configs` | Tenant configuration |
| `business_chat_sessions` | B2B chat |
| `business_bookings` | B2B bookings |
| `clients` | CRM data |
| `requests` | Service requests |

---

## 3. API Architecture

### Express Applications
```
┌─────────────────────────────────────────────────────────┐
│ Firebase Functions                                       │
├─────────────────────────────────────────────────────────┤
│ api (legacy)      → app.ts         → /chat, /search     │
│ apiV1             → api/app.ts     → /v1/owner, /claim  │
│ jobsApi           → http/api.ts    → /v1/jobs, /admin   │
│ googlePlacesProxy → Standalone     → Google Places      │
│ twilioWebhook     → Standalone     → WhatsApp incoming  │
│ claimAdmin        → Standalone     → Admin role claim   │
└─────────────────────────────────────────────────────────┘
```

### V1 Jobs API Endpoints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/v1/jobs` | Create job (status: collecting) | Bearer token |
| POST | `/v1/jobs/:id/confirm` | Confirm order | Owner only |
| POST | `/v1/jobs/:id/dispatch` | Send to merchant via WhatsApp | Owner only |
| GET | `/v1/jobs/:id` | Get job details | Owner only |

### V1 Multi-Tenant Endpoints
| Route | Description |
|-------|-------------|
| `/v1/admin/*` | Admin operations |
| `/v1/claim/*` | Business claiming |
| `/v1/owner/*` | Business owner dashboard |
| `/v1/public-chat/*` | Public AI chat |
| `/v1/merchant/*` | Merchant operations |

### Legacy API Endpoints
The main `app.ts` exposes routes for:
- `/chat` - AI chat handler
- `/search` - Marketplace search
- `/listings` - Listing CRUD
- `/bookings` - Booking operations

---

## 4. Auth & Token Flow

### Authentication Flow
```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Frontend   │───▶│  Firebase Auth  │───▶│ ID Token (JWT)   │
│   (React)    │    │   (Google/Email)│    │ + Custom Claims  │
└──────────────┘    └─────────────────┘    └──────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│ Token Claims                                                  │
│ {                                                             │
│   uid: "abc123",                                              │
│   email: "user@example.com",                                  │
│   role: "user" | "business" | "owner" | "admin",              │
│   businessId: "biz456",                                       │
│   admin: true | false                                         │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘
```

### Backend Middleware
```typescript
// functions/src/middleware/auth.ts
const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  req.user = {
    uid: decodedToken.uid,
    email: decodedToken.email,
    role: decodedToken.role || 'user',
    businessId: decodedToken.businessId
  };
  next();
};
```

### Frontend API Client
```typescript
// src/services/v1Api.ts
async function fetchWithAuth<T>(
  firebaseUser: FirebaseUser,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await firebaseUser.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  
  const response = await fetch(v1Url(path), { ...init, headers });
  return response.json();
}
```

---

## 5. Data Flow Diagrams

### User → AI Chat → Tool Execution
```
┌────────────┐     ┌───────────────┐     ┌──────────────────┐
│  Frontend  │────▶│ /chat endpoint│────▶│   Gemini AI      │
│  (React)   │     │  (Express)    │     │  (function call) │
└────────────┘     └───────────────┘     └──────────────────┘
      │                                           │
      │                                           ▼
      │                                  ┌──────────────────┐
      │                                  │  Tool Resolvers  │
      │                                  │ - searchMarket   │
      │                                  │ - createBooking  │
      │                                  │ - sendWhatsApp   │
      │                                  └──────────────────┘
      │                                           │
      ▼                                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Firestore                               │
│  [listings] [bookings] [chatSessions] [jobs]                 │
└─────────────────────────────────────────────────────────────┘
```

### Job Order Flow
```
User                    Frontend                 Backend                 Merchant
 │                         │                        │                       │
 │───Create Job────────────▶────POST /v1/jobs──────▶│                       │
 │                         │                        │──(status: collecting) │
 │───Add Items─────────────▶────Firestore Write────▶│                       │
 │                         │                        │                       │
 │───Confirm Order─────────▶────POST /jobs/confirm─▶│                       │
 │                         │                        │──(status: confirming) │
 │                         │                        │                       │
 │                         │                        │───POST /jobs/dispatch─▶
 │                         │                        │      (WhatsApp)       │
 │                         │                        │──(status: dispatching)│
```

---

## 6. Error Handling

### Standard API Response Format
```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: {
    code: 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | ...,
    message: 'Human-readable error message'
  }
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No token / invalid token |
| `FORBIDDEN` | 403 | Valid token, insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 7. Security Layer

### Firestore Rules Summary
- **Default deny**: All paths blocked unless explicitly allowed
- **User data**: Owner-only access with frozen ownership fields
- **Tenant data**: Functions-only (no client access to `businesses/*`)
- **Public catalog**: Read-only for listings, places, events

### Storage Rules
- Auth required for all writes
- Size limits: 10-20MB
- Content type validation: images, PDFs, text

---

## 8. File Structure Overview

```
functions/src/
├── api/                    # V1 multi-tenant API
│   ├── app.ts              # Express app builder
│   ├── routes/             # Route modules
│   └── controllers/        # API handlers
├── http/
│   └── v1/                 # Jobs API
│       ├── jobs/           # /v1/jobs endpoints
│       ├── admin/          # Admin endpoints
│       └── merchant/       # Merchant endpoints
├── controllers/            # Legacy controllers
├── services/               # Business logic
├── middleware/             # Auth, rate limiting
├── triggers/               # Firestore/Auth triggers
└── index.ts                # Function exports

src/
├── components/             # React components
├── services/               # API clients
│   └── v1Api.ts            # Authenticated fetch
├── types/                  # TypeScript types
├── pages/                  # Route pages
└── contexts/               # React contexts
```
