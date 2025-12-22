

AskMerve Master Architecture & Roadmap

Version: v1.0 (Living Document)
Owner: Lead System Architect (AskMerve Core Team)
Stack: Firebase Functions v2, Firestore, WhatsApp (Twilio/Meta), Web (Vite/React), Mobile (Expo), LLM (Gemini)
Market: North Cyprus (V1) → Similar island/service-heavy markets → API Platform

⸻

0) Purpose

This document is the single source of truth for:
	•	What AskMerve is building (product + infrastructure)
	•	Non-negotiable trust and operability guarantees
	•	The authoritative execution model (Jobs, state machine, dispatch)
	•	The strict build sequence (foundation → execution → channels → scale)
	•	Current implementation status
	•	Acceptance tests and definition of done per phase

Rule:
Any new feature must:
	1.	Map to a core execution primitive or system pillar
	2.	Preserve trust, operability, and evolvability guarantees

⸻

## Software Architecture Components (Required View)

This section re-states the architecture using the standard “components of software architecture” checklist, while keeping the detailed spec/roadmap sections below unchanged.

### Goals and philosophy of the system
- **Goal:** Provide a reliable, auditable execution layer for AI-driven real-world actions in a local-services marketplace.
- **Who uses it:** (1) end users requesting actions (web/mobile/WhatsApp), (2) merchants fulfilling actions (WhatsApp and/or `/m` webview), (3) ops/admin for monitoring and intervention.
- **Problem solved:** Turn messy natural-language requests into **backend-authoritative** jobs that can be safely dispatched to merchants without hallucinated commitments.
- **Philosophy:** “Model suggests; backend decides.” Trust and operability are treated as first-class product requirements.
- **Product pillars (functional slices):** AskMerve Chat (action agent), Discover (location-first exploration), Connect (feed → CTAs), WhatsApp (full channel parity).

### Architectural assumptions and dependencies
- **Execution environment:** Firebase (Cloud Functions v2 + Firestore + Auth + Hosting); region currently `europe-west1`.
- **Channels:** Web (Vite/React), Mobile (Expo), WhatsApp via Twilio/Meta.
- **LLM:** Gemini (used for intent/tooling; never authoritative for state).
- **Operational tooling:** Structured logging (trace IDs), Sentry (errors), analytics (funnel).
- **Trust boundary assumption:** Clients and merchants are untrusted; merchants do not write to Firestore; only backend updates job status/timestamps.
- **Dependency assumptions:** Twilio/WhatsApp delivery is “at-least-once”; therefore inbound/outbound messaging and dispatch must be idempotent and retry-safe.

### Architecturally significant requirements
- **No hallucinated commitments:** Only backend status transitions count as “real.”
- **Explicit confirmation gate:** User must confirm before any dispatch.
- **Server-authoritative state machine:** State transitions are validated and enforced centrally.
- **Concurrency/idempotency:** One job → one dispatch; critical operations are idempotent and retry-safe.
- **Auditability & operability:** Every critical change is logged; humans can inspect, retry, and override.
- **Multi-market readiness:** Market-scoped operations require an explicit `MarketContext` (hardcoded market IDs forbidden).
- **Tier-0 production safety contract:** Secrets management, maintenance mode, recursion limits, query budgets, and other “must never regress” invariants.

### Packaging instructions for subsystems and components
- **Backend API:** Firebase Cloud Functions code under `functions/`; HTTP APIs are served via functions and routed from Hosting rewrites (e.g., `/v1/** → apiV1`).
- **Data + security:** Firestore rules and indexes are deployed from `firestore.rules` and `firestore.indexes.json`; Storage rules from `storage.rules`.
- **Web client:** Vite/React built into `dist/` and deployed to Firebase Hosting; SPA routing uses `** → /index.html`.
- **Mobile client:** Expo app under `apps/mobile/` (EAS build/deploy as needed); uses the same backend APIs/contracts.
- **WhatsApp channel:** Inbound webhooks terminate at backend endpoints/functions; outbound messages sent via Twilio; merchant webview links (`/m?...`) are generated server-side for listed merchants.
- **Shared contracts:** Schemas and types live in `packages/shared/` and are consumed by backend + clients to keep request/response and job shapes consistent.

### Critical subsystems and layers
- **Channel layer (clients):** Web, Mobile, WhatsApp adapters that collect user input and display authoritative status.
- **API ingress layer:** Authn/authz, request validation, tracing, maintenance mode, and error handling.
- **Orchestration layer (core):** Job schema + state machine + invariants; confirmation gate; dispatch loop; deadlock/timeout handling.
- **Merchant dispatch layer:** Merchant target resolution (`listing` vs `unlisted`), message formatting, reply parsing, accept/decline handling.
- **Data layer:** Firestore collections (`jobs`, `conversations`, `listings`, `merchantTokens`) + locked-down rules.
- **Ops/safety layer:** Idempotency guard, recursion limiter, circuit breaker, secret injection, deletion guard, query budget, read model.

### References to architecturally significant design elements
- **Execution primitive:** `jobs/{jobId}` document + server-authoritative status transitions (see “Execution Primitive: Job Lifecycle” below).
- **Merchant targeting:** `merchantTarget` union and resolution rules (see “Merchant Target Model (Critical)”).
- **MarketContext:** `packages/shared/src/schemas/market.schema.ts` and required `marketId` in tool/API contexts (see “MarketContext (Multi-Market Support)”).
- **Tier-0 guardrails:** middleware and utils referenced in “Production Safety Contract (Tier 0)” and “Tier 0 Execution Status”.

### Critical system interfaces
- **Public HTTP API (v1):** `POST /v1/jobs`, `POST /v1/jobs/:id/confirm`, `POST /v1/jobs/:id/dispatch`, `GET /v1/jobs/:id` (auth required; validation via shared schemas; idempotency where specified).
- **WhatsApp integration:** outbound send via Twilio; inbound reply parsing endpoints/hooks; merchant confirmation is applied only by backend.
- **Merchant webview (`/m`):** tokenized access for listed merchants; session issuance backed by `merchantTokens` (hash stored).
- **Firestore security boundary:** rules enforce tenant/owner access; clients cannot write job status; merchants have no direct DB access.
- **Ops control plane:** `system/config` maintenance kill-switch; admin-only manual override endpoints/tools.

### Key scenarios that describe critical behavior of the system
- **Create → confirm → dispatch (listed merchant):** user drafts job → confirms → backend resolves listing target → sends WhatsApp with `/m` link → merchant accepts/declines → backend updates job → user notified.
- **Create → confirm → dispatch (unlisted merchant):** user confirms → backend sends WhatsApp directly to phone → merchant replies YES/NO → backend parses reply → job becomes terminal.
- **Discover → CTA → job draft:** browsing listings produces structured context → creates a job draft → still requires explicit confirmation.
- **Idempotent retries:** duplicate client requests or webhook re-deliveries do not cause double dispatch or double confirmation.
- **Safety interventions:** maintenance mode returns 503 before processing; deadlocked jobs auto-release to review; circuit breaker sheds load on elevated 5xx.

### Where to find the detailed spec below
- **Product pillars:** “Product Definition (What ‘Done’ Means)”
- **System guarantees:** “Non-Negotiable System Guarantees” + “Production Safety Contract (Tier 0)”
- **Data model:** “Authoritative Data Model (V1)”
- **State machine:** “Execution Primitive: Job Lifecycle”
- **Dispatch flows:** “Canonical Execution Flows”
- **Packaging/deployment reality:** `firebase.json` + “Tier 0 Execution Status”
- **Delivery plan:** “Roadmap & Definition of Done”

⸻

1) Product Definition (What “Done” Means)

1.1 Core Pillars

Pillar A — AskMerve Chat (General Action Agent)
	•	Users ask for real-world actions, not information.
	•	Examples:
	•	“Taxi to Kyrenia harbor”
	•	“Order water to my location”
	•	“Book a spa tomorrow at 2”
	•	AskMerve:
	•	Interprets intent
	•	Collects missing required data
	•	Creates a Job
	•	Requires explicit user confirmation
	•	Never claims completion without backend authority

⸻

Pillar B — Discover (Location-first Exploration)
	•	Users browse nearby places and services.
	•	“Nearest to me” queries are first-class.
	•	Listings act as entry points to jobs, not commitments.
	•	Discovery never commits; it only feeds structured context.

⸻

Pillar C — Connect (Feed + CTAs)
	•	Curated feed of:
	•	Events
	•	Promotions
	•	Services
	•	CTAs (Book / Order / Request) create structured job drafts
	•	CTAs never bypass confirmation or backend validation.

⸻

Channel D — WhatsApp
	•	Users can use AskMerve fully via WhatsApp.
	•	Merchants receive jobs via WhatsApp.
	•	Merchants execute jobs:
	•	Via /m webview (listed)
	•	Via WhatsApp replies (unlisted)

WhatsApp is just another frontend into the same backend.

⸻

2) The Infrastructure Play

AskMerve is building a reliable execution layer for AI-driven local services.

This includes:
	•	A single execution model for all real-world actions (Jobs)
	•	A server-authoritative state machine
	•	Channel-agnostic orchestration (web, mobile, WhatsApp)
	•	Strong operational guardrails so humans can trust the system

This architecture is designed to:
	•	Work in messy real-world markets
	•	Support unlisted merchants
	•	Scale into an API platform later

⸻

3) Non-Negotiable System Guarantees

#	Guarantee	Enforcement
1	No hallucinated commitments	Only backend changes job status
2	Explicit confirmation gate	User must confirm before dispatch
3	Authoritative state > model output	LLM suggests; backend decides
4	Concurrency safe	One job → one dispatch
5	Idempotent & retry-safe	All critical ops are idempotent
6	Auditable	State changes logged + timestamped
7	Merchant isolation	Merchants never write Firestore
8	Operability first	Humans can inspect, retry, override


⸻

4) Build Sequence (Strict Dependencies)

FOUNDATION (Sprint 1)
├── Job schema + action schemas
├── State machine + invariants
├── Firestore rules (locked)
└── Validation + ownership guarantees

EXECUTION (Sprint 2)
├── Dispatch logic
├── MerchantTarget resolution
├── WhatsApp send + reply parsing
└── Merchant accept/decline loop

CHANNELS (Sprint 3)
├── Mobile app (Expo)
├── Near-me queries
├── i18n (EN/TR/RU)
└── Merchant /m webview

SCALE (Post-V1)
├── Ops tooling
├── Market expansion
└── Public API


⸻

5) Authoritative Data Model (V1)

5.1 Core Collections

Jobs (Unified execution model)

jobs/{jobId}

Authoritative truth for:
	•	Action requested
	•	Status
	•	Merchant target
	•	Location
	•	Timestamps

⸻

Conversations

conversations/{conversationId}
conversations/{conversationId}/messages/{messageId}

Messages are derived state, never authoritative.

⸻

Listings (Optional but preferred)

listings/{listingId}

Used for:
	•	Discovery
	•	Listed merchant dispatch
	•	/m webview scope

⸻

Merchant Tokens (Listed merchants only)

merchantTokens/{tokenId}

	•	Stores token hash only
	•	Used to issue short-lived merchant sessions

⸻

5.2 Non-Authoritative Data
	•	LLM reasoning
	•	Suggestions
	•	Chat transcripts
	•	Knowledge/RAG content

⸻

5.3 Domain Separation (LOCKED ARCHITECTURAL DECISION)

The following collections represent **separate bounded contexts** and must NOT be unified:

| Collection | Domain | Purpose |
|:-----------|:-------|:--------|
| `listings` | Places | Restaurants, shops, hotels, service providers |
| `activities` | Activities | Scheduled/recurring sessions (yoga, workshops) |
| `experiences` | Experiences | Bookable tours, guided adventures |
| `events` | Events | One-time gatherings (concerts, festivals) |

**RATIONALE:**
- Each domain has a distinct lifecycle, schema, and ownership model
- Similar code patterns across services ≠ architectural duplication
- Premature unification creates hidden coupling and evolution constraints

**ANTI-PATTERNS (PROHIBITED):**
- Do NOT collapse domains into a single `listings` collection
- Do NOT introduce polymorphic `type` fields to unify domains
- Do NOT create shared base schemas that constrain domain evolution
- Do NOT refactor for "code reuse" without explicit re-architecture approval

**WHEN UNIFICATION MIGHT BE JUSTIFIED (REQUIRES EXPLICIT APPROVAL):**
- Clear business requirement for cross-domain queries
- Demonstrated constraint from current separation
- Cost-benefit analysis showing unification value exceeds coupling risk

Until such approval is granted, treat this separation as **LOCKED**.

⸻

6) Execution Primitive: Job Lifecycle

Job Status State Machine

collecting
  ↓ confirm
confirming
  ↓ dispatch
dispatched
  ↓ accept
confirmed
  ↓ cancel
cancelled

Rules
	•	Clients can only create jobs in collecting
	•	Only backend can:
	•	change status
	•	set timestamps
	•	mark confirmed/cancelled

⸻

7) Merchant Target Model (Critical)

merchantTarget:
  | { type: 'listing'; listingId: string }
  | { type: 'unlisted'; name?: string; phone: string; notes?: string };

Resolution Rules
	•	Jobs may be created without merchantTarget
	•	Jobs must have merchantTarget before dispatch
	•	Listed merchants → /m webview
	•	Unlisted merchants → WhatsApp reply parsing only

⸻

8) Canonical Execution Flows

8.1 Listed Merchant Flow
	1.	User confirms job
	2.	Backend resolves merchantTarget.type='listing'
	3.	WhatsApp message sent with /m?token=...
	4.	Merchant accepts/declines in webview
	5.	Backend updates job
	6.	User notified via system message

⸻

8.2 Unlisted Merchant Flow
	1.	User confirms job
	2.	Backend resolves merchantTarget.type='unlisted'
	3.	WhatsApp sent directly to phone
	4.	Merchant replies:
	•	“yes / tamam / ok” → confirmed
	•	“no / busy” → cancelled
	5.	Backend parses reply and updates job

⸻

9) Operability & Reliability

Invariants
	•	Dispatched job must have merchantTarget
	•	Confirmed job must have exactly one confirmation event
	•	No client-side status writes
	•	Dispatch idempotency enforced

Observability
	•	Structured logs with jobId + traceId
	•	Sentry for errors
	•	Analytics events for funnel tracking

Ops Controls (V1 Minimal)
	•	Resend dispatch
	•	Manual status override (admin only)
	•	Dispatch failure visibility

⸻

10) Roadmap & Definition of Done
### Sprint 1 (Week 1): Foundation 🏃 IN PROGRESS

**Goal:** Monorepo works, JobSchema locked, HTTP v1 skeleton, Firestore rules hardened.

| Deliverable | Status |
|------------|--------|
| `packages/shared` with all schemas | ✅ Complete (67 tests) |
| Zod schemas for 10 actions | ✅ Complete |
| `merchantTarget` union | ✅ Complete |
| `createGoogleMapsLink()` helper | ✅ Complete |
| State machine + transitions | ✅ Complete |
| Unit tests (67 tests) | ✅ Complete |
| Monorepo setup (turbo, pnpm) | ✅ Complete |
| HTTP v1 endpoints | ✅ Complete |
| Firestore rules update | 🔲 Pending |

**HTTP v1 Endpoints Deployed:**
- `POST /v1/jobs` — Create job (idempotent via clientRequestId)
- `POST /v1/jobs/:id/confirm` — User confirms job
- `GET /v1/jobs/:id` — Get job (owner only)

**Middleware Created:**
- `authenticateUser` — Firebase ID token verification
- `validateRequest` — Zod schema validation
- `errorHandler` — Structured errors with traceId

⸻

Phase 2 — Execution Loop (Sprint 2) 🏃 IN PROGRESS

DoD
	•	WhatsApp dispatch works
	•	Listed + unlisted merchants can confirm
	•	User sees authoritative status updates

| Deliverable | Status |
|------------|--------|
| `POST /v1/jobs/:id/dispatch` endpoint | ✅ Complete |
| WhatsApp send via Twilio | ✅ Complete |
| `orderHouseholdSupplies` tool dispatch | ✅ Complete (2025-12-20) |
| Unified vendor model in `listings` | ✅ Complete (2025-12-20) |
| Vendor reply parsing (YES/NO) | 🔲 Pending |
| Listed merchant /m webview | 🔲 Pending |

**Completed Work (2025-12-20):**
- Added `order_supplies` action type to `MerveActionType` enum
- Added `vendor` place type to Catalog Manager UI
- Water, gas, grocery vendors are now managed via Catalog Manager like all other listings
- `orderHouseholdSupplies` tool queries `listings` collection (not deprecated `serviceProviders`)
- Eliminates technical debt from dual collection model

⸻

Phase 3 — Mobile + Near-Me (Sprint 3)

DoD
	•	Expo app primary
	•	Near-me works reliably
	•	EN/TR/RU shipped
	•	80%+ job completion in beta

⸻

11) What We Explicitly Do NOT Build (V1)
	•	Payments
	•	POS integrations
	•	Complex inventory systems
	

⸻

12) Design Priorities (Explicit)

Operability

Humans must be able to:
	•	Understand what happened
	•	Fix failures
	•	Retry safely

Simplicity
	•	Few primitives
	•	One execution model
	•	Clear ownership

Evolvability
	•	New actions fit into Job model
	•	New channels reuse backend
	•	New markets don’t fork logic

⸻

13) Immediate Next Step

Finalize and ship JobSchema in packages/shared.

Everything else depends on it:
	•	Endpoints
	•	Firestore rules
	•	Tests
	•	UI contracts

⸻

14) MarketContext (Multi-Market Support)

### 14.1 Background (ARCH-01 Remediation)

**Problem:** 24 hardcoded `cityId = 'north-cyprus'` instances across 14 files block market expansion.

**Decision Date:** 2025-12-20

**Why Now:** Tier-1 production risk. System cannot scale without code fork.

### 14.2 MarketContext Invariants (NEW)

1. **MarketContext is Required:** Every request that touches market-scoped data MUST have a resolved `MarketContext`.
2. **Single Resolution Point:** MarketContext is resolved ONCE per request at the API boundary and propagated to all layers.
3. **Fail-Fast:** If MarketContext is missing or ambiguous, the request MUST fail with a descriptive error.
4. **No Inline Defaults:** Hardcoded market IDs (`'north-cyprus'`) are FORBIDDEN in business logic. Default markets must come from configuration, not code.
5. **Compile-Time Enforcement:** Tools and services must require `MarketContext` as a parameter. Omission must be a TypeScript error.

### 14.3 Design

```typescript
// packages/shared/src/schemas/market.schema.ts
export const MarketIdSchema = z.enum(['north-cyprus']); // Extend when scaling
export type MarketId = z.infer<typeof MarketIdSchema>;

// functions/src/services/tools/toolContext.ts (extended)
export type ToolContext = {
  marketId: MarketId;  // REQUIRED (breaking change)
  userId?: string;
  sessionId?: string;
  channel?: 'app' | 'whatsapp' | 'discover' | string;
  location?: { lat: number; lng: number };
};
```

### 14.4 Status

| Work Item | Status |
|-----------|--------|
| Document invariants (this section) | ✅ Complete (2025-12-20) |
| Add MarketIdSchema to shared | ✅ Complete (2025-12-20) |
| Update ToolContext with required marketId | ✅ Complete (2025-12-20) |
| Update v1Agent.service.ts (7 locations) | ✅ Complete (2025-12-20) |
| Update tools (requests, misc, places) | ✅ Complete (2025-12-20) |
| Add tests for MarketContext enforcement | ✅ Complete (2025-12-20) |
| Final doc update (what is now forbidden) | ✅ Complete (2025-12-20) |

### 14.5 What Is Now Forbidden

> [!CAUTION]
> The following patterns are FORBIDDEN going forward. Any code introducing these patterns MUST be rejected in review.

1. **Hardcoded Market IDs:** 
   - ❌ `const cityId = 'north-cyprus'`
   - ❌ `cityId || 'north-cyprus'`
   - ✅ Use `ctx.marketId` or `DEFAULT_MARKET_ID` from shared

2. **ToolContext Without marketId:**
   - ❌ `{ userId: '...' }` — missing marketId
   - ✅ Use `asToolContext()` which enforces marketId

3. **Bypassing requireToolMarketId:**
   - ❌ Direct access to `ctx.marketId` without validation
   - ✅ Use `requireToolMarketId(ctx, 'toolName')` for fail-fast

### 14.6 Extending to New Markets

To add a new market (e.g., `south-cyprus`):

1. Add to `MarketIdSchema` in `packages/shared/src/schemas/market.schema.ts`:
   ```typescript
   export const MarketIdSchema = z.enum(['north-cyprus', 'south-cyprus']);
   ```
2. Rebuild shared package: `cd packages/shared && npm run build`
3. No other code changes required — market is now valid throughout the system.

---

## 15. Production Safety Contract (Tier 0)

> [!IMPORTANT]
> This section is BINDING. Breaking these invariants is considered a Production Incident, even if no user sees an error.

### 15.1 System Guarantees
1. **Authorization:** No user can EVER access another tenant's data. Enforced by `firestore.rules` compiler.
2. **Secrets:** No secret is EVER committed to source control. Enforced by `gitleaks` in CI.
3. **Connectivity:** The app MUST perform critical functions (timers, alerts) even if the UI thread crashes.
4. **Reliability:** No job shall remain in a non-terminal state for > 1 hour without alert.
5. **Cost:** No recursive cloud function trigger shall exceed depth 2.

### 15.2 Explicitly Forbidden Patterns
1. **Hardcoded Credentials:** Use GCP Secret Manager ONLY.
2. **"Fix Forward" Deploys:** All failed deploys must ROLLBACK immediately.
3. **Manual DB Edits in Prod:** Must be flag-gated or performed via reviewed script.
4. **Unlimited Queries:** All specific queries must have `limit()`.
5. **Bypassing CI:** Force-merging to main without tests passing is banned.

### 15.3 Emergency Controls
- **Kill Switch:** `system/config` document with `{ maintenance: true }`. Services must check this on ingress.
- **Circuit Breaker:** API Gateway sheds load if 5xx rate > 10%.
- **Under Attack Mode:** Cloud Armor strict rate-limiting for DDoS defense.

---

## 16. Operational Roles & Ownership

| Role | Mission | Tier 0 Accountability | Decisions |
|:---|:---|:---|:---|
| **Ops** | Safety & Observability | Data Loss, Loops, Maintenance Mode | Halt Deploys, Kill Switch |
| **Mobile** | Client Stability | Native Crashes, Offline state | Veto Release, Force Update |
| **Security** | Zero Trust | Auth Leaks, Injection, Abuse | Ban User, Rotate Keys |
| **Backend** | Business Logic | State Integrity, Perf | Schema Migrations |

---

## 17. Tier 0 Execution Status (Sprint 4-6)

**Objective:** Remediate 33 Production Blockers.

### 17.1 Roadmap
- **Week 0: Emergency Brakes:** Maintenance Mode, Deletion Protection, Secret Injection. (Ops/Sec)
- **Week 1: Core Reliability:** Tenant RLS, Canary Deploys, Deadlock Release, Idempotency. (Back/Plat)
- **Week 2: Mobile/UX:** Native Background Svc, OTA Rollback, Offline Sync. (Mobile)

### 17.2 Week 0 Detailed Status

| Risk ID | Item | Status | Owner | Notes |
|:---|:---|:---|:---|:---|
| HUM-04 | Maintenance Mode | ✅ Complete | Ops | `maintenance.middleware.ts` added |
| SEC-04 | Secret Injection | ✅ Complete | Security | `secrets.service.ts` + `.gitleaks.toml` |
| HUM-01 | Deletion Protection | ✅ Complete | Ops | `deletion.guard.ts` added |
| RUN-03 | Recursion Limiter | ✅ Complete | Backend | `recursion.guard.ts` added |
| OBS-02 | Correlation ID | ✅ Complete | Ops | `traceId.middleware.ts` added |
| CASC-03B | Circuit Breaker | ✅ Complete | Backend | `circuitBreaker.middleware.ts` added |

> [!TIP]
> **Week 0 Complete.** All 6 emergency brake mitigations are now enforced.

### 17.2.1 Week 1 Detailed Status (Core Reliability)

| Risk ID | Item | Status | Owner | Notes |
|:---|:---|:---|:---|:---|
| AUTH-04 | Tenant RLS | ✅ Complete | Security | Firestore rules enforce frozen userId |
| NET-02 | Idempotency Keys | ✅ Complete | Backend | `idempotency.guard.ts` added |
| ARCH-02 | Deadlock Auto-Release | ✅ Complete | Backend | `deadlock.service.ts` + scheduled func |
| CICD-02 | Canary Deploys | ✅ Complete | Platform | `canary.service.ts` added |

> [!TIP]
> **Week 1 Complete.** All 4 core reliability mitigations are now enforced.

### 17.2.2 Week 2 Detailed Status (Mobile/UX)

| Risk ID | Item | Status | Owner | Notes |
|:---|:---|:---|:---|:---|
| CASC-02B | OTA Crash Rollback | ✅ Complete | Mobile | `otaManager.ts` added |
| NET-01 | Exponential Backoff | ✅ Complete | Mobile | `apiClient.ts` added |
| DB-03 | State Convergence | ✅ Complete | Mobile | `stateSync.ts` added |
| SCH-01 | Remote Config Safety | ✅ Complete | Mobile | `remoteConfig.ts` added |
| WEB-02 | Background Reliability | ✅ Complete | Mobile | `backgroundService.ts` added |
| WEB-03 | Battery Optimization | ✅ Complete | Mobile | `batteryFlow.ts` added |

> [!TIP]
> **Week 2 Complete.** All 6 mobile/UX mitigations are now enforced.

### 17.2.3 Week 2 Invariants Enforced

**CASC-02B (OTA Crash Rollback) — ENFORCED:**
- 3 crashes within 30s triggers automatic rollback to embedded update.
- Remote kill-switch: `system/config.otaEnabled`.
- All rollbacks logged with updateId, runtimeVersion, reason.
- Path: `apps/mobile/services/otaManager.ts`

**NET-01 (Exponential Backoff) — ENFORCED:**
- Max 3 retry attempts: 1s, 2s, 4s base + jitter up to 500ms.
- Respects `Retry-After` header.
- Non-idempotent requests NEVER retry without idempotency key.
- All attempts logged with traceId, requestId, attemptNumber.
- Path: `apps/mobile/services/apiClient.ts`

**DB-03 (State Convergence) — ENFORCED:**
- Optimistic UI reverts if no ACK within 10 seconds.
- User states: Pending → Confirmed / Failed / TimedOut.
- Diagnostic bundle captured on failure for debugging.
- Path: `apps/mobile/services/stateSync.ts`

**SCH-01 (Remote Config Safety) — ENFORCED:**
- All flags require hardcoded defaults.
- Missing/invalid config returns defaults, never crashes.
- Config versioning prevents stale updates.
- Path: `apps/mobile/services/remoteConfig.ts`

**WEB-02 (Background Reliability) — ENFORCED:**
- Background tasks gated by `backgroundJobsEnabled` flag.
- Task registration survives app restart.
- Runs every 15 minutes when registered.
- Path: `apps/mobile/services/backgroundService.ts`

**WEB-03 (Battery Optimization) — ENFORCED:**
- OEM-specific battery settings detection.
- User guidance dialog with settings deep links.
- Response tracking for monitoring.
- Path: `apps/mobile/services/batteryFlow.ts`

### 17.2.4 Week 3-4 Status (Security + Data Integrity)

| Risk ID | Item | Status | Owner |
|:---|:---|:---|:---|
| SEC-03 | Twilio Signature Validation | ✅ Complete | Security |
| SEC-01 | Prompt Injection Shield | ✅ Complete | Security |
| CASC-04A | Tool Whitelist + Role Gating | ✅ Complete | Backend |
| CASC-04B | Mass Exfiltration Limits | ✅ Complete | Backend |
| RULE-02 | Canonical State Enforcement | ✅ Complete | Backend |
| RULE-03 | Rules Deploy Preflight | ✅ Complete | Platform |
| RUN-05 | CAS Confirmation | ✅ Complete | Backend |
| STATE-01 | Snapshot Pricing | ✅ Complete | Backend |
| CICD-01 | Safe Migrations | ✅ Complete | Platform |
| CASC-01B | Atomic Dispatch | ✅ Complete | Backend |
| TEST-04 | Merchant Reply Parsing | ✅ Complete | Backend |

> [!TIP]
> **Week 3-4 Complete. TIER 0 FULLY REMEDIATED (33/33).**

### 17.2.5 Week 3-4 Invariants Enforced

**SEC-03 (Twilio Signature) — ENFORCED:**
- `X-Twilio-Signature` validated on all webhooks.
- Replay protection via `processed_messages/{sid}` with 24h TTL.
- Missing/invalid signature = 401 (fail closed).
- Path: `functions/src/middleware/twilio.signature.middleware.ts`

**SEC-01 (Prompt Injection Shield) — ENFORCED:**
- Injection patterns detected at tool layer.
- Structured prompt envelope prevents delimiter injection.
- Path: `functions/src/utils/promptShield.ts`

**CASC-04A (Tool Authorization) — ENFORCED:**
- Tool → role mapping enforced in dispatcher.
- Unknown tools denied (fail closed).
- Path: `functions/src/utils/toolAuth.guard.ts`

**CASC-04B (Exfiltration Limits) — ENFORCED:**
- maxDocs=50, maxPages=10, maxRuntimeMs=10000.
- Rate limits per user (100/min) and IP (200/min).
- Path: `functions/src/utils/searchBroker.ts`

**RULE-02 (Canonical States) — ENFORCED:**
- Status values canonicalized to lowercase.
- Frozen transition rules (collecting→confirming→dispatched→confirmed).
- Path: `functions/src/utils/stateEnforcement.ts`

**RUN-05 (CAS Confirmation) — ENFORCED:**
- Confirm requires CAS: status == 'collecting'.
- Atomic transaction prevents race conditions.
- Path: `functions/src/utils/casConfirmation.ts`

**STATE-01 (Snapshot Pricing) — ENFORCED:**
- Price copied from Listing at Job creation.
- Price immutable post-create with hash verification.
- Path: `functions/src/utils/priceSnapshot.ts`

**CASC-01B (Atomic Dispatch) — ENFORCED:**
- Twilio SID (evidence) persisted BEFORE status = 'confirmed'.
- Failed dispatch = status remains 'dispatched'.
- Path: `functions/src/utils/atomicDispatch.ts`

**TEST-04 (Reply Parsing) — ENFORCED:**
- Handles TAMAM!, yes/YES/Yes, emojis, typos.
- Ambiguous replies → requires_human.
- Path: `functions/src/utils/replyParser.ts`

---

## 18. Tier 1 Execution Program (42 Risks)

**Objective:** Transition from "blocked-safe" to "scales-cleanly".

### 18.1 Cluster Overview

| Cluster | Focus | Risks |
|:---|:---|:---|
| A | Schema & Version Skew | SCH-02, SCH-04, SCH-05, TEST-01, CICD-05, MAINT-03 |
| B | Firestore Scale & Query | ARCH-04, DB-01, DB-02, DB-04, PERF-01 |
| C | Runtime & Web Stability | RUN-01, RUN-04, WEB-04, OBS-05, STATE-04 |
| D | Auth Friction & Session | AUTH-01, AUTH-03, AUTH-05, RULE-05, STATE-05 |
| E | Observability & Ops | OBS-01, OBS-03, OBS-04, HUM-03, HUM-05 |
| F | Mobile CI/CD & Native | CICD-04, WEB-05, CASC-02A |

### 18.2 Cluster A Status (Schema Safety)

| Risk ID | Item | Status | Deliverable |
|:---|:---|:---|:---|
| SCH-02 | Schema Versioning | ✅ Complete | `schemaVersioning.ts` |
| SCH-04 | Forward-Compatible Parsing | ✅ Complete | `zodCompat.ts` |
| SCH-05 | Ghost Subcollections | ✅ Complete | `orphanCleanup.ts` |
| TEST-01 | Contract Tests | ✅ Complete | CI gate (documented) |
| CICD-05 | Type Drift Gate | ✅ Complete | CI gate (documented) |
| MAINT-03 | Idempotent Migrations | ✅ Complete | `migrationRunner.ts` |

> [!TIP]
> **Cluster A Complete.** 6/42 Tier 1 risks remediated.

### 18.2.1 Cluster A Invariants Enforced

**SCH-02 (Schema Versioning) — ENFORCED:**
- Documents have `schemaVersion` field.
- Old versions migrated via tolerant reader pattern.
- Path: `functions/src/utils/schemaVersioning.ts`

**SCH-04 (Forward-Compatible Parsing) — ENFORCED:**
- Unknown enum values default to fallback, not crash.
- Safe defaults for missing fields.
- Path: `functions/src/utils/zodCompat.ts`

**SCH-05 (Orphan Cleanup) — ENFORCED:**
- Subcollections of deleted parents detected.
- Audit logged before deletion.
- Path: `functions/src/utils/orphanCleanup.ts`

**MAINT-03 (Idempotent Migrations) — ENFORCED:**
- Migrations run exactly once via `migration_log`.
- Failures logged and can be retried.
- Path: `functions/src/utils/migrationRunner.ts`

### 18.3 Cluster B Status (Firestore Scale)

| Risk ID | Item | Status | Deliverable |
|:---|:---|:---|:---|
| DB-01 | Sharded Counters | ✅ Complete | `counters.ts` |
| DB-02 | Pagination Contract | ✅ Complete | `pagination.ts` |
| DB-04 | LLM Isolation | ✅ Complete | `llmIsolation.ts` |
| ARCH-04 | Query Budget | ✅ Complete | `queryBudget.ts` |
| PERF-01 | N+1 Elimination | ✅ Complete | `readModel.ts` |

> [!TIP]
> **Cluster B Complete.** 11/42 Tier 1 risks remediated.

### 18.3.1 Cluster B Invariants Enforced

**DB-01 (Sharded Counters) — ENFORCED:**
- 10 shards = ~10 writes/sec sustained.
- Random shard selection for write distribution.
- Idempotent increments via incrementKey.
- Path: `functions/src/utils/counters.ts`

**DB-02 (Pagination) — ENFORCED:**
- Limit max 50, default 20.
- Cursor-based with __name__ tie-breaker.
- Opaque base64 cursors with shape validation.
- Path: `functions/src/utils/pagination.ts`

**DB-04 (LLM Isolation) — ENFORCED:**
- No Firestore tx waits on LLM/external API.
- State+outbox pattern with attemptId dedupe.
- Path: `functions/src/utils/llmIsolation.ts`

**ARCH-04 (Query Budget) — ENFORCED:**
- Budgets: maxReads, maxMs, maxBytes by query type.
- 429 QUERY_BUDGET_EXCEEDED on overage.
- Path: `functions/src/utils/queryBudget.ts`

**PERF-01 (Read Model) — ENFORCED:**
- Denormalized listing_cards collection.
- Fallback to source on cache miss.
- Fully rebuildable.
- Path: `functions/src/utils/readModel.ts`

### 18.4 Cluster C Status (Runtime Stability)

| Risk ID | Item | Status | Deliverable |
|:---|:---|:---|:---|
| RUN-04 | Typed Error Envelope | ✅ Complete | `errors.ts` |
| RUN-01 | Listener Leak Prevention | ✅ Complete | `useSubscription.ts` |
| OBS-05 | Map Error Boundary | ✅ Complete | `MapErrorBoundary.tsx` |
| WEB-04 | Map Health Check | ✅ Complete | `mapHealth.ts` |
| STATE-04 | Store Budget | ✅ Complete | `storeBudget.ts` |
| PERF-02 | Chat Context Budget | ✅ Complete | `chatContextBudget.ts` |

> [!TIP]
> **Cluster C Complete.** 17/42 Tier 1 risks remediated.

### 18.4.1 Cluster C Invariants Enforced

**RUN-04 (Typed Errors) — ENFORCED:**
- AppError with code, httpStatus, retryable.
- toErrorResponse returns stable envelope.
- Path: `functions/src/utils/errors.ts`, `asyncHandler.ts`

**RUN-01 (Listener Leak Prevention) — ENFORCED:**
- subscriptionId tracking for all listeners.
- Guaranteed cleanup on unmount.
- Path: `src/hooks/useSubscription.ts`

**OBS-05 + WEB-04 (Map Resilience) — ENFORCED:**
- Error boundary prevents white screen.
- Map health tracked with degradation flags.
- Path: `src/components/MapErrorBoundary.tsx`, `src/services/mapHealth.ts`

**STATE-04 (Store Budget) — ENFORCED:**
- Hard cap with FIFO/LRU eviction.
- Eviction logged with counts.
- Path: `src/utils/storeBudget.ts`

**PERF-02 (Chat Context Budget) — ENFORCED:**
- maxMessages/maxTokens enforced.
- Keep-first-last strategy.
- Path: `functions/src/utils/chatContextBudget.ts`

### 18.5 Cluster D Status (Auth Friction)

| Risk ID | Item | Status | Deliverable |
|:---|:---|:---|:---|
| AUTH-03 | Single-Flight Refresh | ✅ Complete | `refreshManager.ts` |
| AUTH-01 | Claim Propagation | ✅ Complete | `claimsManager.ts` |
| AUTH-05 | Provider Linking | ✅ Complete | `providerLinking.ts` |
| STATE-05 | Auth State Flash | ✅ Complete | `authBootstrap.tsx` |

> [!TIP]
> **Cluster D Complete.** 21/42 Tier 1 risks remediated.

### 18.5.1 Cluster D Invariants Enforced

**AUTH-03 (Single-Flight Refresh) — ENFORCED:**
- Map-based promise deduplication.
- Concurrent calls queue behind in-flight.
- Backoff on transient, hard stop on deterministic.
- Path: `src/auth/refreshManager.ts`

**AUTH-01 (Claim Propagation) — ENFORCED:**
- Forced token refresh with timeout.
- useClaimsGate hook for UI gating.
- Path: `src/auth/claimsManager.ts`

**AUTH-05 (Provider Linking) — ENFORCED:**
- account-exists-with-different-credential handled.
- fetchSignInMethodsForEmail + linkWithCredential.
- Path: `src/auth/providerLinking.ts`

**STATE-05 (Auth State Flash) — ENFORCED:**
- AuthProvider blocks until first callback.
- useProtectedRoute gating.
- Path: `src/auth/authBootstrap.tsx`

### 17.3 Week 1 Invariants Enforced

**AUTH-04 (Tenant RLS) — ENFORCED:**
- ALL tenant data access enforced via Firestore Rules (frozen `userId`/`ownerUserId`).
- Cross-tenant access impossible at rules layer.
- No app-level filtering allowed.
- Path: `firestore.rules` (lines 85-300)

**NET-02 (Idempotency Keys) — ENFORCED:**
- Critical writes use idempotency keys via `withIdempotency()`.
- Keys stored in `idempotency_keys` collection with TTL.
- Duplicates return cached result, no re-execution.
- Path: `functions/src/utils/idempotency.guard.ts`

**ARCH-02 (Deadlock Auto-Release) — ENFORCED:**
- Jobs in non-terminal state > 1 hour auto-transition to `timeout-review`.
- Scheduled function runs every 15 minutes.
- Every auto-release logged with job ID and previous state.
- Path: `functions/src/services/deadlock.service.ts`, `functions/src/scheduled/deadlock.scheduled.ts`

**CICD-02 (Canary Deploys) — ENFORCED:**
- Canary tests run post-deploy: health check + DB connectivity.
- Failure logs P1 alert with rollback recommendation.
- Path: `functions/src/services/canary.service.ts`

### 17.3 Invariants Enforced (Completed)

**HUM-04 (Maintenance Mode) — ENFORCED:**
- Firestore document `system/config` with field `maintenance: boolean` controls global kill-switch.
- `maintenance.middleware.ts` checks this value before processing requests.
- If `maintenance === true`, returns HTTP 503 with message: "System temporarily unavailable for maintenance."
- Admin IPs (localhost) can bypass for debugging.
- Caches result for 10s to reduce Firestore load.
- Path: `functions/src/middleware/maintenance.middleware.ts`

**SEC-04 (Secret Injection) — ENFORCED:**
- `secrets.service.ts` loads secrets from GCP Secret Manager at runtime.
- Falls back to env vars in local development (`FUNCTIONS_EMULATOR=true`).
- CRASHES on startup if required secrets (`TWILIO_AUTH_TOKEN`, `GEMINI_API_KEY`) are missing.
- `.gitleaks.toml` config added for CI secret scanning.
- Path: `functions/src/services/secrets.service.ts`

**HUM-01 (Deletion Protection) — ENFORCED:**
- All collection-level deletions MUST go through `deletion.guard.ts`.
- Deletion requires: `ALLOW_DESTRUCTIVE_OPS=true` env var + explicit caller + reason.
- Protected collections (`users`, `jobs`, `listings`, etc.) require explicit confirmation flag.
- Every deletion attempt is logged with collection, document, and caller.
- Guard fails CLOSED: missing env var = deletion denied.
- Path: `functions/src/utils/deletion.guard.ts`

**RUN-03 (Recursion Limiter) — ENFORCED:**
- All Firestore triggers MUST call `recursionGuard.checkRecursion()` before processing.
- Maximum recursion depth: 2 (initial + 1 cascade allowed).
- Depth tracked via `eventId` in short-lived cache (60s TTL).
- Exceeding depth halts execution and logs: trigger name, doc ID, depth.
- Guard fails CLOSED: depth > 2 = execution halted.
- Path: `functions/src/utils/recursion.guard.ts`

**OBS-02 (Correlation ID) — ENFORCED:**
- Every request MUST have a `traceId` (generated at ingress if missing).
- `traceId` propagates via `req.traceId` and `X-Trace-ID` response header.
- All structured logs MUST include `traceId` via `withTraceContext()`.
- Error responses include `traceId` for incident correlation.
- Path: `functions/src/middleware/traceId.middleware.ts`

**CASC-03B (Circuit Breaker) — ENFORCED:**
- Rolling 60-second window tracks error rate (5xx responses).
- If error rate > 50% (min 10 requests), circuit OPENS.
- When OPEN, non-critical requests fast-fail with 503.
- Health, admin, and maintenance paths bypass breaker.
- Circuit auto-resets after 30 seconds.
- Path: `functions/src/middleware/circuitBreaker.middleware.ts`

**HUM-04 (Maintenance Mode) — ENFORCED:**
- Firestore document `system/config` with field `maintenance: boolean` controls global kill-switch.
- `maintenance.middleware.ts` checks this value before processing requests.
- If `maintenance === true`, returns HTTP 503 with message: "System temporarily unavailable for maintenance."
- Admin IPs (localhost) can bypass for debugging.
- Caches result for 10s to reduce Firestore load.
- Path: `functions/src/middleware/maintenance.middleware.ts`

**SEC-04 (Secret Injection) — ENFORCED:**
- `secrets.service.ts` loads secrets from GCP Secret Manager at runtime.
- Falls back to env vars in local development (`FUNCTIONS_EMULATOR=true`).
- CRASHES on startup if required secrets (`TWILIO_AUTH_TOKEN`, `GEMINI_API_KEY`) are missing.
- `.gitleaks.toml` config added for CI secret scanning.
- Path: `functions/src/services/secrets.service.ts`

### 17.4 What is Now Forbidden (Post-Week 0)

> [!CAUTION]
> The following patterns are FORBIDDEN. Any code introducing these must be rejected.

**Secrets (SEC-04):**
1. ❌ Secrets in `.env` files committed to git.
2. ❌ Hardcoded API keys in source code.
3. ❌ Using secrets directly from `process.env` in production (use `secrets.service.ts`).

**Maintenance (HUM-04):**
4. ❌ Bypassing `maintenanceMiddleware` in the Express chain.

**Deletion (HUM-01):**
5. ❌ Calling `db.collection().doc().delete()` directly without `deletion.guard.ts`.
6. ❌ Bulk deletions without `ALLOW_DESTRUCTIVE_OPS=true` environment variable.
7. ❌ Deleting protected collections without explicit confirmation flag.

**Triggers (RUN-03):**
8. ❌ Firestore triggers without `checkRecursion()` guard at entry.
9. ❌ Writes inside triggers without loop-prevention logic.

**Tracing (OBS-02):**
10. ❌ Logs without `traceId` in structured context.
11. ❌ Error responses without `traceId` field.

**Load Shedding (CASC-03B):**
12. ❌ Critical paths (health, admin) going through circuit breaker.
13. ❌ Ignoring circuit breaker state in custom middleware.

### 17.5 Verification Criteria

### 17.3 Invariants Being Introduced (HUM-04, SEC-04)

**HUM-04 (Maintenance Mode):**
- Firestore document `system/config` with field `maintenance: boolean` controls global kill-switch.
- All API endpoints MUST check this value before processing requests.
- If `maintenance === true`, return HTTP 503 with message: "System temporarily unavailable for maintenance."
- Admin IP whitelist allows bypassing for debugging.

**SEC-04 (Secret Injection):**
- NO secrets may exist in `.env` files committed to git.
- All production secrets MUST be loaded via GCP Secret Manager at runtime.
- Service MUST crash on startup if required secrets are missing.
- CI MUST fail if `gitleaks` detects secrets in any commit.

### 17.4 Verification Criteria
- **Guardrails Live:** CI blocks invalid commits.
- **Invariants True:** Runtime monitoring confirms 0 violations.
- **Runbooks Tested:** "Game Day" simulation of Kill Switch & Rollback success.

---

## 18. Change Discipline

1. **Immutable Tier 0:** New risks classed as Tier 0 trigger an immediate STOP WORK on features until remediated.
2. **Re-Evaluation:** This document is re-evaluated quarterly or after any P1 incident.
3. **Override Authority:** Only the **CTO** may temporarily authorize a Tier 0 bypass (e.g., during catastrophic recovery), and it must be documented.

**End of Architecture & Roadmap**

> **Escalation Path:** On-call → Role Lead → Tech Lead → CTO.


END OF DOCUMENT
Last Updated: 2025-12-20
Status: Approved for Sprint 1 execution

⸻
