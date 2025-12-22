# Catalog Manager / CatalogDeck Refactor Plan

This document describes the target structure and phased refactor plan for the
admin Catalog Manager. The goal is to:

- Separate concerns by content type (stays, activities, events, places, experiences).
- Extract shared primitives (location picker, image uploader, pricing sections).
- Keep behaviour identical while making future changes safer and easier.

We are **not** changing runtime behaviour yet – this is the design and plan.

---

## 1. Current state (high level)

`src/components/admin/CatalogManager/CatalogDeck.tsx` currently:

- Manages tabs for:
  - Stays
  - Activities
  - Events
  - Places
  - Experiences
- Owns form state for all of these in one component.
- Contains:
  - Mapbox map + Google Places search + reverse geocode logic.
  - One‑click Google import logic (via `GoogleImportService`).
  - Pricing builder + images.
  - Submit/validation logic per type.

This makes changes fragile and hard to reason about.

---

## 2. Target component structure

### 2.1 High‑level layout

- `CatalogManager` (existing; menu item)
  - Renders `CatalogDeck` (or successor component).

- `CatalogDeck` (after refactor)
  - Owns:
    - Active tab (`stays | activities | events | places | experiences`).
    - Common layout (left: editor, right: existing items list).
  - Does **not** own deeply nested form state.
  - For each tab, renders a dedicated form component:
    - `<StayForm />`
    - `<ActivityForm />`
    - `<EventForm />`
    - `<PlaceForm />`
    - `<ExperienceForm />`

### 2.2 Form components

Each form component:

- Owns its own `formState` and `setFormState`.
- Receives props for:
  - `initialValue` (when editing).
  - `onSave(formState)` to call the appropriate service.
  - `onDirtyChange?(boolean)` to signal unsaved changes.
- Composes smaller, shared building blocks:
  - `<LocationPicker />`
  - `<ImageUploader />` (already exists)
  - `<PricingSection />`
  - `<AmenitiesSection />`
  - `<PoliciesSection />` (for stays)

Example (conceptual):

```tsx
<StayForm
  initialValue={selectedStay}
  onSave={handleSaveStay}
/>
```

### 2.3 Shared LocationPicker

New component: `src/components/admin/Shared/LocationPicker.tsx`

Responsibilities:

- Display Mapbox map and a search input.
- Use `googlePlacesProxy` for autocomplete and reverse geocode.
- Expose a simple API:

```ts
interface LocationValue {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  onPlaceSelected?: (placeId: string) => void; // for optional 1‑click import
}
```

- Knows nothing about:
  - stays vs activities vs places,
  - Google import mapping,
  - pricing or images.

### 2.4 One‑click Google import (decoupled)

Google import should be a **separate action** from location selection.

Design:

- Each form can optionally render an `Import from Google` button, enabled only
  when `location.placeId` is set.
- Clicking the button:
  - Calls `GoogleImportService.getPlaceDetails(placeId)` and
    `mapToActivity/mapToPlace/mapToStay`.
  - Lets the form decide which fields to merge:
    - e.g. `title`, `description`, `category`, `address`, images, phone, website.

The `LocationPicker` **never** imports or overwrites fields other than
`lat/lng/address/placeId`.

---

## 3. Responsibilities per component

### 3.1 CatalogDeck

- Tracks active tab.
- Provides shared chrome (panels, titles, right‑hand existing list).
- Loads selected item into the appropriate form via `initialValue`.
- Handles refresh of lists after successful saves.

### 3.2 StayForm

- State:
  - basic info (title, description, property type, bedrooms, bathrooms, max guests).
  - location (`LocationValue` from `LocationPicker`).
  - pricing & fees.
  - amenities.
  - host info, policies, area info.
  - images.
- Behaviour:
  - Validate minimal required fields.
  - Call `ListingsService` / `StaysService` on save:
    - Write to `stays`.
    - Trigger sync to `listings` (via service or function).

### 3.3 ActivityForm

- State:
  - basic activity info (title, description, category, tags).
  - location.
  - pricing builder config (`ActivityPricing`).
  - images.
- Behaviour:
  - Validate required fields.
  - Save via `ActivitiesService` and update `listings`.

### 3.4 Other forms (Events, Places, Experiences)

- Follow the same pattern:
  - each form knows its domain service and validation rules.
  - each uses `LocationPicker` and `ImageUploader`.

---

## 4. Phased refactor plan

We want to avoid breaking existing behaviour. Refactor should happen in small,
reviewable steps.

### Phase 1 – Extract LocationPicker

1. Create `LocationPicker` with the current map + search + reverse geocode logic
   extracted from `CatalogDeck`.
2. Replace inline map/search blocks in `CatalogDeck` with `<LocationPicker />`,
   wiring up existing lat/lng/address state.
3. Keep Google import behaviour as is for now (still in `CatalogDeck`), but
   ensure `LocationPicker` only deals with coordinates and address.

### Phase 2 – Extract StayForm and ActivityForm

1. Create `StayForm` and move:
   - stay form state,
   - inputs,
   - submit handler,
   - validation,
   from `CatalogDeck` into the new component.
2. Do the same for `ActivityForm`.
3. `CatalogDeck` now:
   - holds `editingStayId` / `editingActivityId`,
   - passes down `initialValue` and `onSave`.
4. Verify:
   - Creating/editing stays and activities still works end‑to‑end.

### Phase 3 – Extract remaining forms

1. Create `EventForm`, `PlaceForm`, `ExperienceForm`, moving logic out of
   `CatalogDeck`.
2. Simplify `CatalogDeck` to a tab switcher + layout wrapper:
   - no domain‑specific fields or submit logic.

### Phase 4 – Introduce explicit Google import actions

1. For each form, decide how “Import from Google” should behave.
2. Add a button that:
   - uses `location.placeId` from `LocationPicker`,
   - fetches details and merges them into form state.
3. Remove any remaining implicit import behaviour from location selection.

---

## 5. Non‑goals / later work

- Changing Firestore schemas is **out of scope** for this refactor – we keep
  the existing domain schemas and services.
- Any visual redesign of the Catalog Manager can happen after the code is
  decomposed and stable.

This plan should give us a clear path from the current monolithic CatalogDeck
to a modular, maintainable Catalog Manager that can evolve alongside the data
model described in `DATA_MODEL.md`.

