---
description: Type-Driven, Test-First Service Development standard for AskMerve
---

# Type-Driven, Test-First Service Development (TDD²)

**Development Order (STRICT)**
1. Types First
2. Tests Second  
3. Implementation Last

If you write implementation before types and tests, the task is FAILED.

---

## Step 1: Define Types

Create domain types and service contract before any code:

```typescript
// Domain types
type SocialUser = {
  id: string
  displayName: string
  avatarUrl?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Service contract (exact API surface)
interface SocialServiceContract {
  getUserProfile(userId: string): Promise<SocialUser | null>
  ensureUserProfile(user: AuthUser): Promise<SocialUser>
  updateUserProfile(
    userId: string,
    updates: Partial<Pick<SocialUser, 'displayName' | 'avatarUrl'>>
  ): Promise<void>
}
```

Define:
- What entities exist
- Required vs optional fields
- Immutable vs mutable
- Ownership boundaries (what this service OWNS and MUST NOT touch)

---

## Step 2: Write Tests (Before Implementation)

Tests must cover:

### Positive Behavior
- Correct return types
- Correct data shape
- Expected side effects

### Boundary Conditions
- Missing data
- Null cases
- Partial updates

### Safety Tests (NON-NEGOTIABLE)

```typescript
describe('Safety & Boundaries — Deprecated APIs', () => {
  it('does NOT expose deprecated APIs', () => {
    expect((SocialService as any).getFeed).toBeUndefined()
    expect((SocialService as any).addComment).toBeUndefined()
    expect((SocialService as any).checkIn).toBeUndefined()
  })
})

describe('API Surface Area', () => {
  it('should have exactly N public methods', () => {
    const publicMethods = Object.keys(Service).filter(
      (key) => typeof (Service as any)[key] === 'function'
    )
    expect(publicMethods).toHaveLength(3)
  })
})
```

Tests MUST fail before implementation exists.

---

## Step 3: Implement (Minimal)

Only after types exist and tests FAIL:

- Implementation must satisfy types + tests only
- No extra methods
- No speculative features
- No "future-proofing"
- No hidden exports

**If it is not tested, it does not exist.**

---

## Required Documentation Header

```typescript
/**
 * DOMAIN SERVICE — {Domain Name}
 *
 * Ownership:
 * - Owns: {explicit list}
 * - Does NOT own: {explicit exclusions}
 *
 * Development Model:
 * - Type-driven
 * - Test-first
 * - Contract-locked
 */
```

---

## Reference Standard: Social Service

| Concern | Owner |
|---------|-------|
| User identity & profiles | `social.service.ts` |
| Presence / check-ins | `connectService.ts` |
| Feeds / comments / likes | ❌ DEPRECATED |

**API (EXACT):**
- `getUserProfile(userId)` 
- `ensureUserProfile(user)`
- `updateUserProfile(userId, updates)`

**Constraints:** Exactly 3 public methods, identity-only, no side effects outside `socialUsers` collection.

---

## Verification Checklist

- [ ] Types written before implementation
- [ ] Tests written before implementation
- [ ] Safety tests exist
- [ ] API surface area is minimal and intentional
- [ ] No deprecated concepts reintroduced
- [ ] Ownership boundaries respected
- [ ] Code can be read and understood in one pass

---

## Run Tests

```bash
// turbo
npx vitest run src/services/domains/{domain}/{domain}.service.test.ts
```
