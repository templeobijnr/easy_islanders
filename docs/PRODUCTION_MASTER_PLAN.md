# Easy Islanders: Production Master Plan

## 1. Mission Statement
To transition "Easy Islanders" from a high-fidelity React prototype into a secure, scalable, and production-ready AI marketplace for North Cyprus. The system must handle real-time geospatial data, complex polymorphic listings, and secure AI agent interactions.

---

## 2. Current State Analysis (The "As-Is")
*   **Frontend:** robust React + TypeScript SPA. High-quality UI components (`ControlTower`, `AgentChat`, `Explore`).
*   **Data:** Currently relies on `localStorage` mocks and direct client-side logic.
*   **AI:** Client-side calls to Gemini API (Insecure).
*   **Backend:** Basic Express scaffold (just created).
*   **Infrastructure:** Firebase project initialized.

## 3. The Gap (The "To-Be")
To go live, we must bridge these gaps:
1.  **Security:** Move API keys off the client. Implement RBAC (User vs Business vs Admin).
2.  **Persistence:** Replace mocks with Firestore.
3.  **Search:** Implement fuzzy search (Typesense) as Firestore is too limited.
4.  **Scalability:** Handle "Live Map" updates without melting the DB (Redis buffering).
5.  **Reliability:** Async processing for bookings (Cloud Tasks).

---

## 4. Phased Execution Roadmap

### Phase 1: Foundation & Scaffolding (✅ COMPLETED)
*   [x] Initialize Cloud Functions environment.
*   [x] Set up Express.js application structure.
*   [x] Configure local emulators.

### Phase 2: The Data Layer (🚧 NEXT)
*   **Goal:** A working database with secure access patterns.
*   **Steps:**
    1.  **Schema Implementation:** Define Firestore collections (`listings`, `users`, `bookings`).
    2.  **Security Rules:** Write `firestore.rules` to enforce ownership (Business writes, Public reads).
    3.  **Search Engine:** Deploy Typesense to Cloud Run.
    4.  **Sync Trigger:** Create `onListingWrite` Cloud Function to sync Firestore -> Typesense.

### Phase 3: Authentication & Identity
*   **Goal:** Secure user management with distinct roles.
*   **Steps:**
    1.  **Auth Triggers:** `onUserCreated` function to initialize `user` document and assign default claims.
    2.  **Custom Claims:** Script/Endpoint to promote users to `business` or `admin`.
    3.  **Middleware:** Implement `isAuthenticated` and `isBusiness` middleware in Express.

### Phase 4: Secure AI Architecture
*   **Goal:** Move `geminiService.ts` to the backend.
*   **Steps:**
    1.  **Agent Controller:** Create `POST /api/chat` endpoint.
    2.  **Context Hydration:** Server fetches User Profile + Booking History before calling Gemini.
    3.  **Tool Resolvers:** Re-implement `searchMarketplace`, `initiateBooking` as server-side functions.
    4.  **Chat History:** Persist conversation turns in `conversations/{sessionId}`.

### Phase 5: Business Logic & Payments
*   **Goal:** Real money transactions.
*   **Steps:**
    1.  **Booking State Machine:** Implement the `PENDING -> PAID -> CONFIRMED` flow.
    2.  **Cloud Tasks:** Set up auto-expiry for pending bookings (24h timeout).
    3.  **Stripe Integration:** Implement Payment Intent creation and Webhook handling.

### Phase 6: Social & Geospatial Engine
*   **Goal:** The "Live Vibe" map.
*   **Steps:**
    1.  **Ingestion Endpoint:** Lightweight `POST /api/geo/heartbeat`.
    2.  **Redis Buffer:** Set up Cloud Memorystore (Redis) to buffer writes.
    3.  **Aggregator:** Scheduled function (every 10m) to write to `hotzones` collection.
    4.  **Social Graph:** Implement `posts` and `vouches` sub-collections.

### Phase 7: Launch Prep
*   **Goal:** Production readiness.
*   **Steps:**
    1.  **CI/CD:** GitHub Actions for auto-deploy.
    2.  **Monitoring:** Set up Google Cloud Monitoring alerts.
    3.  **Domain:** Connect custom domain & SSL.
    4.  **Seed Data:** Migration script to populate DB with initial listings.

---

## 5. Technical Strategy Summary
*   **Backend:** Node.js (Express) on Cloud Functions Gen 2.
*   **DB:** Firestore (Primary) + Redis (Geo Buffer).
*   **Search:** Typesense (Self-hosted on Cloud Run).
*   **AI:** Vertex AI Node.js SDK.
*   **Code Sharing:** Monorepo-style sharing of `types.ts`.

## 6. Immediate Next Action
**Execute Phase 2:**
1.  Create `functions/src/repositories/listing.repo.ts`.
2.  Write `firestore.rules`.
3.  Set up the Typesense sync trigger.
