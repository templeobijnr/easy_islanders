# Types Architecture

> **Phase 0 Migration**: This structure was created to organize 5000+ LOC of types across the codebase.
> Migration is happening domain-by-domain. See TODO comments in files for migration status.

## Directory Structure

```
types/
├── common/           # Shared primitives (use everywhere)
│   ├── ids.ts        # Branded ID types
│   ├── money.ts      # Currency, Money
│   ├── time.ts       # ISODate, TimeWindow
│   ├── result.ts     # Result<T> pattern
│   ├── errors.ts     # ErrorCode, AppError
│   └── index.ts
│
├── tenant/           # Multi-tenancy domain
│   ├── model.ts      # Business, Membership (Firestore)
│   ├── contracts.ts  # BusinessDTO, auth DTOs
│   └── index.ts
│
├── chat/             # Chat/agent domain
│   ├── model.ts      # ChatSession, Message (Firestore)
│   ├── contracts.ts  # SendMessageRequest/Response
│   └── index.ts
│
├── execution/        # Transaction ledger domain
│   ├── model.ts      # Transaction, TxEvent, Lock (Firestore)
│   ├── contracts.ts  # TransactionDTO, ConfirmRequest
│   └── index.ts
│
├── catalog/          # Listings/offerings domain
│   ├── model.ts      # Listing, Offering (Firestore)
│   ├── contracts.ts  # ListingDTO, SearchRequest
│   └── index.ts
│
├── knowledge/        # RAG/knowledge domain
│   ├── model.ts      # KnowledgeDoc, Chunk (Firestore)
│   ├── contracts.ts  # IngestRequest, SearchRequest
│   └── index.ts
│
├── integrations/     # External service types
│   ├── twilio.contracts.ts
│   ├── typesense.contracts.ts
│   └── index.ts
│
└── [legacy files]    # Being migrated → re-export shims
```

---

## Naming Conventions

| Suffix | Purpose | Who Imports |
|--------|---------|-------------|
| `*.model.ts` | Firestore document shapes, internal fields, Timestamps | Repositories |
| `*.contracts.ts` | API DTOs, JSON-safe, request/response shapes | Controllers, Routes |
| `index.ts` | Barrel exports for the domain | Everyone |

---

## Import Rules

### ✅ Allowed

```typescript
// Repository → model
import { Transaction } from '@/types/execution/model';

// Controller → contracts
import { TransactionDTO, ConfirmRequest } from '@/types/execution/contracts';

// Anyone → common
import { ErrorCode, Result, ok, fail } from '@/types/common';
```

### ❌ Forbidden

```typescript
// Controller CANNOT import model (has Firestore Timestamps)
import { Transaction } from '@/types/execution/model'; // ❌

// Don't import from legacy files (use new paths)
import { Transaction } from '@/types/transaction'; // ❌ deprecated
```

---

## Model vs Contract Rules

### `*.model.ts` (Backend Internal)

- **Contains**: Firestore document shapes
- **Allowed**: `Timestamp`, internal audit fields, idempotency metadata
- **Imported by**: Repositories, scheduled workers, internal services
- **NOT imported by**: Controllers, routes, webhooks

```typescript
// execution/model.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface Transaction {
    id: string;
    status: TransactionStatus;
    createdAt: Timestamp;           // ← Firestore type
    updatedAt: Timestamp;
    holdExpiresAt?: Timestamp;
    _idempotencyKey?: string;       // ← Internal field
    _lockAcquiredAt?: Timestamp;
}
```

### `*.contracts.ts` (API Boundary)

- **Contains**: JSON-safe DTOs for HTTP/webhook boundaries
- **Allowed**: Primitive types, ISODateTime strings, nested DTOs
- **Imported by**: Controllers, routes, webhooks, frontend (via sharing)
- **NOT imported by**: Repositories (they use model.ts)

```typescript
// execution/contracts.ts
export interface TransactionDTO {
    id: string;
    status: TransactionStatus;
    createdAt: string;              // ← ISO string, not Timestamp
    holdExpiresAt?: string;
    // No internal fields exposed
}

export interface ConfirmRequest {
    transactionId: string;
}

export interface ConfirmResponse {
    success: boolean;
    confirmationCode?: string;
    error?: AppError;
}
```

---

## Common Types Usage

```typescript
import { 
    ErrorCode, 
    AppError, 
    Result, 
    ok, 
    fail,
    Currency,
    Money,
    ISODateTime,
} from '@/types/common';

// Use Result pattern
async function confirmBooking(id: string): Promise<Result<ConfirmationDTO>> {
    if (!tx) {
        return fail('NOT_FOUND', 'Transaction not found');
    }
    return ok({ confirmationCode: 'ABC123' });
}
```

---

## Migration Status

| Domain | Status | Old File(s) | New Location |
|--------|--------|-------------|--------------|
| common | ✅ Done | `enums.ts` (partial) | `common/*` |
| tenant | 🔲 Pending | `business.ts`, `auth.ts`, `tenant.ts` | `tenant/*` |
| chat | 🔲 Pending | `chat.ts` | `chat/*` |
| execution | 🔲 Pending | `transaction.ts`, `booking.ts` | `execution/*` |
| catalog | 🔲 Pending | `catalog.ts`, `marketplace.ts` | `catalog/*` |
| knowledge | 🔲 Pending | `knowledge.ts` | `knowledge/*` |

---

## Adding New Types

1. **Decide**: Is it a Firestore model or an API contract?
2. **Place it**: In the appropriate domain folder
3. **Export it**: Add to the domain's `index.ts`
4. **Don't dump**: If it doesn't fit a domain, create a new domain folder

---

## Legacy Files (Shims)

Files like `transaction.ts`, `chat.ts` are being kept as re-export shims:

```typescript
// types/transaction.ts (legacy shim)
/** @deprecated Import from '@/types/execution' instead */
export * from './execution/model';
export * from './execution/contracts';
```

These will be removed once all imports are updated.
