# AskMerve Backend — Cloud Functions Execution Prompt

> **For:** Engineering LLM or Senior Backend Engineer
> **Target:** Firebase Cloud Functions v2 + TypeScript
> **Last Updated:** 2025-12-21

---

## Execution Contract

This document is the **execution contract** for building AskMerve's backend.
Deviation requires architectural review.

---

## Non-Negotiable Rules

1. Firebase Cloud Functions v2 only (no Express servers)
2. No monolithic `app.ts`
3. No implicit routing
4. Types and tests BEFORE implementation
5. One module owns one collection
6. Cross-module writes are forbidden

---

## Folder Structure (Mandatory)

```
functions/
├── src/
│   ├── modules/
│   │   ├── identity/
│   │   │   ├── identity.schema.ts      # Types + Zod
│   │   │   ├── identity.service.ts     # Business logic
│   │   │   ├── identity.controller.ts  # Validation + auth
│   │   │   ├── identity.functions.ts   # Cloud Function exports
│   │   │   └── identity.test.ts        # Contract tests
│   │   │
│   │   ├── catalog/
│   │   │   ├── catalog.schema.ts
│   │   │   ├── catalog.service.ts
│   │   │   ├── catalog.controller.ts
│   │   │   ├── catalog.functions.ts
│   │   │   └── catalog.test.ts
│   │   │
│   │   ├── requests/
│   │   │   ├── requests.schema.ts
│   │   │   ├── requests.service.ts
│   │   │   ├── requests.controller.ts
│   │   │   ├── requests.functions.ts
│   │   │   └── requests.test.ts
│   │   │
│   │   ├── bookings/
│   │   │   ├── bookings.schema.ts
│   │   │   ├── bookings.service.ts
│   │   │   ├── bookings.controller.ts
│   │   │   ├── bookings.functions.ts
│   │   │   └── bookings.test.ts
│   │   │
│   │   ├── connect/
│   │   │   ├── connect.schema.ts
│   │   │   ├── connect.service.ts
│   │   │   ├── connect.controller.ts
│   │   │   ├── connect.functions.ts
│   │   │   └── connect.test.ts
│   │   │
│   │   ├── agent/
│   │   │   ├── agent.schema.ts
│   │   │   ├── agent.service.ts
│   │   │   ├── agent.controller.ts
│   │   │   ├── agent.functions.ts
│   │   │   └── agent.test.ts
│   │   │
│   │   └── configuration/
│   │       ├── config.schema.ts
│   │       ├── config.service.ts
│   │       ├── config.controller.ts
│   │       ├── config.functions.ts
│   │       └── config.test.ts
│   │
│   ├── infrastructure/
│   │   ├── firebase/
│   │   │   └── firebase.config.ts
│   │   ├── auth/
│   │   │   └── auth.guard.ts
│   │   └── logging/
│   │       └── logger.ts
│   │
│   ├── utils/
│   │   ├── validators.ts
│   │   ├── errors.ts
│   │   └── time.ts
│   │
│   └── index.ts
│
├── test/
│   └── integration/
│
├── package.json
└── tsconfig.json
```

---

## File Responsibility Contract

### `*.schema.ts`
```typescript
// ALLOWED: Types, Zod schemas, constants
// FORBIDDEN: Firebase imports, any logic

import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  role: z.enum(['user', 'provider', 'admin']),
  createdAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;
```

### `*.service.ts`
```typescript
// ALLOWED: Firestore operations, business logic
// FORBIDDEN: HTTP handling, callable context

import { db } from '../../infrastructure/firebase/firebase.config';
import { User } from './identity.schema';

export const IdentityService = {
  async getUser(userId: string): Promise<User | null> {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? (doc.data() as User) : null;
  },
};
```

### `*.controller.ts`
```typescript
// ALLOWED: Input validation, permission checks, calling service
// FORBIDDEN: Direct Firestore access

import { UserSchema } from './identity.schema';
import { IdentityService } from './identity.service';
import { AuthContext } from '../../infrastructure/auth/auth.guard';

export const IdentityController = {
  async getUser(ctx: AuthContext, userId: string) {
    if (ctx.uid !== userId && ctx.role !== 'admin') {
      throw new Error('PERMISSION_DENIED');
    }
    return IdentityService.getUser(userId);
  },
};
```

### `*.functions.ts`
```typescript
// ALLOWED: Cloud Function definitions, calling controller
// FORBIDDEN: Business logic

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { IdentityController } from './identity.controller';

export const getUser = onCall(
  { region: 'europe-west1' },
  async (request) => {
    try {
      const userId = request.data.userId;
      return await IdentityController.getUser(request.auth!, userId);
    } catch (e) {
      throw new HttpsError('permission-denied', e.message);
    }
  }
);
```

---

## Cloud Function Types

| Type | Use Case | Example |
|------|----------|---------|
| `onCall` | Authenticated client actions | `createRequest`, `getUser` |
| `onRequest` | Webhooks, public APIs | `stripeWebhook`, `healthCheck` |
| `onSchedule` | Background jobs | `cleanupExpiredCheckIns` |
| `onDocumentCreated` | Firestore triggers | `onRequestCreated` |

---

## Module Implementation Order

Execute in this order:

1. **Identity** — User auth, profiles
2. **Catalog** — Listings CRUD
3. **Requests** — Job creation and tracking
4. **Bookings** — Reservations
5. **Connect** — Check-ins, feeds
6. **Agent** — Merve AI
7. **Configuration** — Admin config

---

## Per-Module Development Flow

For EACH module, follow strictly:

```
1. schema.ts    → Define types and Zod schemas
2. test.ts      → Write contract tests (BEFORE implementation)
3. service.ts   → Implement business logic
4. controller.ts → Implement validation and auth
5. functions.ts → Export Cloud Functions
6. index.ts     → Re-export from module index
```

---

## Test Requirements

| Module | Min Tests | Coverage |
|--------|-----------|----------|
| Identity | 5 | Auth, profile CRUD |
| Catalog | 5 | Listing CRUD, queries |
| Requests | 8 | Status transitions |
| Bookings | 5 | Create, confirm, cancel |
| Connect | 10 | Check-in, feeds |
| Agent | 10 | Chat, proposals |
| Boundaries | 20 | Cross-module prevention |

### Required Test Patterns

```typescript
// 1. Happy path
it('creates a request for authenticated user', async () => {});

// 2. Permission denial
it('rejects request creation for unauthenticated user', async () => {});

// 3. Invalid input
it('rejects malformed request data', async () => {});

// 4. Forbidden API
it('does NOT expose getUser on CatalogService', () => {
  expect((CatalogService as any).getUser).toBeUndefined();
});
```

---

## Index.ts Export Surface

```typescript
// functions/src/index.ts

// Identity
export { getUser, updateProfile } from './modules/identity/identity.functions';

// Catalog
export { getListing, createListing } from './modules/catalog/catalog.functions';

// Requests
export { createRequest, updateRequestStatus } from './modules/requests/requests.functions';

// Bookings
export { createBooking, confirmBooking } from './modules/bookings/bookings.functions';

// Connect
export { checkIn, getLiveFeed } from './modules/connect/connect.functions';

// Agent
export { chat, acceptProposal } from './modules/agent/agent.functions';

// Configuration
export { getConfig, updateConfig } from './modules/configuration/config.functions';
```

---

## Deployment Commands

```bash
# Local development
firebase emulators:start --only functions,firestore,auth

# Type check
npm run typecheck

# Run tests
npm test

# Deploy to production
firebase deploy --only functions
```

---

## Error Handling

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_INPUT' | 'INTERNAL',
    message: string
  ) {
    super(message);
  }
}

// In controller
throw new AppError('PERMISSION_DENIED', 'User cannot access this resource');

// In functions.ts
catch (e) {
  if (e instanceof AppError) {
    throw new HttpsError(e.code.toLowerCase(), e.message);
  }
  throw new HttpsError('internal', 'Unknown error');
}
```

---

## Verification Checklist

Before merging any module:

- [ ] Schema defined with Zod
- [ ] Tests written and passing
- [ ] Service implements business logic
- [ ] Controller handles validation/auth
- [ ] Functions exported correctly
- [ ] No cross-module writes
- [ ] TypeScript compiles
- [ ] Emulator tests pass

---

## STOP Conditions

STOP and request review if:

- You feel tempted to add Express routing
- You need to write to another module's collection
- Tests require weakening to pass
- You want to add a "convenience" function

---

> **This is the execution contract. Follow it precisely.**
