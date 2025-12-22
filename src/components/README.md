# Components

This directory contains React components organized by function.

---

## What is `src/components/`

This folder holds reusable UI building blocks:

- **layout/** — Navbar, Footer, Hero
- **shared/** — Cross-domain components (ListingCard)
- **admin/** — Admin-only feature components
- **booking/** — Booking flow components
- **business/** — Business dashboard widgets
- **consumer/** — Consumer-facing components
- **profile/** — User profile components
- **settings/** — Settings components
- **storefront/** — Storefront components

---

## Folder Structure

```
components/
├── admin/
│   ├── CatalogManager/
│   ├── ConnectManager/
│   ├── DiscoverManager/
│   ├── MissionControl/
│   └── Shared/
├── booking/
├── business/
├── consumer/
├── layout/
├── profile/
├── settings/
├── shared/
└── storefront/
```

---

## Rules

1. **Placement** — Put new components in the correct folder.
2. **No cross-domain imports** — Feature components must not import from other feature folders. Use `shared/` or `layout/` instead.
3. **Single export** — Each file exports one primary component.
4. **No business logic** — Components call hooks and render UI. Logic lives in `services/` or `hooks/`.
5. **Keep small** — Extract complex logic to hooks.
6. **Naming** — File name matches component name: `BookingModal.tsx` exports `BookingModal`.

---

## How to Add a Component

1. Decide the category (shared, layout, feature, etc.).
2. Choose the correct folder.
3. Create `MyComponent.tsx`.
4. Export the component as default.
5. Import utilities from `@/utils` or `@/hooks`.
6. Do not add Firestore or business logic — use a hook or service.

---

## See Also

- Full inventory: `docs/COMPONENTS.md`
