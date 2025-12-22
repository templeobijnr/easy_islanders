# Services Architecture

> **Last Updated:** 2025-12-21
> **Status:** FROZEN — Structural Alignment Complete

---

> [!CAUTION]
> ## 🔒 SERVICE LAYER FREEZE
>
> The service layer is **frozen**. Changes require architectural review.
>
> **Allowed:**
> - Bug fixes within existing services
> - Work listed in [DEFERRED.md](./DEFERRED.md)
>
> **Forbidden:**
> - New services without test-first contract
> - Expanding large service responsibilities
> - Reintroducing deprecated APIs
>
> **Verification:** `npm run guard:services`

---

## Overview

This folder contains all frontend service modules for AskMerve.
Services are organized by **responsibility layer**.

**Structure enforced by:**
- `scripts/guard-services-structure.ts` (CI)
- `service-boundaries.test.ts` (Tests)

---

## Layer Taxonomy

### 1. Domain Services
**Purpose:** CRUD operations and business rules for a single domain.
**Dependency Rule:** May only import infrastructure. MUST NOT import other domains.

| Service | Collection | Path |
|:--------|:-----------|:-----|
| `activities.service.ts` | `activities` | `./domains/activities/` |
| `events.service.ts` | `events` | `./domains/events/` |
| `experiences.service.ts` | `experiences` | `./domains/experiences/` |
| `places.service.ts` | `places` | `./domains/places/` |
| `stays.service.ts` | `stays` | `./domains/stays/` |
| `bookings.service.ts` | `bookings` | `./domains/bookings/` |
| `requests.service.ts` | `requests` | `./domains/requests/` |
| `social.service.ts` | `socialUsers` | `./domains/social/` |
| `stamps.service.ts` | `stamps`, `userProfiles` | `./domains/gamification/` |
| `unifiedListingsService.ts` | `listings` | `./` |

### 2. Application / Orchestration Services
**Purpose:** Coordinate multiple domains. Handle complex workflows.
**Dependency Rule:** May import domain services. May import infrastructure.

| Service | Description |
|:--------|:------------|
| `connectService.ts` | ⚠ LARGE (802 lines). Feed aggregation, check-ins, events |
| `discoverConfigService.ts` | Discover/homepage configuration |

### 3. Integration Services
**Purpose:** External API clients. No business logic.
**Dependency Rule:** May import infrastructure only. MUST NOT import domains.

| Service | Integration | Path |
|:--------|:------------|:-----|
| `gemini.client.ts` | Gemini AI (via backend) | `./integrations/gemini/` |
| `google-import.client.ts` | Google Places API | `./integrations/google/` |
| `merchant.api.ts` | Merchant webview API | `./integrations/merchant/` |
| `v1.api.ts` | V1 backend API | `./integrations/backend/` |

### 4. Infrastructure Services
**Purpose:** Firebase, storage, config. No domain knowledge.
**Dependency Rule:** MUST NOT import any other layer.

| Service | Purpose | Path |
|:--------|:--------|:-----|
| `firebase.config.ts` | Firebase initialization | `./infrastructure/firebase/` |
| `image-upload.service.ts` | Image upload to storage | `./infrastructure/storage/` |
| `local-storage.service.ts` | Local storage wrapper | `./infrastructure/storage/` |
| `map-health.service.ts` | Map health checks | `./infrastructure/maps/` |

> **Note:** `firebaseConfig.ts` at root is a shim; canonical location is `infrastructure/firebase/`.

### 5. Projections (Read Models)
**Purpose:** Derived/aggregated views. Not authoritative.
**Dependency Rule:** Read-only. May query multiple collections.

| Service | Description |
|:--------|:------------|
| *(none currently)* | — |

### 6. Utilities
**Purpose:** Pure functions. No side effects. No Firestore.
**Dependency Rule:** May be imported by any layer.

| Service | Purpose | Path |
|:--------|:--------|:-----|
| `async-processor.ts` | DEV-only simulation | `./utils/` |
| `catalog-mappers.ts` | Type transformations | `./utils/` |

> **Note:** Root-level shims exist for backward compatibility.

---

## Dependency Rules (High-Level)

```
Infrastructure ← Domain ← Application
     ↑              ↑           ↑
     └──────────────┴───────────┘
            Integrations

Utilities → Can be imported by anyone
Projections → Read-only, may query multiple domains
```

**Allowed:**
- Application → Domain → Infrastructure
- Integration → Infrastructure
- Any → Utilities

**Forbidden:**
- Domain → Domain (no cross-domain coupling)
- Infrastructure → Domain (no business logic in infra)
- Domain → Application (no upward dependencies)

---

## Architectural Decisions (LOCKED)

### Collections Are Intentionally Separate

The following collections are **separate bounded contexts**:
- `activities`, `events`, `experiences`, `places`, `stays`, `listings`

**DO NOT:**
- Collapse these into a single collection
- Introduce polymorphic `type` fields for unification
- Create shared base schemas

See: Living Document §5.3 "Domain Separation"

---

## Known Issues (DO NOT FIX IN PHASE 1)

| Issue | File | Severity |
|:------|:-----|:---------|
| Misnamed service | `listingsService.ts` operates on `stays` | Medium |
| Oversized service | `connectService.ts` is 802 lines | Medium |
| Duplicated helper | `removeUndefined` in 4 files | Low |
| No dependency enforcement | Any file imports any file | Low |

These will be addressed in Phase 2 (folder restructure).

---

## How to Modify Services

### Safe to Modify in Isolation
- Domain services (single collection, no orchestration)
- Utilities (pure functions)
- Infrastructure (no business logic)

### Requires Careful Review
- Application/orchestration services (multi-domain)
- Integrations (external dependencies)

### Do Not Modify Without Architecture Review
- Projections (derived data synchronization)
- Files marked with ⚠ annotations

---

## File Naming Convention (Future)

When Phase 2 restructure happens:
- Domain: `{domain}.service.ts`
- Integration: `{provider}.client.ts`
- Infrastructure: `{tech}.config.ts`
- Utilities: `{purpose}.util.ts`

---

## Rules for Adding a New Service

> **⚠ The service surface is now FROZEN.**
> New services require explicit approval and must follow these rules.

### 1. Test-First Contract (Mandatory)
- Write tests BEFORE implementation
- Tests must assert:
  - Allowed methods exist
  - Forbidden methods do NOT exist
  - Return types are correct

### 2. Ownership Declaration (Mandatory)
Every service file must have a header stating:
- What it OWNS (collections, responsibilities)
- What it DOES NOT OWN (explicit exclusions)
- Which layer it belongs to (Domain / Application / Integration / Infrastructure)

### 3. Forbidden Responsibilities
Before adding a new service, verify:
- No existing service already owns this concern
- The new service does not duplicate existing ownership
- Check `DEFERRED.md` to ensure this isn't deferred work

### 4. Correct Location
- Domain Service → `src/services/domains/{domain}/`
- Integration → `src/services/integrations/{provider}/`
- Infrastructure → `src/services/infrastructure/{purpose}/`
- Utility → `src/services/` (flat, with `.util.ts` suffix)

### 5. Approval Required
- New services touching multiple domains → requires architecture review
- New services over 200 lines → requires justification
- New integrations → requires security review

---

## Related Documents

- [DEFERRED.md](./DEFERRED.md) — Intentional imperfections and deferred work
- [README.md](./README.md) — Quick reference
