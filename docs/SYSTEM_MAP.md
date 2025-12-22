# System Map (Easy-Islanders Repo)

This document maps the repo’s runtime architecture, request flows, multi-tenancy boundaries, and primary production risks.

## Repo Structure (Top-Level)

- `.firebase/` — Firebase CLI local state (emulators/cache); not deployed.
- `.git/` — Git metadata.
- `dist/` — Built frontend output (Vite build target); served by Firebase Hosting (`firebase.json:57-60`).
- `docs/` — Architecture/spec notes; not used at runtime.
- `functions/` — Firebase Cloud Functions (backend).
  - `functions/src/` — TypeScript source.
  - `functions/lib/` — Compiled JS output (Functions runtime entry points via `functions/package.json:19`).
- `node_modules/` — Local dependencies; not deployed to Hosting; Functions has its own `functions/node_modules/`.
- `src/` — Frontend React app (Vite).
- `tools/` — Local scripts/helpers; not deployed.
- `firebase.json` — Hosting rewrites, Functions build/deploy hooks, and emulators.
- `firestore.rules` / `storage.rules` — Firestore/Storage security rules.

## Deployment and Routing

### Hosting rewrites

- `/v1/**` → Cloud Function `apiV1` (`firebase.json:66-73`)
- `/legacy/**` → Cloud Function `api` (`firebase.json:74-80`)
- Everything else → SPA `index.html` (`firebase.json:81-84`)

### Functions entry points

- V1 API (multi-tenant): `apiV1` (`functions/src/index.ts:26-38`) mounts routes in `functions/src/api/app.ts:44-47`.
- Legacy API: `api` (`functions/src/index.ts:15-24`) mounts legacy router under `/legacy` (`functions/src/app.ts:17-18`).

## End-to-End Request Flow (Browser → API → Firestore/Storage → Auth/Claims)

### Diagram-style overview

```
Browser (Vite React, src/)
  ├─ Firebase Web SDK init (Auth/Firestore/Storage)  [src/services/firebaseConfig.ts]
  ├─ Auth state + claims (custom claims from ID token) [src/context/AuthContext.tsx]
  ├─ Calls V1 API via fetchWithAuth (Bearer token)     [src/services/v1Api.ts]
  └─ Some legacy calls still use VITE_API_URL directly [src/services/geminiService.ts]

Firebase Hosting (firebase.json rewrites)
  ├─ /v1/**     → Cloud Functions apiV1 (region europe-west1)
  └─ /legacy/** → Cloud Functions api (legacy)

Cloud Functions (functions/)
  ├─ apiV1 (Express) [functions/src/api/app.ts]
  │   ├─ /v1/claim/*       (claiming)
  │   ├─ /v1/owner/*       (owner dashboard + ingestion + products)
  │   ├─ /v1/admin/*       (admin tooling)
  │   └─ /v1/public-chat/* (public visitor chat)
  └─ api (legacy Express) [functions/src/app.ts]

Data plane (Admin SDK)
  ├─ Firestore (named DB: easy-db) [functions/src/config/firebase.ts:11]
  └─ Storage bucket                [firebase.json:24-29]

Security boundaries
  ├─ Owner scope comes ONLY from custom claims [functions/src/api/middleware/auth-owner.ts:79-110]
  └─ Tenant Firestore collections are client-denied by rules [firestore.rules:217-238]
```

### Key client/server glue

- Client attaches ID token to V1 calls (`src/services/v1Api.ts:44-56`).
- V1 Owner scope is derived ONLY from trusted token claims (role + businessId) (`functions/src/api/middleware/auth-owner.ts:79-110`).
- Post-claim owner routes are gated by:
  - `requireOwner` (`functions/src/api/routes/owner.routes.ts:50-51`)
  - `requireClaimed` (checks Firestore business claim state) (`functions/src/api/middleware/require-claimed.ts:33-60`)

## Critical Flows

### 1) Auth and claims

**Frontend**
- Claims are read from the ID token on auth state changes (`src/context/AuthContext.tsx:75-90`).
- Token refresh can be forced (`src/context/AuthContext.tsx:54-70`).
- Optional RTDB listener for backend “refresh token” signals (`src/context/AuthContext.tsx:121-140`).

**Backend**
- Centralized canonical claims setter (`functions/src/utils/claims.ts:41-60`).
- Multiple other writers exist (drift risk):
  - Signup assigns admin/business/user claims (`functions/src/triggers/auth.triggers.ts:28-76`).
  - User doc update assigns claims with `accessLevel` (`functions/src/triggers/user.triggers.ts:22-36`).

### 2) Multi-tenant scoping (“tenant context”)

- Owner scope is derived from token claims only (`functions/src/api/middleware/auth-owner.ts:79-110`).
- Owner routes explicitly avoid accepting `businessId` from client payloads (`functions/src/api/middleware/auth-owner.ts:79-81`).
- `TenantContext` type defines the core tenant primitive (`functions/src/types/tenant.ts:19-23`).
- A “claimed” gate checks claim state and ownership on each request (`functions/src/api/middleware/require-claimed.ts:33-60`).

### 3) Business claiming

**Discovery**
- Onboarding searches `listings` directly in Firestore (`src/dashboard/BusinessOnboarding.tsx:53-63`).
- Public read is allowed for listings (`firestore.rules:40-43`).

**Claim start**
- Client hits `/v1/claim/start` and server creates a pending claim (`src/dashboard/BusinessOnboarding.tsx:146-159`, `functions/src/repositories/business.repository.ts:100-212`).

**Phone verification**
- Client links verified phone to the signed-in user (`src/dashboard/BusinessOnboarding.tsx:224-227`) then calls `/v1/claim/confirm` (`src/dashboard/BusinessOnboarding.tsx:231-243`).
- Server sets owner claims via centralized module (`functions/src/api/controllers/claim.controller.ts:165-167`, `functions/src/utils/claims.ts:41-60`).

**Dev bypass**
- Client calls dev bypass in dev mode (`src/dashboard/BusinessOnboarding.tsx:168-185`).
- Server blocks unless explicitly enabled (`functions/src/api/controllers/claim.controller.ts:221-229`).

### 4) Knowledge ingestion + RAG

**Owner ingestion**
- Owner creates a knowledge doc in `processing` state (`functions/src/api/controllers/knowledge.controller.ts:114-125`).
- Controller enqueues ingestion (`functions/src/api/controllers/knowledge.controller.ts:127-132`) via task queue enqueue (`functions/src/api/services/knowledge-ingestion.service.ts:444-449`).
- Ingestion embeds + writes chunks and finalizes doc (`functions/src/api/services/knowledge-ingestion.service.ts:537-545`).

**RAG retrieval**
- RAG embeds the question and queries nearest chunks (`functions/src/api/services/rag.service.ts:46-61`).

**Public chat**
- Public visitor chat uses “anon or full auth” middleware (`functions/src/api/middleware/auth-anon.ts:16-41`) and routes (`functions/src/api/routes/public-chat.routes.ts:18-27`).
- Chat pipeline: session validation → message cap → RAG retrieval → Gemini generation → persistence (`functions/src/api/services/public-chat.service.ts:56-172`).

### 5) Admin tools (V1)

- Routes are admin-only (`functions/src/api/routes/admin.routes.ts:13-17`) with middleware verifying `admin === true` (`functions/src/api/middleware/auth-admin.ts:29-35`).
- Force assign ownership (no OTP) (`functions/src/api/controllers/admin.controller.ts:44-105`).
- Update entitlements (`functions/src/api/controllers/admin.controller.ts:119-166`).

## Security Model (Rules + Server-side enforcement)

### Firestore rules (high-level)

- Default deny: `allow read, write: if false` for all docs (`firestore.rules:31-33`).
- Public discovery collections (e.g. `listings`) are public read, admin write (`firestore.rules:40-43`).
- Tenant data is explicitly client-denied (`firestore.rules:217-238`), forcing all tenant mutations through Cloud Functions.

### Storage rules (high-level)

- Some paths are intended admin-only (`storage.rules:23-33`) or tenant-claim scoped (`storage.rules:52-64`).
- A broad catch-all allows authenticated writes to any non-`businesses/**` path (`storage.rules:107-114`) which can undermine per-prefix intent.

## Single Points of Failure (SPOFs)

- **`apiV1` function**: all `/v1/**` traffic depends on it (`firebase.json:66-73`, `functions/src/index.ts:26-38`).
- **Functions build gate**: deploy runs `tsc` predeploy (`firebase.json:6-8`); TypeScript build failures block deployment.
- **Custom-claims correctness**: owner routes require `role === 'owner'` + `businessId` claim (`functions/src/api/middleware/auth-owner.ts:81-99`). Any drift breaks owner access and Storage access (`storage.rules:52-59`).
- **Secrets availability**: Gemini-based features throw if `GEMINI_API_KEY` missing (`functions/src/api/services/public-chat.service.ts:36-41`, `functions/src/api/services/knowledge-ingestion.service.ts:74-79`).
- **Token refresh signaling**: client relies on token refresh to observe new claims; the backend “metadata” signal is best-effort (`functions/src/api/controllers/claim.controller.ts:168-173`, `src/context/AuthContext.tsx:121-140`).

## Risk Register (Top 10, with file:line evidence)

1) **Backend not deployable (build fails)** — `firebase.json:6-8` + TS errors in `functions/src/api/services/knowledge-ingestion.service.ts:549`, `:561`, `:562`, `:567`, `:580`, `:589` due to missing repo method and schema mismatch (`functions/src/repositories/knowledge.repository.ts:35-163`, `functions/src/types/tenant.ts:36-57`).
2) **Storage rules allow overly-broad authenticated writes** — catch-all grants writes to broad paths (`storage.rules:107-114`), conflicting with admin-only intent (`storage.rules:23-33`).
3) **SSRF via legacy import endpoint** — server-side `fetch(url)` on user input (`functions/src/controllers/listing.controller.ts:17-31`) exposed to any authenticated user (`functions/src/routes/index.ts:21-48`).
4) **Automatic admin escalation by email domain** — signup trigger promotes any `@easyislanders.com` email (`functions/src/triggers/auth.triggers.ts:29-35`).
5) **Claims shape drift (multiple writers / consumers)** — canonical claims shape excludes `accessLevel` (`functions/src/utils/claims.ts:17-31`) but triggers include it (`functions/src/triggers/auth.triggers.ts:30-35`, `functions/src/triggers/user.triggers.ts:24-36`) and frontend reads it (`src/context/AuthContext.tsx:11-16`, `:83-88`).
6) **Knowledge ingestion dispatch is split-brain (task queue + trigger)** — controller enqueues task (`functions/src/api/controllers/knowledge.controller.ts:127-132`) but there’s also a Firestore trigger ingestion path (`functions/src/triggers/knowledge.triggers.ts:17-40`).
7) **CORS is effectively open** — legacy app: `cors({ origin: true })` (`functions/src/app.ts:12`); V1 app uses default cors (`functions/src/api/app.ts:27`); function configs set `cors: true` (`functions/src/index.ts:19`, `functions/src/index.ts:32`).
8) **Dev bypass mismatch can block dev onboarding or risk accidental enablement** — frontend calls `/v1/claim/dev-bypass` in dev mode (`src/dashboard/BusinessOnboarding.tsx:168-185`) but server requires `ENABLE_DEV_BYPASS=true` (`functions/src/api/controllers/claim.controller.ts:221-229`).
9) **Env/config drift for Google/Mapbox keys** — Places proxy uses `GOOGLE_PLACES_API_KEY_ENV` (`functions/src/index.ts:114-119`) while secrets setup sets `GOOGLE_PLACES_API_KEY` (`setup-secrets.sh:48-53`) and reverse geocode expects `GOOGLE_PLACES_API_KEY` (`functions/src/utils/reverseGeocode.ts:52-60`).
10) **Dev-only background workers run unconditionally** — AsyncProcessor initializes on every app load (`src/App.tsx:106-110`) and schedules intervals (`src/services/asyncProcessor.ts:11-24`).

---

## AskMerve v1 Job Engine (Backend Skeleton)

### Overview

The Job Engine skeleton at `core/job_engine_v1/` implements the AskMerve v1 state machine per the locked contracts:
- `docs/execution_intake/v1_backend_canonical_contract.md`
- `docs/qa/v1_backend_verification_spec.md`  
- `docs/infra/v1_determinism_testability_contract.md`

### Hardening Summary (2025-12-20)

**Pre-execution gaps identified:**
- ATOM-01: Non-atomic commits (evidence → audit → job sequential writes)
- RACE-01: Idempotency check/store race (separate check then store)
- LATE-01: Late provider response rejected instead of recording evidence
- DETERM-01: ID generation used `Date.now()` instead of Clock

**Changes implemented:**
- `core/job_engine_v1/transaction.ts` — Transaction coordinator for staged writes
- `core/job_engine_v1/idempotency_store.ts` — CAS reserve-or-check + two-phase lifecycle
- `core/job_engine_v1/transition_service.ts` — Atomic commit, proper late handling
- All IDs now use `Clock.now()` for determinism

**Verification evidence:**
```
npm run verify:compliance
# 35/35 compliance tests pass
```

### Tier 0 Risk Mapping (Job Engine)

| Risk ID | Description | Status | Mitigation |
|:--------|:------------|:-------|:-----------|
| ATOM-01 | Partial writes on dependency failure | MITIGATED | TransactionCoordinator with staged writes |
| RACE-01 | Idempotency check/store race | MITIGATED | Atomic reserveOrCheck (no separate check) |
| LATE-01 | Late provider incorrectly rejected | MITIGATED | Returns success with lateResponse flag |
| TERM-01 | Terminal state mutation | MITIGATED | Terminal check before transition |
| DEP-01 | Silent dependency failures | MITIGATED | Explicit fail-closed with retriable errors |
| EC-04 | Provider accept vs timeout race | MITIGATED | Evidence timestamp vs boundary comparison |

### Acceptance Criteria (Met)

- [x] Atomicity via failure injection (audit fail → zero side effects)
- [x] EC-04 tie-break correctness via TestClock
- [x] Idempotency CAS (replay + conflict) with zero duplicate effects
- [x] Fail-closed dependencies return retriable error with zero side effects

### Next Steps (QA)

Implement automated test suite for:
- TC-001 through TC-112 (state machine tests)
- PROP-01..PROP-04 (property tests)
- Use deterministic mode (TestClock + explicit worker entrypoints)
- Verify stable ordering and atomicity invariants
