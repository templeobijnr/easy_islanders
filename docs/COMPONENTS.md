# Components Index

> **Last Updated:** 2025-12-21

---

## What is a Component (in this repo)

A **component** is a `.tsx` file that exports a React UI unit.

- Components are building blocks that encapsulate UI and small UI logic.
- Business logic must live in `hooks/` or `services/`. Components call hooks and render UI.
- Most components are **functional**. Two are **class-based** (error boundaries).

### Component Types

| Type | Pattern | Example |
|------|---------|---------|
| Functional | `function X() { return <.../> }` | `src/components/layout/Navbar.tsx` |
| Functional (arrow) | `const X = () => <.../>` | `src/pages/home/Hero.tsx` |
| Class | `class X extends Component { render() {...} }` | `src/components/ErrorBoundary.tsx` |

### Real Examples from This Repo

- `Navbar.tsx` — layout navigation bar
- `BookingModal.tsx` — booking flow modal
- `ErrorBoundary.tsx` — class-based error boundary
- `AuthProvider` — context provider wrapping auth state

---

## Summary

| Metric | Count |
|--------|-------|
| **Total Components** | 97 |
| **Functional Components** | 95 |
| **Class Components** | 2 |
| **Non-standard Exports** | 0 |

---

## Class Components

| Name | Path | Notes |
|------|------|-------|
| ErrorBoundary | src/components/ErrorBoundary.tsx | Catches runtime errors |
| MapErrorBoundary | src/components/MapErrorBoundary.tsx | Map-specific error boundary |

---

## Provider / Context Components

| Name | Path | Notes |
|------|------|-------|
| AuthProvider | src/context/AuthContext.tsx | Firebase auth, claims, login/logout |
| LanguageProvider | src/context/LanguageContext.tsx | i18n translations |

---

## Layout Components

| Name | Path | Domain | Notes |
|------|------|--------|-------|
| AdminLayout | src/layouts/AdminLayout.tsx | admin | Admin route wrapper |
| ConsumerLayout | src/layouts/ConsumerLayout.tsx | core | Consumer routes with Navbar/Footer |
| Navbar | src/components/layout/Navbar.tsx | core | Top navigation |
| Footer | src/components/layout/Footer.tsx | core | Footer |
| Hero | src/components/layout/Hero.tsx | core | Landing hero |

---

## Page Components

| Name | Path | Domain | Notes |
|------|------|--------|-------|
| App | src/App.tsx | core | Root with routing |
| Connect | src/pages/connect/Connect.tsx | connect | Main Connect feed |
| Discover | src/pages/discover/index.tsx | catalog | Browsing page |
| Explore | src/pages/explore/Explore.tsx | catalog | Explore listings |
| AgentChat | src/pages/chat/AgentChat.tsx | agent | AI chat interface |
| AdminLogin | src/pages/admin/AdminLogin.tsx | admin | Admin login |
| MerveController | src/pages/admin/MerveController.tsx | admin | AI agent control |
| MapContentManagement | src/pages/admin/MapContentManagement.tsx | admin | Map data management |
| RequestsConsole | src/pages/admin/RequestsConsole.tsx | requests | Request management |
| MerchantEntry | src/pages/merchant/MerchantEntry.tsx | merchant | Merchant onboarding |
| MerchantJobs | src/pages/merchant/MerchantJobs.tsx | merchant | Merchant jobs |

---

## Dashboard Components

| Name | Path | Domain | Notes |
|------|------|--------|-------|
| BusinessDashboard | src/dashboard/BusinessDashboard.tsx | agent | Main dashboard shell |
| BusinessOnboarding | src/dashboard/BusinessOnboarding.tsx | agent | Onboarding wizard |
| BusinessOnboardingPage | src/dashboard/BusinessOnboardingPage.tsx | agent | Onboarding page |
| OverviewModule | src/dashboard/modules/OverviewModule.tsx | agent | Dashboard overview |
| ProfileModule | src/dashboard/modules/ProfileModule.tsx | agent | Business profile |
| OfferingsModule | src/dashboard/modules/OfferingsModule.tsx | catalog | Offerings management |
| ProductsModule | src/dashboard/modules/ProductsModule.tsx | catalog | Products management |
| CalendarModule | src/dashboard/modules/CalendarModule.tsx | bookings | Calendar/scheduling |
| InboxModule | src/dashboard/modules/InboxModule.tsx | agent | Messages inbox |
| CRMModule | src/dashboard/modules/CRMModule.tsx | agent | Customer relationship |
| EventsModule | src/dashboard/modules/EventsModule.tsx | connect | Events management |
| KnowledgeModule | src/dashboard/modules/KnowledgeModule.tsx | agent | Knowledge base |
| TeachAgentModule | src/dashboard/modules/TeachAgentModule.tsx | agent | Agent training |
| AgentSettingsModule | src/dashboard/modules/AgentSettingsModule.tsx | agent | Agent config |
| AgentTestChat | src/dashboard/modules/AgentTestChat.tsx | agent | Test chat |
| PerformanceTable | src/dashboard/modules/PerformanceTable.tsx | agent | Analytics table |
| DayDetailModal | src/dashboard/modules/DayDetailModal.tsx | bookings | Day details |
| KnowledgeSidebar | src/dashboard/modules/KnowledgeSidebar.tsx | agent | Knowledge sidebar |
| ClientDetailModal | src/dashboard/modules/crm/ClientDetailModal.tsx | agent | Client details |
| ImportWizard | src/dashboard/modules/crm/ImportWizard.tsx | agent | Data import |
| CreateActivityModal | src/dashboard/modules/events/CreateActivityModal.tsx | connect | Create activity |

---

## Dashboard Shared Components

| Name | Path | Notes |
|------|------|-------|
| ModuleHeader | src/dashboard/shared/ModuleHeader.tsx | Reusable module header |
| EventFormModal | src/dashboard/shared/EventFormModal.tsx | Event form |
| MenuFormModal | src/dashboard/shared/MenuFormModal.tsx | Menu form |
| ProductFormModal | src/dashboard/shared/ProductFormModal.tsx | Product form |
| PropertyFormModal | src/dashboard/shared/PropertyFormModal.tsx | Property form |
| ServiceFormModal | src/dashboard/shared/ServiceFormModal.tsx | Service form |
| VehicleFormModal | src/dashboard/shared/VehicleFormModal.tsx | Vehicle form |

---

## Admin Components

| Name | Path | Domain | Notes |
|------|------|--------|-------|
| ControlTower | src/components/admin/ControlTower.tsx | admin | Admin control panel |
| AdminManagement | src/components/admin/AdminManagement.tsx | admin | User management |
| BookingsDeck | src/components/admin/BookingsDeck.tsx | bookings | Bookings management |
| BookingMessagesModal | src/components/admin/BookingMessagesModal.tsx | bookings | Booking messages |
| Dashboard | src/components/admin/MissionControl/Dashboard.tsx | admin | Mission control |

---

## Catalog Manager Components

| Name | Path | Notes |
|------|------|-------|
| CatalogDeck | src/components/admin/CatalogManager/CatalogDeck.tsx | Catalog deck |
| ActivitiesList | src/components/admin/CatalogManager/ActivitiesList.tsx | Activities list |
| StaysList | src/components/admin/CatalogManager/StaysList.tsx | Stays list |
| UnifiedListingForm | src/components/admin/CatalogManager/UnifiedListingForm.tsx | Unified form |
| PricingBuilder | src/components/admin/CatalogManager/PricingBuilder.tsx | Pricing config |
| PlaceForm | src/components/admin/CatalogManager/Forms/PlaceForm.tsx | Place form |
| ActivityForm | src/components/admin/CatalogManager/Forms/ActivityForm.tsx | Activity form |
| EventForm | src/components/admin/CatalogManager/Forms/EventForm.tsx | Event form |
| ExperienceForm | src/components/admin/CatalogManager/Forms/ExperienceForm.tsx | Experience form |
| StayForm | src/components/admin/CatalogManager/Forms/StayForm.tsx | Stay form |

---

## Catalog Manager Section Components

| Name | Path |
|------|------|
| ActionsSection | src/components/admin/CatalogManager/sections/ActionsSection.tsx |
| BasicInfoSection | src/components/admin/CatalogManager/sections/BasicInfoSection.tsx |
| BookingOptionsSection | src/components/admin/CatalogManager/sections/BookingOptionsSection.tsx |
| ContactSection | src/components/admin/CatalogManager/sections/ContactSection.tsx |
| GoogleImportSection | src/components/admin/CatalogManager/sections/GoogleImportSection.tsx |
| HoursSection | src/components/admin/CatalogManager/sections/HoursSection.tsx |
| ImportModal | src/components/admin/CatalogManager/sections/ImportModal.tsx |
| ItemForm | src/components/admin/CatalogManager/sections/ItemForm.tsx |
| ItemsList | src/components/admin/CatalogManager/sections/ItemsList.tsx |
| LocationSection | src/components/admin/CatalogManager/sections/LocationSection.tsx |
| MediaSection | src/components/admin/CatalogManager/sections/MediaSection.tsx |
| MerveIntegrationSection | src/components/admin/CatalogManager/sections/MerveIntegrationSection.tsx |
| MerveToolIntegrationSection | src/components/admin/CatalogManager/sections/MerveToolIntegrationSection.tsx |
| OfferingsManager | src/components/admin/CatalogManager/sections/OfferingsManager.tsx |
| PricingSection | src/components/admin/CatalogManager/sections/PricingSection.tsx |
| ProposalReviewModal | src/components/admin/CatalogManager/sections/ProposalReviewModal.tsx |
| StayDetailsSection | src/components/admin/CatalogManager/sections/StayDetailsSection.tsx |

---

## Connect Manager Components

| Name | Path |
|------|------|
| CurationDeck | src/components/admin/ConnectManager/CurationDeck.tsx |
| LiveFeedDeck | src/components/admin/ConnectManager/LiveFeedDeck.tsx |
| ModerationDeck | src/components/admin/ConnectManager/ModerationDeck.tsx |
| PinsDeck | src/components/admin/ConnectManager/PinsDeck.tsx |
| AddCurationModal | src/components/admin/ConnectManager/AddCurationModal.tsx |

---

## Admin Shared Components

| Name | Path |
|------|------|
| ImageUploader | src/components/admin/Shared/ImageUploader.tsx |
| LocationPicker | src/components/admin/Shared/LocationPicker.tsx |
| MapMini | src/components/admin/Shared/MapMini.tsx |

---

## Connect Feature Components

| Name | Path | Notes |
|------|------|-------|
| FeedItemCard | src/pages/connect/FeedItemCard.tsx | Feed item display |
| ActivityCard | src/pages/connect/ActivityCard.tsx | Activity card |
| LiveVenueCard | src/pages/connect/LiveVenueCard.tsx | Live venue card |
| PassportCard | src/pages/connect/PassportCard.tsx | User passport |
| PulseBar | src/pages/connect/PulseBar.tsx | Activity pulse |
| Radar | src/pages/connect/Radar.tsx | Nearby radar |
| IslandMap | src/pages/connect/IslandMap.tsx | Island map |
| MapboxIslandMap | src/pages/connect/MapboxIslandMap.tsx | Mapbox implementation |
| MapBottomSheet | src/pages/connect/MapBottomSheet.tsx | Map bottom sheet |
| ActivityDetailModal | src/pages/connect/ActivityDetailModal.tsx | Activity details |
| EventDetailModal | src/pages/connect/EventDetailModal.tsx | Event details |
| GroupDetailView | src/pages/connect/GroupDetailView.tsx | Group details |
| CreateEventModal | src/pages/connect/CreateEventModal.tsx | Create event |
| StartActivityModal | src/pages/connect/StartActivityModal.tsx | Start activity |
| StampsModal | src/pages/connect/StampsModal.tsx | Stamps collection |

---

## Booking Components

| Name | Path | Notes |
|------|------|-------|
| ActivityBookingModule | src/pages/connect/ActivityBookingModule.tsx | Activity booking |
| EventBookingModule | src/pages/connect/EventBookingModule.tsx | Event booking |
| ExperienceBookingModule | src/pages/connect/ExperienceBookingModule.tsx | Experience booking |
| PinBookingModule | src/pages/connect/PinBookingModule.tsx | Pin booking |
| PlaceBookingModule | src/pages/connect/PlaceBookingModule.tsx | Place booking |
| StayBookingModule | src/pages/connect/StayBookingModule.tsx | Stay booking |
| BookingModal | src/components/booking/BookingModal.tsx | Booking modal |
| ProductDetailModal | src/components/booking/ProductDetailModal.tsx | Product details |

---

## Chat Components

| Name | Path | Notes |
|------|------|-------|
| AgentSelector | src/pages/chat/AgentSelector.tsx | Agent selection |
| ChatMap | src/pages/chat/ChatMap.tsx | Chat map |
| PaymentCard | src/pages/chat/cards/PaymentCard.tsx | Payment card |
| ReceiptCard | src/pages/chat/cards/ReceiptCard.tsx | Receipt card |
| RecommendationCard | src/pages/chat/cards/RecommendationCard.tsx | Recommendation |
| TaxiStatusCard | src/pages/chat/cards/TaxiStatusCard.tsx | Taxi status |
| WhatsAppStatusCard | src/pages/chat/cards/WhatsAppStatusCard.tsx | WhatsApp status |

---

## Explore Components

| Name | Path |
|------|------|
| CollectionBanner | src/pages/explore/CollectionBanner.tsx |
| FilterBar | src/pages/explore/FilterBar.tsx |

---

## Home Components

| Name | Path |
|------|------|
| AboutSection | src/pages/home/AboutSection.tsx |
| FeaturedDestinations | src/pages/home/FeaturedDestinations.tsx |
| FeaturedStays | src/pages/home/FeaturedStays.tsx |
| Hero | src/pages/home/Hero.tsx |
| LifestyleHighlights | src/pages/home/LifestyleHighlights.tsx |
| TrendingConnect | src/pages/home/TrendingConnect.tsx |
| ValueProps | src/pages/home/ValueProps.tsx |

---

## Auth Components

| Name | Path | Notes |
|------|------|-------|
| AuthModal | src/auth/AuthModal.tsx | Consumer auth modal |
| AdminAuthModal | src/auth/AdminAuthModal.tsx | Admin auth modal |
| authBootstrap | src/auth/authBootstrap.tsx | Auth initialization |

---

## Other Components

| Name | Path | Notes |
|------|------|-------|
| TaxiStatusCard | src/components/TaxiStatusCard.tsx | Taxi tracking |
| ListingCard | src/components/shared/ListingCard.tsx | Generic listing card |
| MessagesView | src/components/consumer/MessagesView.tsx | Messages view |
| BusinessChatWidget | src/components/business/BusinessChatWidget.tsx | Business chat |
| SettingsView | src/components/settings/SettingsView.tsx | Settings page |
| ProfileView | src/components/profile/ProfileView.tsx | User profile |
| Storefront | src/components/storefront/Storefront.tsx | Storefront page |

---

## Folder Structure (Current)

```
src/
├── App.tsx
├── index.tsx
├── auth/                      # Auth components
├── components/
│   ├── admin/                 # Admin feature components
│   │   ├── CatalogManager/
│   │   ├── ConnectManager/
│   │   ├── DiscoverManager/
│   │   ├── MissionControl/
│   │   └── Shared/
│   ├── booking/
│   ├── business/
│   ├── consumer/
│   ├── layout/                # Navbar, Footer, Hero
│   ├── profile/
│   ├── settings/
│   ├── shared/
│   └── storefront/
├── context/                   # React Context providers
├── dashboard/
│   ├── modules/
│   │   ├── crm/
│   │   └── events/
│   └── shared/
├── layouts/                   # Route layout wrappers
└── pages/
    ├── admin/
    ├── chat/
    │   └── cards/
    ├── connect/
    ├── discover/
    ├── explore/
    ├── home/
    └── merchant/
```

---

## Recommended Canonical Structure

```
src/
├── components/
│   ├── ui/                    # Primitives (Button, Card, Modal)
│   ├── shared/                # Cross-domain reusable
│   └── layout/                # Navbar, Footer, shells
├── features/
│   ├── admin/
│   ├── agent/
│   ├── bookings/
│   ├── catalog/
│   ├── connect/
│   ├── identity/
│   └── requests/
├── pages/                     # Route-level screens
├── context/                   # Context providers
└── layouts/                   # Route wrappers
```

---

## Rules (Guardrails)

1. **Placement** — New components go in the correct folder based on category.
2. **No cross-domain imports** — Domain components must not import other domain components. Use `shared/` or `ui/` only.
3. **No business logic** — Components render UI and call hooks. Logic lives in `services/` or `hooks/`.
4. **Single export** — Each file exports one primary component.
5. **Naming** — File name matches component name: `BookingModal.tsx` exports `BookingModal`.
6. **Keep small** — Extract complex logic to hooks or helper functions.

---

## Good vs Bad Examples

### Good Component

```tsx
// src/pages/connect/FeedItemCard.tsx
import { useFeedItem } from '@/hooks/useFeedItem';

export default function FeedItemCard({ itemId }: { itemId: string }) {
  const { item, isLoading } = useFeedItem(itemId);

  if (isLoading) return <Skeleton />;
  if (!item) return null;

  return (
    <div className="card">
      <img src={item.image} alt={item.title} />
      <h3>{item.title}</h3>
      <p>{item.description}</p>
    </div>
  );
}
```

**Why good:**
- Calls a hook for data
- Renders UI only
- No Firestore calls
- Small and focused

---

### Bad Component

```tsx
// DON'T DO THIS
export default function FeedItemCard({ itemId }: { itemId: string }) {
  const [item, setItem] = useState(null);

  useEffect(() => {
    // BAD: Direct Firestore call in component
    const docRef = doc(db, 'feedItems', itemId);
    getDoc(docRef).then(snap => {
      setItem(snap.data());
      // BAD: Business logic in component
      updateDoc(docRef, { viewCount: increment(1) });
    });
  }, [itemId]);

  // BAD: 500 lines of mixed UI + logic
  // ...
}
```

**Why bad:**
- Firestore calls belong in a service or hook
- Business logic (view count) belongs in a service
- Component is doing too much

---

## Unused Candidates

No unused components identified. All components are imported.

---

## Audit Metadata

- **Date:** 2025-12-21
- **Method:** AST analysis, grep search
- **Excluded:** `*.test.tsx`, `*.stories.tsx`
