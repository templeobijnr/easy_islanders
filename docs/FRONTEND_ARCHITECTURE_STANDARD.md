# Frontend Architecture Standard

This document defines the canonical frontend architecture for AskMerve. All contributors must follow these standards.

## Definitions

| Term | Definition |
|------|------------|
| **UI Primitive** | Atomic component with no business logic: Button, Input, Card, Modal |
| **Shared Component** | Cross-domain reusable UI: ErrorBoundary, ListingCard, LoadingSpinner |
| **Layout Component** | Shell elements: Navbar, Footer, Sidebar, PageWrapper |
| **Feature Module** | Domain-specific folder containing components, hooks, services, types |
| **Page** | Route-level screen that composes feature components |

---

## Canonical Target Structure

```
src/
├── components/
│   ├── ui/                    # primitives only
│   ├── shared/                # cross-domain reusable UI
│   └── layout/                # shell
├── features/
│   ├── admin/
│   ├── agent/
│   ├── bookings/
│   ├── catalog/
│   ├── connect/
│   ├── identity/
│   └── requests/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       ├── utils/
│       └── index.ts
├── pages/                     # route-level screens only
├── context/                   # providers only
├── layouts/                   # route wrappers only
├── hooks/                     # cross-domain hooks
├── services/                  # cross-domain services
└── utils/                     # pure helpers
```

---

## Current Structure (Legacy)

```
src/
├── components/
│   ├── admin/        → migrate to features/admin/
│   ├── booking/      → migrate to features/bookings/
│   ├── consumer/     → migrate to features/identity/
│   ├── layout/       → keep as components/layout/
│   ├── shared/       → keep as components/shared/
│   └── ...
├── dashboard/        → migrate to features/admin/
├── pages/            → keep (thin composition only)
└── services/         → extract domain services to features/
```

---

## Hard Rules

### 1. 300-Line Limit (ENFORCED)

**No frontend module file may exceed 300 lines.**

When violated:
1. Extract hooks to `hooks/` folder (feature-local or cross-domain)
2. Extract sub-components to same folder
3. Extract types to `types/` folder
4. Extract pure helpers to `utils/`

### 2. No Cross-Domain Imports (ENFORCED)

Files in `src/features/<domainA>/` may NOT import from `src/features/<domainB>/`.

**Allowed cross-domain imports:**
- `src/components/ui/**`
- `src/components/shared/**`
- `src/components/layout/**`
- `src/utils/**`
- `src/hooks/**` (cross-domain hooks folder)
- `src/services/**` (cross-domain services folder)
- `src/types/**`
- `src/context/**`

### 3. No Business Logic in Components (WARN)

Components should be presentational. Move business logic to:
- `hooks/` — stateful logic
- `services/` — API calls, data fetching
- `utils/` — pure transformations

---

## Dependency Direction

```
┌─────────────────────────────────────────────────────────────┐
│                         PAGES                                │
│                    (route composition)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     FEATURES/*                               │
│              (domain-specific logic)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│     components/shared  │  components/ui  │  components/layout│
│                    (cross-domain UI)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│          utils  │  hooks  │  services  │  types             │
│                    (pure helpers)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## How to Split a Big Component

### Step 1: Extract Hooks

Before:
```tsx
// BigComponent.tsx (500 lines)
export function BigComponent() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);
  
  // ... 400 more lines
}
```

After:
```tsx
// hooks/useData.ts
export function useData() {
  const [data, setData] = useState(null);
  useEffect(() => { /* fetch */ }, []);
  return data;
}

// BigComponent.tsx (100 lines)
import { useData } from './hooks/useData';
export function BigComponent() {
  const data = useData();
  // ... composition only
}
```

### Step 2: Extract Sub-Components

```tsx
// components/DataTable.tsx
export function DataTable({ data }) { /* ... */ }

// components/DataFilters.tsx
export function DataFilters({ onFilter }) { /* ... */ }

// BigComponent.tsx
import { DataTable } from './components/DataTable';
import { DataFilters } from './components/DataFilters';
```

### Step 3: Extract Types

```tsx
// types/index.ts
export interface DataItem { id: string; name: string; }
export interface FilterOptions { /* ... */ }
```

### Step 4: Extract Utils

```tsx
// utils/dataTransformers.ts
export function sortData(data: DataItem[]): DataItem[] { /* ... */ }
export function filterData(data: DataItem[], query: string): DataItem[] { /* ... */ }
```

---

## Good vs Bad Examples

### ❌ BAD: Cross-domain import

```tsx
// src/features/bookings/components/BookingCard.tsx
import { UserAvatar } from '../../identity/components/UserAvatar'; // VIOLATION
```

### ✅ GOOD: Use shared component

```tsx
// src/components/shared/UserAvatar.tsx
export function UserAvatar({ userId }) { /* ... */ }

// src/features/bookings/components/BookingCard.tsx
import { UserAvatar } from '@/components/shared/UserAvatar'; // OK
```

### ❌ BAD: Business logic in component

```tsx
// Component.tsx
export function BookingList() {
  const [bookings, setBookings] = useState([]);
  
  useEffect(() => {
    getFirestore().collection('bookings').where(...).get().then(/* ... */);
  }, []);
  
  return <ul>{/* ... */}</ul>;
}
```

### ✅ GOOD: Extract to hook/service

```tsx
// hooks/useBookings.ts
export function useBookings() {
  return useQuery('bookings', () => bookingsService.getBookings());
}

// Component.tsx
export function BookingList() {
  const { data: bookings } = useBookings();
  return <ul>{/* ... */}</ul>;
}
```

---

## Incremental Migration Strategy

1. **Connect** — Move `pages/connect/*` and `components/admin/ConnectManager/*` to `features/connect/`
2. **Bookings** — Move `components/booking/*` to `features/bookings/`
3. **Requests** — Move request-related components to `features/requests/`
4. **Catalog** — Move `components/admin/CatalogManager/*` to `features/catalog/`
5. **Admin** — Move remaining admin components to `features/admin/`

Do NOT attempt a big-bang rewrite. Migrate one domain at a time.

---

## Enforcement

- **ESLint**: max-lines rule (300)
- **Audit Script**: `npm run audit:frontend`
- **CI**: Fails on hard violations

---

## Running the Audit

```bash
npm run audit:frontend
```

This generates: `docs/reports/frontend_modularity_report.md`
