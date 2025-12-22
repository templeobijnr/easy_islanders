# Deferred Work — Service Layer

> **Last Updated:** 2025-12-21
> **Status:** Documented, Not Scheduled

---

> [!IMPORTANT]
> ## 🔒 SERVICE LAYER IS FROZEN
>
> The service layer structure is frozen. This document lists the **only** allowed future work.
>
> Any work not listed here requires architectural review before proceeding.
>
> See [SERVICES.md](./SERVICES.md) for the freeze policy.
> See [SERVICE_LAYER_HANDOFF.md](./SERVICE_LAYER_HANDOFF.md) for onboarding.

---

This document lists intentional imperfections that are **known but deferred**.

If something looks "wrong" but is in this file, it is **intentional**.

Undocumented debt becomes accidental debt.

---

## 1. connectService.ts Split

**Current State:** 835 lines, single file
**Why Not Split Now:**
- Multi-domain aggregation is inherently complex
- Splitting prematurely risks creating artificial boundaries
- Current architecture works; optimization is not urgent
- Test coverage is in place to prevent regression

**When to Split:**
- When a specific sub-capability (e.g., curation) needs independent deployment
- When team size requires ownership boundaries
- When performance profiling shows specific bottlenecks

**Candidate Splits (future):**
- `feedAggregation.service.ts` — getTodayFeed, getThisWeekFeed, getLiveVenues
- `checkIn.service.ts` — checkIn, subscribeToAllActiveCheckIns
- `curation.service.ts` — getCurationItems, createCurationItem

---

## 2. asyncProcessor.ts Removal

**Current State:** DEV-only simulation of backend workers
**Why Not Delete Now:**
- Useful for local development without backend
- No production impact (guarded by `import.meta.env.DEV`)

**When to Delete:**
- When Cloud Functions handle:
  - Booking status webhooks (Stripe)
  - Push notifications (FCM)
  - Activity feed generation

---

## 3. unifiedListingsService.ts Rename

**Current State:** Named `unifiedListingsService.ts`
**Proposed Name:** `listings.service.ts`
**Why Not Rename Now:**
- Low priority; name is functional
- Renaming requires updating 20+ import statements
- No architectural benefit

**When to Rename:**
- During a future batch file rename phase
- When moving to `src/services/domains/listings/`

---

## 4. catalogMappers.ts Location

**Current State:** In `src/services/` root
**Proposed Location:** `src/services/utilities/catalogMappers.ts`
**Why Not Move Now:**
- Low priority; utilities can stay flat
- Folder structure is for layers, not utilities

**When to Move:**
- If utilities folder is created for other reasons

---

## 5. Pre-Existing Type Errors

**Files Affected:**
- `Connect.tsx` — `User` type missing `uid`, `displayName`, `photoURL`
- `asyncProcessor.ts` — `NodeJS.Timeout` vs browser `number`
- `connectService.ts` — `UserActivity` type mismatch

**Why Not Fix Now:**
- Unrelated to service layer cleanup
- Requires separate investigation of type definitions
- Tagged for Type Safety Audit (separate work)

---

## Rules for Adding to This File

1. Only add items that are **known imperfections**
2. Include **current state**, **why deferred**, and **when to address**
3. Do not add "nice to haves" — only architectural debt
4. If an item is fixed, remove it from this file

---

## Summary

| Item | Priority | Blocker |
|------|----------|---------|
| Split connectService | Low | Team size / deployment needs |
| Delete asyncProcessor | Low | Backend Cloud Functions |
| Rename unifiedListingsService | Very Low | Batch rename phase |
| Move catalogMappers | Very Low | Utilities folder creation |
| Pre-existing type errors | Medium | Separate type audit |
