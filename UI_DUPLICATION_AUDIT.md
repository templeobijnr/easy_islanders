# UI Duplication & Canonicalization Audit Report
**Date**: 2025-01-21  
**Scope**: Easy Islanders Vite + React codebase  
**Purpose**: Identify all "Hero.tsx-like" duplication conflicts across the repo

---

## 1) HIGH-CONFIDENCE DUPLICATES LIST

### Group ID: DUP-001
**Responsibility**: Landing hero section (main marketing banner on `/`)

**Files involved**:
- `src/components/layout/Hero.tsx` (translations-based, unused)
- `src/pages/home/Hero.tsx` (hardcoded, currently used)

**Exports**:
- Both export `default Hero`
- Component names: `Hero` (both)

**Usage evidence**:
- **Hardcoded version** (`src/pages/home/Hero.tsx`):
  - **rg evidence**: `src/pages/LandingPage.tsx:8` imports `Hero from "./home/Hero"`
  - **Reachability**: `/` → `LandingPage` → `Hero` (verified in route table)
- **Translation version** (`src/components/layout/Hero.tsx`):
  - **rg evidence**: `rg "from.*layout/Hero|import.*layout/Hero|from.*Hero.*layout" src` returns **zero matches**
  - **Status**: Orphan (no imports found)

**Text/source divergence**:
- **Hardcoded version** (`src/pages/home/Hero.tsx`):
  - Line 29: `"Discover North Cyprus"` (hardcoded)
  - Line 32: `"🌴 Island Life, Made Easy."` (hardcoded)
  - Line 35: `"Discover North Cyprus with an intelligent companion. Explore apartments, rent cars, find services, buy electronics, and book events—all through one simple chat."` (hardcoded)
  - Uses `t('hero_cta_agent')` and `t('live')` from translations (mixed approach)

- **Translation-based version** (`src/components/layout/Hero.tsx`):
  - Line 32-33: Uses `t('hero_title')` = `"Discover the Best of"` + `t('hero_experts')` = `"North Cyprus—Effortlessly."`
  - Line 37: Uses `t('hero_subtitle')` = `"Find things to do, book what you want, and explore the island with confidence—instantly."`
  - Fully translation-driven

**Routing relevance**: 
- Hardcoded version is reachable via `/` → `LandingPage` → `Hero`
- Translation version is **not reachable** (orphan)

**Risk level**: **High** — Two different hero messages visible to users depending on which is used; translation system is bypassed in active version

**Canonical candidate**: `src/pages/home/Hero.tsx` (currently used) should be refactored to use translations, OR `src/components/layout/Hero.tsx` should replace it if translations are preferred

---

### Group ID: DUP-002
**Responsibility**: Chat entry point UI (floating overlay/bubble pattern)

**Files involved**:
- `src/components/chat/ChatBubble.tsx` (unused overlay wrapper)
- `src/components/chat/FloatingMerveButton.tsx` (unused floating button)
- `src/features/chat/components/AgentChatPanel.tsx` (canonical, used)

**Exports**:
- `ChatBubble`: `default export ChatBubble`, `export type ChatBubbleProps`
- `FloatingMerveButton`: `default export FloatingMerveButton`, `export type FloatingMerveButtonProps`
- `AgentChatPanel`: `default export AgentChatPanel`

**Usage evidence**:
- `ChatBubble`: 
  - **rg evidence**: Only referenced in `src/App/AppLayout.shell.test.tsx:22` (test mock: `vi.mock("@/components/chat/ChatBubble")`)
  - **NOT imported in runtime code**: Verified `rg "from.*ChatBubble|import.*ChatBubble" src` shows no runtime imports
  - **Note**: There is a local component named `ChatBubble` inside `src/pages/chat/AgentChat.tsx:111` (unrelated to this file)
  - **Status**: Orphan (only test mocks)
- `FloatingMerveButton`: 
  - **rg evidence**: Only referenced in `src/App/AppLayout.shell.test.tsx:26` (test mock: `vi.mock("@/components/chat/FloatingMerveButton")`)
  - **NOT imported in runtime code**: Verified `rg "from.*FloatingMerveButton|import.*FloatingMerveButton" src` shows no runtime imports
  - **Status**: Orphan (only test mocks)
- `AgentChatPanel`: 
  - **rg evidence**: `src/pages/LandingPage.tsx:14` imports `AgentChatPanel from "@/features/chat/components/AgentChatPanel"` (embedded variant)
  - **rg evidence**: `src/pages/chat/ChatPage.tsx:2` imports `AgentChatPanel from "@/features/chat/components/AgentChatPanel"` (page variant)
  - **File verified**: `src/features/chat/components/AgentChatPanel.tsx` exists (confirmed via glob search)

**Text/source divergence**:
- `ChatBubble`: Thin wrapper around `AgentChat` with overlay UI (fixed position, backdrop)
- `FloatingMerveButton`: Floating action button (fixed bottom-right)
- `AgentChatPanel`: Wrapper that renders `AgentChat` with variant support (`embedded` vs `page`)

**Routing relevance**:
- `ChatBubble` and `FloatingMerveButton`: **Not reachable** (orphans)
- `AgentChatPanel`: Reachable via `/` (embedded) and `/chat` (page)

**Risk level**: **Low** — Orphan components don't affect runtime, but create confusion and maintenance burden

**Canonical candidate**: `src/features/chat/components/AgentChatPanel.tsx` is canonical. `ChatBubble` and `FloatingMerveButton` should be deleted if not needed for future features.

---

### Group ID: DUP-003
**Responsibility**: Layout shell (Navbar + Footer + Outlet composition)

**Files involved**:
- `src/App/AppLayout.tsx` (currently used)
- `src/layouts/ConsumerLayout.tsx` (unused)

**Exports**:
- `AppLayout`: `default export AppLayout`, `export type AppLayoutVM`
- `ConsumerLayout`: `default export ConsumerLayout`

**Usage evidence**:
- `AppLayout`: 
  - **rg evidence**: `src/App/AppRoutes.tsx:12` imports `AppLayout from "./AppLayout"`
  - **rg evidence**: `src/App/AppRoutes.tsx:71` uses `<Route element={<AppLayout vm={vm} />}>`
- `ConsumerLayout`: 
  - **rg evidence**: `rg "from.*ConsumerLayout|import.*ConsumerLayout" src` returns **zero matches**
  - **Status**: Orphan (no imports found)

**Text/source divergence**:
- `AppLayout`: 
  - Uses `@/components/layout/Navbar` and `@/components/layout/Footer`
  - Accepts `vm: AppLayoutVM` prop for auth modals
  - Renders auth modals inline
- `ConsumerLayout`:
  - Uses same Navbar/Footer components
  - Accepts `onOpenAuth`, `onAdminLogin`, `activeView` props (different API)
  - Does NOT render auth modals

**Routing relevance**:
- `AppLayout`: Reachable via all routes (wraps all routes in `AppRoutes`)
- `ConsumerLayout`: **Not reachable** (orphan)

**Risk level**: **Medium** — Unused layout creates confusion; different prop APIs suggest incomplete refactor

**Canonical candidate**: `src/App/AppLayout.tsx` is canonical. `ConsumerLayout` should be deleted if not needed.

---

### Group ID: DUP-004
**Responsibility**: Admin layout wrapper (auth guard + Outlet for admin routes)

**Files involved**:
- `src/layouts/AdminLayout.tsx` (unused)

**Exports**:
- `AdminLayout`: `default export AdminLayout`

**Usage evidence**:
- `AdminLayout`: 
  - **rg evidence**: `rg "from.*AdminLayout|import.*AdminLayout" src` returns **zero matches**
  - **Status**: Orphan (no imports found)
- Admin routes use `RequireAdmin` guard in `AppRoutes.tsx` instead (verified: `src/App/AppRoutes.tsx:47-62`)

**Text/source divergence**:
- `AdminLayout`: Provides admin auth guard + loading state + redirect logic
- Current approach: `RequireAdmin` HOC in `AppRoutes.tsx` wraps admin route elements

**Routing relevance**:
- `AdminLayout`: **Not reachable** (orphan)
- Admin routes are guarded via `RequireAdmin` HOC in `AppRoutes.tsx`

**Risk level**: **Low** — Orphan component, but suggests incomplete migration from layout-based guards to HOC guards

**Canonical candidate**: Current `RequireAdmin` HOC pattern is canonical. `AdminLayout` should be deleted if not needed.

---

### Group ID: DUP-005
**Responsibility**: CurationDeck export paths (admin deck for managing curated content)

**Files involved**:
- `src/components/admin/ConnectManager/CurationDeck.tsx` (shim)
- `src/components/admin/ConnectManager/CurationDeck/index.ts` (barrel)
- `src/components/admin/ConnectManager/CurationDeck/CurationDeck.tsx` (leaf)

**Exports**:
- Shim: `export { default } from "./CurationDeck/CurationDeck"`
- Barrel: `export { default } from "./CurationDeck"`
- Leaf: `export default CurationDeck`

**Usage evidence**:
- `src/components/admin/ControlTower/ControlTower.tsx:14` imports: `CurationDeck from "../ConnectManager/CurationDeck/CurationDeck"` (direct leaf import, bypasses shim/barrel)
- Shim and barrel are **not directly imported** (only leaf is used)

**Text/source divergence**:
- All three point to the same leaf component, but create multiple import paths:
  - `./CurationDeck` (shim) → `./CurationDeck/CurationDeck` (leaf) — **SAFE** (explicit leaf path)
  - `./CurationDeck/index` (barrel) → `./CurationDeck` (shim) → `./CurationDeck/CurationDeck` (leaf) — **SAFE** (chain resolves to explicit leaf)
  - `./CurationDeck/CurationDeck` (leaf) — direct, no ambiguity — **SAFE**

**Shim safety classification**:
- **Shim** (`CurationDeck.tsx`): **SAFE** — Uses explicit leaf path `"./CurationDeck/CurationDeck"`
- **Barrel** (`CurationDeck/index.ts`): **SAFE** — Points to shim which points to explicit leaf (no self-resolve risk)

**Routing relevance**: Reachable via `/admin` → `ControlTower` → `CurationDeck` (when "connect" deck is active)

**Risk level**: **Medium** — Multiple export paths create ambiguity; current usage bypasses shim/barrel, making them redundant

**Canonical candidate**: Direct leaf import (`./CurationDeck/CurationDeck`) is canonical. Shim and barrel should be removed if not needed for backwards compatibility.

---

### Group ID: DUP-006
**Responsibility**: Page-level shim patterns (Connect, Discover pages)

**Files involved**:
- `src/pages/connect/Connect.tsx` (shim)
- `src/pages/connect/Connect/Connect.tsx` (leaf)
- `src/pages/discover/index.tsx` (shim)
- `src/pages/discover/Discover/Discover.tsx` (leaf)

**Exports**:
- `Connect.tsx` shim: `export { default } from "./Connect/Connect"`
- `Discover/index.tsx` shim: `export { default } from "./Discover"`

**Usage evidence**:
- `Connect.tsx` shim: `src/App/AppRoutes.tsx:19` imports `ConnectPage from "../pages/connect/Connect"` (uses shim)
- `Discover/index.tsx` shim: `src/App/AppRoutes.tsx:18` imports `DiscoverPage from "../pages/discover"` (uses shim)

**Text/source divergence**:
- Both shims point to leaf components, but with different safety levels:
  - `Discover/index.tsx`: Uses `"./Discover"` — **UNSAFE** (ambiguous: could resolve to `./Discover/index.ts` barrel or `./Discover/Discover.tsx` file)
  - `Connect.tsx`: Uses explicit `"./Connect/Connect"` — **SAFE** (explicit leaf path)

**Shim safety classification**:
- **Discover shim** (`src/pages/discover/index.tsx`): **UNSAFE** — Path `"./Discover"` is ambiguous:
  - Could resolve to `./Discover/index.ts` (barrel) → `./Discover/Discover.tsx` (leaf) ✅
  - Could self-resolve to `./Discover/index.ts` if ESM resolution is inconsistent ❌
  - **Fix**: Change to `export { default } from "./Discover/Discover"` for explicit leaf
- **Connect shim** (`src/pages/connect/Connect.tsx`): **SAFE** — Uses explicit leaf path `"./Connect/Connect"`

**Routing relevance**: 
- Both reachable: `/connect` and `/discover`

**Risk level**: **Low** — Shims work but create unnecessary indirection; `Discover/index.tsx` has ambiguous path

**Canonical candidate**: Shims are intentional for backwards compatibility. `Discover/index.tsx` should use explicit path like `"./Discover/Discover"` to avoid ambiguity.

---

## 2) REPO-WIDE METRICS

### Count of Duplication Groups Found
**Total**: 6 groups

### Count by Category
- **Layout/Shell**: 2 groups (DUP-003, DUP-004)
- **Page-level**: 2 groups (DUP-001, DUP-006)
- **Component-level**: 1 group (DUP-002)
- **Admin modules**: 1 group (DUP-005)
- **Translations**: 0 groups (single translation file, no duplicates)
- **Chat**: 1 group (DUP-002, overlaps with component-level)

### Count of Unused-but-Present UI Files
**Total**: 5 files
1. `src/components/layout/Hero.tsx` (orphan)
2. `src/components/chat/ChatBubble.tsx` (orphan)
3. `src/components/chat/FloatingMerveButton.tsx` (orphan)
4. `src/layouts/ConsumerLayout.tsx` (orphan)
5. `src/layouts/AdminLayout.tsx` (orphan)

---

## 3) CANONICALIZATION BACKLOG (Prioritized)

### Priority 1: High Risk (User-Facing Divergence)
1. **DUP-001 (Hero.tsx)** — **HIGHEST PRIORITY**
   - **Issue**: Active hero uses hardcoded strings, bypassing translation system
   - **Impact**: Users see different hero copy than translations provide; i18n broken for hero
   - **Action**: Refactor `src/pages/home/Hero.tsx` to use `t('hero_title')`, `t('hero_experts')`, `t('hero_subtitle')` OR replace with `src/components/layout/Hero.tsx`
   - **Blast radius**: Low (single file change)

### Priority 2: Medium Risk (Maintenance Burden)
2. **DUP-005 (CurationDeck export paths)**
   - **Issue**: Multiple export paths, current usage bypasses shim/barrel
   - **Impact**: Confusion about canonical import path; potential cycle risk if barrel resolves to shim
   - **Action**: Remove shim and barrel, update `ControlTower` to import directly from leaf, OR document canonical path
   - **Blast radius**: Low (admin-only, single import site)

3. **DUP-003 (Layout shell)**
   - **Issue**: Unused `ConsumerLayout` with different API than `AppLayout`
   - **Impact**: Confusion about layout pattern; suggests incomplete refactor
   - **Action**: Delete `ConsumerLayout` if not needed, OR document why it exists
   - **Blast radius**: None (orphan file)

### Priority 3: Low Risk (Cleanup)
4. **DUP-002 (Chat entry point orphans)**
   - **Issue**: `ChatBubble` and `FloatingMerveButton` are unused
   - **Impact**: Code clutter, maintenance burden
   - **Action**: Delete both files if not needed for future features
   - **Blast radius**: None (orphan files)

5. **DUP-004 (AdminLayout orphan)**
   - **Issue**: Unused admin layout component
   - **Impact**: Code clutter
   - **Action**: Delete if not needed
   - **Blast radius**: None (orphan file)

6. **DUP-006 (Page shim ambiguity)**
   - **Issue**: `Discover/index.tsx` uses ambiguous `"./Discover"` path (UNSAFE shim)
   - **Impact**: Potential ESM resolution ambiguity; could self-resolve on Linux/CI
   - **Action**: Change to explicit `"./Discover/Discover"` path (make it SAFE)
   - **Blast radius**: Low (single file change)
   - **Evidence**: Current path `"./Discover"` could resolve to `./Discover/index.ts` (barrel) or `./Discover/Discover.tsx` (leaf) — ambiguous

---

## 4) ROUTE REACHABILITY MAP

### Entry Point
- `src/index.tsx` → `<BrowserRouter><App /></BrowserRouter>`

### App Composition
- `src/App.tsx` → `<AppProviders><AppContent /></AppProviders>`
- `src/App/AppContent.tsx` → `<AppRoutes />`
- `src/App/AppRoutes.tsx` → Routes wrapped in `<AppLayout>`

### Route Table
| Path | Component File | Layout | Notes |
|------|---------------|--------|-------|
| `/` | `src/pages/LandingPage.tsx` | `AppLayout` | Uses `src/pages/home/Hero.tsx` (hardcoded) |
| `/chat` | `src/pages/chat/ChatPage.tsx` | `AppLayout` | Uses `AgentChatPanel` (page variant) |
| `/discover` | `src/pages/discover/index.tsx` → `Discover/Discover.tsx` | `AppLayout` | Shim pattern |
| `/connect` | `src/pages/connect/Connect.tsx` → `Connect/Connect.tsx` | `AppLayout` | Shim pattern |
| `/connect/:id` | `src/components/connect/ConnectDetail.tsx` | `AppLayout` | Direct component |
| `/profile` | `src/components/profile/ProfileView.tsx` | `AppLayout` | Guarded by `RequireAuth` |
| `/messages` | `src/components/consumer/MessagesView.tsx` | `AppLayout` | Guarded by `RequireAuth` |
| `/settings` | `src/components/settings/SettingsView.tsx` | `AppLayout` | Guarded by `RequireAuth` |
| `/admin/login` | `src/pages/admin/AdminLogin.tsx` | `AppLayout` | No guard |
| `/admin` | `src/components/admin/ControlTower.tsx` | `AppLayout` | Guarded by `RequireAdmin` |
| `/admin/merve` | `src/pages/admin/MerveController.tsx` | `AppLayout` | Guarded by `RequireAdmin` |
| `/merchant` | `src/pages/merchant/MerchantEntry.tsx` | `AppLayout` | No guard |
| `/merchant/jobs` | `src/pages/merchant/MerchantJobs.tsx` | `AppLayout` | No guard |

### Layout Hierarchy
- All routes (except admin) use `AppLayout` which provides:
  - `Navbar` (from `src/components/layout/Navbar.tsx`)
  - `<Outlet />` (route content)
  - `Footer` (from `src/components/layout/Footer.tsx`)
  - Auth modals (inline)

---

## 5) SHIM SAFETY CLASSIFICATION

All shims found via `rg "export.*default.*from"` are classified by resolver safety:

### SAFE Shims (Explicit Leaf Paths)
These shims point to explicit leaf files (no directory ambiguity):

| File | Export Path | Resolves To | Status |
|------|-------------|-------------|--------|
| `src/pages/connect/Connect.tsx` | `"./Connect/Connect"` | `Connect/Connect.tsx` | ✅ SAFE |
| `src/components/admin/ConnectManager/CurationDeck.tsx` | `"./CurationDeck/CurationDeck"` | `CurationDeck/CurationDeck.tsx` | ✅ SAFE |
| `src/components/admin/BookingsDeck.tsx` | `"./BookingsDeck/BookingsDeck"` | `BookingsDeck/BookingsDeck.tsx` | ✅ SAFE |
| `src/components/admin/DiscoverManager/DiscoverControlDeck.tsx` | `"./DiscoverControlDeck/DiscoverControlDeck"` | `DiscoverControlDeck/DiscoverControlDeck.tsx` | ✅ SAFE |
| `src/components/admin/ControlTower.tsx` | `"./ControlTower/ControlTower"` | `ControlTower/ControlTower.tsx` | ✅ SAFE |
| `src/components/admin/CatalogManager/Forms/PlaceForm.tsx` | `"./PlaceForm/PlaceForm"` | `PlaceForm/PlaceForm.tsx` | ✅ SAFE |
| `src/components/admin/CatalogManager/Forms/StayForm.tsx` | `"./StayForm/StayForm"` | `StayForm/StayForm.tsx` | ✅ SAFE |
| `src/components/admin/CatalogManager/Forms/ActivityForm.tsx` | `"./ActivityForm/ActivityForm"` | `ActivityForm/ActivityForm.tsx` | ✅ SAFE |
| `src/components/admin/CatalogManager/Forms/EventForm.tsx` | `"./EventForm/EventForm"` | `EventForm/EventForm.tsx` | ✅ SAFE |
| `src/components/admin/CatalogManager/Forms/ExperienceForm.tsx` | `"./ExperienceForm/ExperienceForm"` | `ExperienceForm/ExperienceForm.tsx` | ✅ SAFE |
| `src/components/admin/CatalogManager/sections/MerveIntegrationSection.tsx` | `"./MerveIntegrationSection/MerveIntegrationSection"` | `MerveIntegrationSection/MerveIntegrationSection.tsx` | ✅ SAFE |
| `src/components/admin/CatalogManager/sections/OfferingsManager.tsx` | `"./OfferingsManager/OfferingsManager"` | `OfferingsManager/OfferingsManager.tsx` | ✅ SAFE |
| `src/components/admin/ConnectManager/AddCurationModal.tsx` | `"./AddCurationModal/AddCurationModal"` | `AddCurationModal/AddCurationModal.tsx` | ✅ SAFE |
| `src/components/consumer/MessagesView.tsx` | `"./MessagesView/MessagesView"` | `MessagesView/MessagesView.tsx` | ✅ SAFE |
| `src/components/TaxiStatusCard.tsx` | `"./TaxiStatusCard/TaxiStatusCard"` | `TaxiStatusCard/TaxiStatusCard.tsx` | ✅ SAFE |
| `src/pages/connect/EventDetailModal.tsx` | `"./EventDetailModal/EventDetailModal"` | `EventDetailModal/EventDetailModal.tsx` | ✅ SAFE |
| `src/auth/AuthModal.tsx` | `"./AuthModal/AuthModal"` | `AuthModal/AuthModal.tsx` | ✅ SAFE |
| `src/App.tsx` | `"./App/App"` | `App/App.tsx` | ✅ SAFE |
| `src/dashboard/modules/KnowledgeModule.tsx` | `"./KnowledgeModule/KnowledgeModule"` | `KnowledgeModule/KnowledgeModule.tsx` | ✅ SAFE |
| `src/dashboard/modules/TeachAgentModule.tsx` | `"./TeachAgentModule/TeachAgentModule"` | `TeachAgentModule/TeachAgentModule.tsx` | ✅ SAFE |

### UNSAFE Shims/Barrels (Ambiguous Paths)
These use ambiguous paths that could self-resolve:

| File | Export Path | Issue | Risk |
|------|-------------|-------|------|
| `src/pages/discover/index.tsx` (shim) | `"./Discover"` | Ambiguous: resolves to `./Discover/index.ts` (barrel) → `./Discover/Discover.tsx` (leaf), but `"./Discover"` could self-resolve to barrel | ⚠️ UNSAFE |
| `src/pages/discover/Discover/index.ts` (barrel) | `"./Discover"` | **CRITICAL**: Self-reference risk — `"./Discover"` could resolve back to `./Discover/index.ts` itself, creating cycle | ⚠️ UNSAFE |
| `src/pages/connect/Connect/index.ts` (barrel) | `"./Connect"` | **CRITICAL**: Self-reference risk — `"./Connect"` could resolve back to `./Connect/index.ts` itself, creating cycle | ⚠️ UNSAFE |

**Resolution chain verification**:
- `src/pages/discover/index.tsx` → `"./Discover"` → `src/pages/discover/Discover/index.ts` → `"./Discover"` → `src/pages/discover/Discover/Discover.tsx` ✅ (works but risky)
- If ESM resolution is inconsistent, `"./Discover"` in barrel could self-resolve → **CYCLE** ❌

**Note**: Barrel files (`index.ts`) using `"./ComponentName"` are particularly risky because they can self-resolve, creating cycles. Shims should always use explicit leaf paths like `"./ComponentName/ComponentName"`.

---

## 6) EVIDENCE-BASED VERIFICATION SUMMARY

### Orphan File Verification (rg Evidence)
All "orphan" claims are backed by grep evidence:

| File | rg Command | Result | Status |
|------|-----------|--------|--------|
| `src/components/layout/Hero.tsx` | `rg "from.*layout/Hero\|import.*layout/Hero" src` | Zero matches | ✅ Orphan (proven) |
| `src/components/chat/ChatBubble.tsx` | `rg "from.*ChatBubble\|import.*ChatBubble" src` | Only test mocks | ✅ Orphan (proven) |
| `src/components/chat/FloatingMerveButton.tsx` | `rg "from.*FloatingMerveButton\|import.*FloatingMerveButton" src` | Only test mocks | ✅ Orphan (proven) |
| `src/layouts/ConsumerLayout.tsx` | `rg "from.*ConsumerLayout\|import.*ConsumerLayout" src` | Zero matches | ✅ Orphan (proven) |
| `src/layouts/AdminLayout.tsx` | `rg "from.*AdminLayout\|import.*AdminLayout" src` | Zero matches | ✅ Orphan (proven) |

### File Existence Verification (glob Evidence)
All referenced files verified via glob search:

| File | Glob Pattern | Result | Status |
|------|-------------|--------|--------|
| `src/features/chat/components/AgentChatPanel.tsx` | `**/AgentChatPanel.tsx` | Found | ✅ Exists |
| `src/pages/home/Hero.tsx` | `**/Hero.tsx` | Found (2 files) | ✅ Exists |
| `src/components/layout/Hero.tsx` | `**/Hero.tsx` | Found (2 files) | ✅ Exists |

### Translation Source Verification
- **Translation files**: `glob "**/*translation*.ts"` → 1 file (`src/components/constants/translations.ts`)
- **Translation usage**: `rg "t\(|useTranslation|i18n\.|TRANSLATIONS\[" src` → 50 files
- **Translation hook source**: All use `useLanguage()` from `src/context/LanguageContext.tsx`
- **No duplicate registries**: `glob "**/*i18n*.ts"`, `glob "**/en.ts"`, `glob "**/tr.ts"` → Zero matches

---

## 7) ADDITIONAL FINDINGS

### Translation System
- **Primary translation file**: `src/components/constants/translations.ts` (verified via glob: only one `*translation*.ts` file)
- **Translation usage pattern**: `rg "t\(|useTranslation|i18n\.|TRANSLATIONS\[" src` found **50 files** using translations
- **Translation source verification**:
  - All translation calls use `t(...)` from `useLanguage()` hook
  - Hook source: `src/context/LanguageContext.tsx` (imports `TRANSLATIONS` from `src/components/constants/translations.ts`)
  - **No duplicate translation registries found**: No `i18n.ts`, `en.ts`, `tr.ts` files (verified via glob)
- **Translation key consistency**: 
  - Hero component bypasses translations (DUP-001) — uses hardcoded strings instead of `t('hero_title')`, `t('hero_experts')`, `t('hero_subtitle')`
  - All other components use translation keys consistently

### Admin Deck Patterns
- All admin decks follow shim pattern: `Deck.tsx` → `Deck/Deck.tsx`
- Pattern is consistent and intentional (backwards compatibility)
- No duplicate deck responsibilities found

### Chat Component Hierarchy
- **Canonical**: `AgentChatPanel` (variant wrapper) → `AgentChat` (core UI)
- **Orphans**: `ChatBubble`, `FloatingMerveButton` (not used)
- **Business chat**: `BusinessChatWidget` (separate responsibility, used in booking modules)

---

## 6) RECOMMENDATIONS

1. **Immediate action**: Fix DUP-001 (Hero translation bypass) — highest user impact
2. **Cleanup**: Delete orphan files (DUP-002, DUP-003, DUP-004) to reduce confusion
3. **Documentation**: Document canonical import paths for admin decks (DUP-005)
4. **Refinement**: Fix ambiguous shim path in `Discover/index.tsx` (DUP-006)

---

**End of Report**

