# Service Layer Handoff

> **For:** New Engineers
> **Last Updated:** 2025-12-21
> **Status:** Frozen & Stable

---

## Quick Reference

| Question | Answer |
|----------|--------|
| Where do I add a new domain service? | `src/services/domains/{domain}/` |
| Where do I add a new integration? | `src/services/integrations/{provider}/` |
| Where do I add a new utility? | `src/services/utils/` |
| How do I verify structure? | `npm run guard:services` |
| How do I run boundary tests? | `npx vitest run src/services/architecture/` |

---

## What Exists

### Folder Structure

```
src/services/
├── infrastructure/         # Firebase, storage, config
│   ├── firebase/
│   ├── storage/
│   └── maps/
├── domains/                # Business logic per domain
│   ├── social/
│   ├── activities/
│   ├── events/
│   ├── experiences/
│   ├── places/
│   ├── stays/
│   ├── bookings/
│   ├── requests/
│   └── gamification/
├── integrations/           # Third-party APIs
│   ├── gemini/
│   ├── google/
│   ├── merchant/
│   └── backend/
├── utils/                  # Pure functions
│   ├── async-processor.ts
│   └── catalog-mappers.ts
├── storage/                # Local persistence
├── architecture/           # Boundary enforcement tests
│
├── connectService.ts       # Orchestration (large, deferred)
├── discoverConfigService.ts
├── unifiedListingsService.ts
│
├── SERVICES.md             # Architecture documentation
├── DEFERRED.md             # Known imperfections
└── SERVICE_LAYER_HANDOFF.md  # This file
```

### Key Services

| Service | Purpose | Owner |
|---------|---------|-------|
| `social.service.ts` | User profiles | Identity domain |
| `connectService.ts` | Check-ins, feeds | Orchestration |
| `unifiedListingsService.ts` | Listings CRUD | Listings domain |
| `firebase.config.ts` | Firebase init | Infrastructure |

---

## What Is Forbidden

### ❌ DO NOT:

1. **Add new files to `src/services/` root**
   - All new services must go in subdirectories

2. **Expand large service responsibilities**
   - `connectService.ts` is frozen; do not add methods
   - See DEFERRED.md for split plan

3. **Reintroduce deprecated APIs**
   - `getFeed`, `createPost`, `addComment` → deleted
   - `getGroups`, `joinGroup`, `leaveGroup` → deleted
   - Tests will fail if these reappear

4. **Create services without tests**
   - Test-first development is mandatory
   - See `/tdd-service-development` workflow

5. **Import across layers incorrectly**
   - Utilities must NOT import domain services
   - Infrastructure must NOT import application logic

---

## How to Add a New Service

### 1. Choose the correct layer

| Layer | Purpose | Folder |
|-------|---------|--------|
| Domain | CRUD + business rules for one collection | `domains/{domain}/` |
| Application | Orchestration across domains | `application/{feature}/` |
| Integration | Third-party API wrapper | `integrations/{provider}/` |
| Infrastructure | Firebase, storage, config | `infrastructure/{purpose}/` |
| Utility | Pure functions, no side effects | `utils/` |

### 2. Create test file FIRST

```typescript
// domains/myfeature/myfeature.service.test.ts

describe('MyFeatureService', () => {
  it('owns X functionality', () => { ... });
  it('does NOT expose Y', () => { ... });
});
```

### 3. Create service with contract header

```typescript
/**
 * ARCHITECTURAL CONTRACT — myfeature.service.ts
 *
 * OWNS:
 * - X functionality
 *
 * DOES NOT OWN:
 * - Y (owned by other service)
 */
```

### 4. Update SERVICES.md

Add your service to the appropriate table.

### 5. Run verification

```bash
npm run guard:services
npx vitest run src/services/
```

---

## How to Request Architectural Changes

1. Check if work is already in [DEFERRED.md](./DEFERRED.md)
2. If not, create a proposal with:
   - What you want to change
   - Why it's necessary
   - Impact on existing services
3. Request architecture review before implementing

---

## Local Verification Commands

```bash
# Run structure guard
npm run guard:services

# Run all service tests
npx vitest run src/services/

# Run boundary enforcement tests only
npx vitest run src/services/architecture/

# Run specific service tests
npx vitest run src/services/domains/social/
```

---

## Common Mistakes to Avoid

| Mistake | Why It's Wrong | What to Do |
|---------|----------------|------------|
| Adding file to root | Violates structure | Use correct subdirectory |
| Service without test | Violates TDD | Write test first |
| Missing header | No ownership clarity | Add OWNS/DOES NOT OWN |
| Importing domain in utility | Layer violation | Utilities are pure |
| Adding method to connectService | Service is frozen | Create new service |

---

## Questions?

- Check [SERVICES.md](./SERVICES.md) for architecture overview
- Check [DEFERRED.md](./DEFERRED.md) for known imperfections
- Run `npm run guard:services` to validate your changes
