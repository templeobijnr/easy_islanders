# Frontend Modularity Report

Generated: 2025-12-21

## Summary

| Metric | Value |
|--------|-------|
| Total files scanned | 372 |
| React components | 4 |
| Files over 300 lines | 38 |
| Hard violations | 39 |
| Soft warnings | 1 |

---

## Top 20 Largest Files

| # | File | Lines |
|---|------|-------|
| 1 | pages/connect/StayBookingModule.tsx | 661 |
| 2 | pages/connect/StartActivityModal.tsx | 639 |
| 3 | components/consumer/MessagesView.tsx | 627 |
| 4 | dashboard/BusinessOnboarding.tsx | 606 |
| 5 | pages/connect/PinBookingModule.tsx | 534 |
| 6 | pages/admin/MapContentManagement.tsx | 520 |
| 7 | pages/connect/MapboxIslandMap.tsx | 513 |
| 8 | dashboard/modules/ProfileModule.tsx | 484 |
| 9 | components/admin/DiscoverManager/DiscoverControlDeck.tsx | 456 |
| 10 | pages/chat/AgentChat.tsx | 450 |
| 11 | dashboard/shared/EventFormModal.tsx | 446 |
| 12 | dashboard/BusinessDashboard.tsx | 433 |
| 13 | dashboard/modules/OverviewModule.tsx | 432 |
| 14 | dashboard/modules/ProductsModule.tsx | 429 |
| 15 | pages/admin/MerveController.tsx | 406 |
| 16 | services/discoverConfigService.ts | 389 |
| 17 | dashboard/modules/CRMModule.tsx | 377 |
| 18 | pages/explore/Explore.tsx | 367 |
| 19 | dashboard/modules/InboxModule.tsx | 365 |
| 20 | dashboard/modules/events/CreateActivityModal.tsx | 364 |

---

## Files Exceeding 300-Line Limit



### pages/connect/StayBookingModule.tsx (661 lines)

**Recommended splits:**
- Extract hooks to `pages/connect/hooks/`
- Extract sub-components to `pages/connect/components/`
- Extract types to `pages/connect/types.ts`

### pages/connect/StartActivityModal.tsx (639 lines)

**Recommended splits:**
- Extract hooks to `pages/connect/hooks/`
- Extract sub-components to `pages/connect/components/`
- Extract types to `pages/connect/types.ts`

### components/consumer/MessagesView.tsx (627 lines)

**Recommended splits:**
- Extract hooks to `components/consumer/hooks/`
- Extract sub-components to `components/consumer/components/`
- Extract types to `components/consumer/types.ts`

### dashboard/BusinessOnboarding.tsx (606 lines)

**Recommended splits:**
- Extract hooks to `dashboard/hooks/`
- Extract sub-components to `dashboard/components/`
- Extract types to `dashboard/types.ts`

### pages/connect/PinBookingModule.tsx (534 lines)

**Recommended splits:**
- Extract hooks to `pages/connect/hooks/`
- Extract sub-components to `pages/connect/components/`
- Extract types to `pages/connect/types.ts`

### pages/admin/MapContentManagement.tsx (520 lines)

**Recommended splits:**
- Extract hooks to `pages/admin/hooks/`
- Extract sub-components to `pages/admin/components/`
- Extract types to `pages/admin/types.ts`

### pages/connect/MapboxIslandMap.tsx (513 lines)

**Recommended splits:**
- Extract hooks to `pages/connect/hooks/`
- Extract sub-components to `pages/connect/components/`
- Extract types to `pages/connect/types.ts`

### dashboard/modules/ProfileModule.tsx (484 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/hooks/`
- Extract sub-components to `dashboard/modules/components/`
- Extract types to `dashboard/modules/types.ts`

### components/admin/DiscoverManager/DiscoverControlDeck.tsx (456 lines)

**Recommended splits:**
- Extract hooks to `components/admin/DiscoverManager/hooks/`
- Extract sub-components to `components/admin/DiscoverManager/components/`
- Extract types to `components/admin/DiscoverManager/types.ts`

### pages/chat/AgentChat.tsx (450 lines)

**Recommended splits:**
- Extract hooks to `pages/chat/hooks/`
- Extract sub-components to `pages/chat/components/`
- Extract types to `pages/chat/types.ts`

### dashboard/shared/EventFormModal.tsx (446 lines)

**Recommended splits:**
- Extract hooks to `dashboard/shared/hooks/`
- Extract sub-components to `dashboard/shared/components/`
- Extract types to `dashboard/shared/types.ts`

### dashboard/BusinessDashboard.tsx (433 lines)

**Recommended splits:**
- Extract hooks to `dashboard/hooks/`
- Extract sub-components to `dashboard/components/`
- Extract types to `dashboard/types.ts`

### dashboard/modules/OverviewModule.tsx (432 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/hooks/`
- Extract sub-components to `dashboard/modules/components/`
- Extract types to `dashboard/modules/types.ts`

### dashboard/modules/ProductsModule.tsx (429 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/hooks/`
- Extract sub-components to `dashboard/modules/components/`
- Extract types to `dashboard/modules/types.ts`

### pages/admin/MerveController.tsx (406 lines)

**Recommended splits:**
- Extract hooks to `pages/admin/hooks/`
- Extract sub-components to `pages/admin/components/`
- Extract types to `pages/admin/types.ts`

### services/discoverConfigService.ts (389 lines)

**Recommended splits:**
- Extract hooks to `services/hooks/`
- Extract sub-components to `services/components/`
- Extract types to `services/types.ts`

### dashboard/modules/CRMModule.tsx (377 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/hooks/`
- Extract sub-components to `dashboard/modules/components/`
- Extract types to `dashboard/modules/types.ts`

### pages/explore/Explore.tsx (367 lines)

**Recommended splits:**
- Extract hooks to `pages/explore/hooks/`
- Extract sub-components to `pages/explore/components/`
- Extract types to `pages/explore/types.ts`

### dashboard/modules/InboxModule.tsx (365 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/hooks/`
- Extract sub-components to `dashboard/modules/components/`
- Extract types to `dashboard/modules/types.ts`

### dashboard/modules/events/CreateActivityModal.tsx (364 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/events/hooks/`
- Extract sub-components to `dashboard/modules/events/components/`
- Extract types to `dashboard/modules/events/types.ts`

### services/integrations/google/google-import.client.ts (361 lines)

**Recommended splits:**
- Extract hooks to `services/integrations/google/hooks/`
- Extract sub-components to `services/integrations/google/components/`
- Extract types to `services/integrations/google/types.ts`

### pages/merchant/MerchantJobs.tsx (359 lines)

**Recommended splits:**
- Extract hooks to `pages/merchant/hooks/`
- Extract sub-components to `pages/merchant/components/`
- Extract types to `pages/merchant/types.ts`

### dashboard/modules/EventsModule.tsx (355 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/hooks/`
- Extract sub-components to `dashboard/modules/components/`
- Extract types to `dashboard/modules/types.ts`

### types/UnifiedListing.ts (349 lines)

**Recommended splits:**
- Extract hooks to `types/hooks/`
- Extract sub-components to `types/components/`
- Extract types to `types/types.ts`

### services/domains/gamification/stamps.service.ts (340 lines)

**Recommended splits:**
- Extract hooks to `services/domains/gamification/hooks/`
- Extract sub-components to `services/domains/gamification/components/`
- Extract types to `services/domains/gamification/types.ts`

### components/admin/CatalogManager/unifiedListingForm.constants.ts (338 lines)

**Recommended splits:**
- Extract hooks to `components/admin/CatalogManager/hooks/`
- Extract sub-components to `components/admin/CatalogManager/components/`
- Extract types to `components/admin/CatalogManager/types.ts`

### components/constants/translations.ts (338 lines)

**Recommended splits:**
- Extract hooks to `components/constants/hooks/`
- Extract sub-components to `components/constants/components/`
- Extract types to `components/constants/types.ts`

### types/adminConfig.ts (337 lines)

**Recommended splits:**
- Extract hooks to `types/hooks/`
- Extract sub-components to `types/components/`
- Extract types to `types/types.ts`

### components/admin/BookingsDeck.tsx (334 lines)

**Recommended splits:**
- Extract hooks to `components/admin/hooks/`
- Extract sub-components to `components/admin/components/`
- Extract types to `components/admin/types.ts`

### App.tsx (333 lines)

**Recommended splits:**
- Extract hooks to `./hooks/`
- Extract sub-components to `./components/`
- Extract types to `./types.ts`

### components/admin/CatalogManager/CatalogDeck.tsx (325 lines)

**Recommended splits:**
- Extract hooks to `components/admin/CatalogManager/hooks/`
- Extract sub-components to `components/admin/CatalogManager/components/`
- Extract types to `components/admin/CatalogManager/types.ts`

### utils/LocationNormalizer.ts (318 lines)

**Recommended splits:**
- Extract hooks to `utils/hooks/`
- Extract sub-components to `utils/components/`
- Extract types to `utils/types.ts`

### components/profile/ProfileView.tsx (315 lines)

**Recommended splits:**
- Extract hooks to `components/profile/hooks/`
- Extract sub-components to `components/profile/components/`
- Extract types to `components/profile/types.ts`

### dashboard/modules/OfferingsModule.tsx (311 lines)

**Recommended splits:**
- Extract hooks to `dashboard/modules/hooks/`
- Extract sub-components to `dashboard/modules/components/`
- Extract types to `dashboard/modules/types.ts`

### components/booking/BookingModal.tsx (310 lines)

**Recommended splits:**
- Extract hooks to `components/booking/hooks/`
- Extract sub-components to `components/booking/components/`
- Extract types to `components/booking/types.ts`

### dashboard/shared/MenuFormModal.tsx (308 lines)

**Recommended splits:**
- Extract hooks to `dashboard/shared/hooks/`
- Extract sub-components to `dashboard/shared/components/`
- Extract types to `dashboard/shared/types.ts`

### components/admin/CatalogManager/Forms/PlaceForm/PlaceForm.tsx (304 lines)

**Recommended splits:**
- Extract hooks to `components/admin/CatalogManager/Forms/PlaceForm/hooks/`
- Extract sub-components to `components/admin/CatalogManager/Forms/PlaceForm/components/`
- Extract types to `components/admin/CatalogManager/Forms/PlaceForm/types.ts`

### dashboard/shared/ServiceFormModal.tsx (304 lines)

**Recommended splits:**
- Extract hooks to `dashboard/shared/hooks/`
- Extract sub-components to `dashboard/shared/components/`
- Extract types to `dashboard/shared/types.ts`


---

## Hard Violations

- **App.tsx**: Exceeds 300-line limit: 333 lines
- **components/admin/BookingsDeck.tsx**: Exceeds 300-line limit: 334 lines
- **components/admin/CatalogManager/CatalogDeck.tsx**: Exceeds 300-line limit: 325 lines
- **components/admin/CatalogManager/Forms/PlaceForm/PlaceForm.tsx**: Exceeds 300-line limit: 304 lines
- **components/admin/CatalogManager/unifiedListingForm.constants.ts**: Exceeds 300-line limit: 338 lines
- **components/admin/DiscoverManager/DiscoverControlDeck.tsx**: Exceeds 300-line limit: 456 lines
- **components/booking/BookingModal.tsx**: Exceeds 300-line limit: 310 lines
- **components/constants/translations.ts**: Exceeds 300-line limit: 338 lines
- **components/consumer/MessagesView.tsx**: Exceeds 300-line limit: 627 lines
- **components/profile/ProfileView.tsx**: Exceeds 300-line limit: 315 lines
- **dashboard/BusinessDashboard.tsx**: Exceeds 300-line limit: 433 lines
- **dashboard/BusinessOnboarding.tsx**: Exceeds 300-line limit: 606 lines
- **dashboard/modules/CRMModule.tsx**: Exceeds 300-line limit: 377 lines
- **dashboard/modules/EventsModule.tsx**: Exceeds 300-line limit: 355 lines
- **dashboard/modules/InboxModule.tsx**: Exceeds 300-line limit: 365 lines
- **dashboard/modules/OfferingsModule.tsx**: Exceeds 300-line limit: 311 lines
- **dashboard/modules/OverviewModule.tsx**: Exceeds 300-line limit: 432 lines
- **dashboard/modules/ProductsModule.tsx**: Exceeds 300-line limit: 429 lines
- **dashboard/modules/ProfileModule.tsx**: Exceeds 300-line limit: 484 lines
- **dashboard/modules/events/CreateActivityModal.tsx**: Exceeds 300-line limit: 364 lines
- **dashboard/shared/EventFormModal.tsx**: Exceeds 300-line limit: 446 lines
- **dashboard/shared/MenuFormModal.tsx**: Exceeds 300-line limit: 308 lines
- **dashboard/shared/ServiceFormModal.tsx**: Exceeds 300-line limit: 304 lines
- **pages/admin/MapContentManagement.tsx**: Exceeds 300-line limit: 520 lines
- **pages/admin/MerveController.tsx**: Exceeds 300-line limit: 406 lines
- **pages/chat/AgentChat.tsx**: Exceeds 300-line limit: 450 lines
- **pages/connect/EventDetailModal/types.ts**: Cross-domain import: Imports from pages/types: ../../types/connect
- **pages/connect/MapboxIslandMap.tsx**: Exceeds 300-line limit: 513 lines
- **pages/connect/PinBookingModule.tsx**: Exceeds 300-line limit: 534 lines
- **pages/connect/StartActivityModal.tsx**: Exceeds 300-line limit: 639 lines
- **pages/connect/StayBookingModule.tsx**: Exceeds 300-line limit: 661 lines
- **pages/explore/Explore.tsx**: Exceeds 300-line limit: 367 lines
- **pages/merchant/MerchantJobs.tsx**: Exceeds 300-line limit: 359 lines
- **services/discoverConfigService.ts**: Exceeds 300-line limit: 389 lines
- **services/domains/gamification/stamps.service.ts**: Exceeds 300-line limit: 340 lines
- **services/integrations/google/google-import.client.ts**: Exceeds 300-line limit: 361 lines
- **types/UnifiedListing.ts**: Exceeds 300-line limit: 349 lines
- **types/adminConfig.ts**: Exceeds 300-line limit: 337 lines
- **utils/LocationNormalizer.ts**: Exceeds 300-line limit: 318 lines

---

## Soft Warnings (Business Logic in Components)

- components/business/BusinessChatWidget.tsx

---

## Domain Migration Plan

1. **Connect** — `pages/connect/*`, `components/admin/ConnectManager/*` → `features/connect/`
2. **Bookings** — `components/booking/*` → `features/bookings/`
3. **Requests** — Request components → `features/requests/`
4. **Catalog** — `components/admin/CatalogManager/*` → `features/catalog/`
5. **Admin** — Remaining admin components → `features/admin/`

---

## Next Steps

1. Fix all files exceeding 300-line limit
2. Resolve cross-domain import violations
3. Migrate one domain at a time (start with Connect)
4. Move business logic from components to hooks/services
