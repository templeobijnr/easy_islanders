# Easy Islanders - Type System

Professional TypeScript type organization for the entire Easy Islanders monorepo.

## Quick Start

### Import Types

```typescript
// Import from centralized index
import {
  User,
  Listing,
  TaxiBooking,
  Notification,
  WhatsAppMessage
} from '@/types';

// Or import specific domains
import { TaxiBooking, GroceryOrder } from '@/types/dispatch';
import { NotificationChannel } from '@/types/notifications';
```

## Type Files Overview

### Existing Types

| File | Domain | Key Types |
|------|--------|-----------|
| `auth.ts` | Authentication | `User`, `AuthState`, `LoginCredentials` |
| `marketplace.ts` | Listings | `Listing`, `SearchParams`, `ListingCategory` |
| `booking.ts` | Bookings | `Booking`, `BookingStatus`, `TimeSlot` |
| `social.ts` | Social | `SocialUser`, `SocialPost`, `PassportStamp` |
| `chat.ts` | AI Chat | `ChatMessage`, `ChatSession` |
| `agent.ts` | AI Agent | `AgentConfig`, `Tool` |
| `business.ts` | Business | `Business`, `Vendor` |
| `crm.ts` | CRM | `Lead`, `Contact`, `Deal` |
| `enums.ts` | Shared Enums | Status values, categories |

### New Types (City OS)

| File | Domain | Key Types |
|------|--------|-----------|
| **`dispatch.ts`** | Dispatch System | `TaxiBooking`, `GroceryOrder`, `ServiceRequest` |
| **`notifications.ts`** | Notifications | `Notification`, `NotificationPayload`, `PushToken` |
| **`messaging.ts`** | Messaging | `WhatsAppMessage`, `MessageThread`, `VendorReplyMatch` |
| **`locations.ts`** | Geography | `Coordinates`, `Place`, `Area`, `RouteInfo` |

## Usage Examples

### Taxi Dispatch

```typescript
import { TaxiBooking, DispatchResult, Coordinates } from '@/types';

const booking: TaxiBooking = {
  id: 'TAXI-123',
  userId: 'user-456',
  customerName: 'John Doe',
  customerContact: 'whatsapp:+1234567890',
  pickupLocation: 'Kyrenia Marina',
  pickupLat: 35.3369,
  pickupLng: 33.3249,
  destination: 'Bellapais Abbey',
  status: 'pending',
  taxiListingId: 'taxi-listing-1',
  taxiTitle: 'Kyrenia Premium Taxi',
  taxiDetails: {
    title: 'Kyrenia Premium Taxi',
    vehicleModel: 'Mercedes GLC',
    vehicleColor: 'Black',
    plateNumber: 'KYR-777',
    vehicleType: 'SUV',
    capacity: 4,
    rating: 4.9,
    phone: 'whatsapp:+905488639394'
  },
  createdAt: new Date().toISOString()
};
```

### Notifications

```typescript
import { NotificationPayload, NotificationChannel } from '@/types';

const notification: NotificationPayload = {
  userId: 'user-123',
  title: 'Taxi Confirmed!',
  body: 'Your taxi will arrive in 5 minutes',
  type: 'booking_confirmed',
  priority: 'high',
  channels: ['whatsapp', 'push', 'chat'],
  relatedTo: {
    collection: 'taxiBookings',
    id: 'TAXI-123'
  }
};
```

### WhatsApp Messages

```typescript
import { WhatsAppMessage, MessageDirection, MessageType } from '@/types';

const message: WhatsAppMessage = {
  id: 'msg-123',
  from: 'whatsapp:+905488639394',
  to: 'whatsapp:+1234567890',
  body: 'OK, 5 minutes',
  direction: 'inbound',
  messageSid: 'SM1234567890',
  status: 'delivered',
  messageType: 'vendor_reply',
  sender: {
    type: 'vendor',
    vendorPhone: '+905488639394',
    vendorName: 'Kyrenia Premium Taxi'
  },
  relatedTo: {
    collection: 'taxiBookings',
    id: 'TAXI-123'
  },
  receivedAt: new Date().toISOString()
};
```

### Location Handling

```typescript
import { Coordinates, Place, RouteInfo } from '@/types';

const pickup: Place = {
  name: 'Kyrenia Marina',
  address: 'Kyrenia Harbor, Kyrenia, Cyprus',
  coordinates: {
    lat: 35.3369,
    lng: 33.3249
  },
  placeId: 'ChIJ...',
  category: 'landmark'
};

const route: RouteInfo = {
  distance: 5200, // meters
  duration: 720, // seconds
  distanceText: '5.2 km',
  durationText: '12 mins'
};
```

## Type Utilities

### Filtering

```typescript
import { TaxiBooking, DispatchFilters } from '@/types';

const filters: DispatchFilters = {
  status: ['pending', 'confirmed'],
  userId: 'user-123',
  startDate: '2025-11-01',
  limit: 10
};
```

### Type Guards

```typescript
import { WhatsAppMessage } from '@/types';

function isVendorReply(msg: WhatsAppMessage): boolean {
  return msg.direction === 'inbound' &&
         msg.sender.type === 'vendor' &&
         !!msg.relatedTo;
}
```

### Partial Updates

```typescript
import { TaxiBooking } from '@/types';

type TaxiBookingUpdate = Partial<Pick<TaxiBooking, 'status' | 'driverLastMessage'>>;

const update: TaxiBookingUpdate = {
  status: 'confirmed',
  driverLastMessage: 'OK, 5 minutes'
};
```

## Best Practices

### 1. Always Import from Index

```typescript
// ✅ Good - centralized import
import { User, Listing } from '@/types';

// ❌ Avoid - direct file import
import { User } from '@/types/auth';
```

### 2. Use Const Enums for Fixed Values

```typescript
import { CyprusAreas } from '@/types/locations';

const area = CyprusAreas.KYRENIA; // Type-safe!
```

### 3. Extend Base Types

```typescript
import { BaseDispatch } from '@/types/dispatch';

interface CustomBooking extends BaseDispatch {
  customField: string;
}
```

### 4. Use Utility Types

```typescript
import { Notification } from '@/types';

// Pick specific fields
type NotificationPreview = Pick<Notification, 'id' | 'title' | 'body'>;

// Make optional
type PartialNotification = Partial<Notification>;

// Omit fields
type NotificationWithoutMetadata = Omit<Notification, 'createdAt' | 'updatedAt'>;
```

## Type Safety Tips

### Discriminated Unions

```typescript
import { TaxiBooking, GroceryOrder, ServiceRequest } from '@/types';

type AnyBooking = TaxiBooking | GroceryOrder | ServiceRequest;

function processBooking(booking: AnyBooking) {
  if ('pickupLocation' in booking) {
    // TypeScript knows this is TaxiBooking
    console.log(booking.taxiDetails);
  }
}
```

### Generic Functions

```typescript
import { Notification, WhatsAppMessage } from '@/types';

function getLatest<T extends { createdAt: string }>(items: T[]): T | null {
  return items.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )[0] || null;
}

const latestNotif = getLatest<Notification>(notifications);
const latestMsg = getLatest<WhatsAppMessage>(messages);
```

## Migration Guide

If you have existing types scattered in your codebase:

1. **Find duplicate types**:
   ```bash
   grep -r "interface.*Booking" src/
   ```

2. **Move to centralized types**:
   - Copy to appropriate file in `/types`
   - Update imports across codebase
   - Delete old type definitions

3. **Update import paths**:
   ```bash
   # Find all imports
   grep -r "from.*types" src/
   ```

## Documentation

For detailed information, see:
- [TYPE_ORGANIZATION.md](./TYPE_ORGANIZATION.md) - Organization philosophy and guidelines
- [NOTIFICATION_SYSTEM_IMPLEMENTATION.md](../NOTIFICATION_SYSTEM_IMPLEMENTATION.md) - Notification system architecture

## Support

For questions or suggestions about type organization, check the guides above or create an issue.
