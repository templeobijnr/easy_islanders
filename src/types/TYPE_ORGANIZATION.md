# Type Organization Guide - Easy Islanders

## Philosophy

Following industry best practices for TypeScript monorepo organization:

1. **Shared types** go in `/types` - used across frontend and backend
2. **Colocated types** stay with their modules - single-use component props
3. **Domain-driven structure** - types organized by business domain

## Current Type Files

### Core Domains

#### `auth.ts`
User authentication and authorization types
- User, AuthState, LoginCredentials, etc.

#### `marketplace.ts`
Marketplace listings and search types
- Listing, SearchParams, ListingCategory, etc.

#### `booking.ts`
General booking types (hotels, rentals, experiences)
- Booking, BookingStatus, TimeSlot, etc.

#### `social.ts`
Social features and community
- SocialUser, SocialPost, PassportStamp, HotZone, etc.

#### `chat.ts`
AI chat and conversation types
- ChatMessage, ChatSession, etc.

#### `crm.ts`
Customer relationship management
- Lead, Contact, Deal, etc.

#### `business.ts`
Business and vendor types
- Business, Vendor, etc.

#### `agent.ts`
AI agent configuration and tools
- AgentConfig, Tool, etc.

#### `enums.ts`
Shared enum types across the app
- Status values, categories, etc.

---

## New Type Files (City OS Integration)

### `notifications.ts` 🆕
Multi-channel notification system
- Notification, NotificationPayload, NotificationChannel
- NotificationPreferences, PushToken

### `messaging.ts` 🆕
WhatsApp and messaging types
- WhatsAppMessage, MessageThread, MessageStatus
- VendorReply, MessageCategory

### `dispatch.ts` 🆕
Taxi/Grocery/Service dispatch system
- TaxiBooking, GroceryOrder, ServiceRequest
- DispatchStatus, VendorResponse

### `intelligence.ts` ��
AI intelligence and context types
- IntelligenceProfile, UserContext, ConversationMemory

### `locations.ts` 🆕
Location and GPS types
- Location, Coordinates, Place, Area

---

## Type Import Strategy

### Frontend (React/React Native)
```typescript
// Import from shared types
import { User, Listing, Notification } from '@/types';

// Component-specific types stay colocated
interface ProfileCardProps {
  user: User;
  onEdit: () => void;
}
```

### Backend (Firebase Functions)
```typescript
// Import from shared types
import { TaxiBooking, WhatsAppMessage } from '../types';

// Service-specific types stay colocated
interface DispatchResult {
  success: boolean;
  bookingId: string;
}
```

### Shared Utilities
```typescript
// Both frontend and backend can import
import { NotificationChannel, MessageStatus } from '@/types';
```

---

## Naming Conventions

### Interfaces vs Types
- **Interfaces** for object shapes that can be extended
- **Types** for unions, intersections, or primitives

```typescript
// Interface - can be extended
export interface User {
  id: string;
  name: string;
}

// Type - union or primitive
export type UserRole = 'admin' | 'user' | 'vendor';
export type NotificationChannel = 'whatsapp' | 'push' | 'email';
```

### Naming Patterns
- PascalCase for interfaces and types
- Descriptive, domain-specific names
- Avoid generic names like `Data`, `Item`, `Thing`

```typescript
// Good
export interface TaxiBooking { }
export type BookingStatus = 'pending' | 'confirmed';

// Avoid
export interface Booking { } // Too generic
export type Status = string; // Not specific
```

---

## File Structure

Each type file should follow this structure:

```typescript
/**
 * Domain Name Types
 * Description of what this file contains
 */

// 1. Simple types and enums
export type Status = 'active' | 'inactive';

// 2. Base interfaces
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

// 3. Main domain interfaces
export interface DomainEntity extends BaseEntity {
  // ... properties
}

// 4. Related/nested types
export interface DomainMetadata {
  // ... properties
}

// 5. Helper types
export type DomainFilters = Pick<DomainEntity, 'status' | 'category'>;
```

---

## Index File

Create `/types/index.ts` to export all types:

```typescript
// Auth
export * from './auth';

// Marketplace
export * from './marketplace';
export * from './booking';

// Social
export * from './social';

// Messaging & Notifications
export * from './notifications';
export * from './messaging';

// Dispatch System
export * from './dispatch';

// Utilities
export * from './enums';
export * from './locations';
```

---

## Best Practices

### 1. DRY (Don't Repeat Yourself)
```typescript
// Bad - repeated properties
interface TaxiBooking {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
}

interface GroceryOrder {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
}

// Good - extend base
interface BaseBooking {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: string;
}

interface TaxiBooking extends BaseBooking {
  // Taxi-specific properties
}

interface GroceryOrder extends BaseBooking {
  // Grocery-specific properties
}
```

### 2. Use Utility Types
```typescript
// Pick specific properties
type UserPreview = Pick<User, 'id' | 'name' | 'avatar'>;

// Make properties optional
type PartialUser = Partial<User>;

// Make properties required
type RequiredBooking = Required<Booking>;

// Omit properties
type UserWithoutPassword = Omit<User, 'password'>;
```

### 3. Union Types for Flexibility
```typescript
// Union of literal types
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

// Union of interfaces
export type Booking = TaxiBooking | GroceryOrder | ServiceRequest;

// Discriminated unions
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

### 4. Generic Types for Reusability
```typescript
// Generic list response
export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Usage
const users: ListResponse<User> = { ... };
const bookings: ListResponse<TaxiBooking> = { ... };
```

---

## Migration Checklist

- [x] Audit existing type files
- [ ] Create missing type files (notifications, messaging, dispatch)
- [ ] Create index.ts for centralized exports
- [ ] Update imports across codebase to use centralized types
- [ ] Remove duplicate type definitions
- [ ] Add JSDoc comments to complex types
- [ ] Set up type validation with Zod (optional)

---

## Future Enhancements

1. **Runtime Validation**: Use Zod for runtime type checking
2. **Auto-generated Types**: Generate types from Firestore schema
3. **Type Guards**: Create type guard functions for unions
4. **Documentation**: Auto-generate type documentation with TypeDoc
