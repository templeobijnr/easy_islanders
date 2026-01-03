# Canonicalization Audit Report
**Phase 0 + Phase 1: Complete Evidence-Based Duplicate Discovery**

---

## Phase 0 — Guardrails Verification

### 0.1 Alias Configuration
- **vite.config.ts**: ✅ `@` alias configured at `./src`
  ```ts
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
  ```
- **tsconfig.json**: ✅ `@/*` path alias configured
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```

### 0.2 Casing Configuration
- **tsconfig.json**: ⚠️ `forceConsistentCasingInFileNames` is **NOT enabled**
  - Grep evidence: No match found for `forceConsistentCasingInFileNames` in tsconfig.json
  - **ACTION REQUIRED**: Add `"forceConsistentCasingInFileNames": true`

### 0.3 One Router Rule
- **BrowserRouter locations** (grep: `<BrowserRouter|BrowserRouter`):
  - `src/index.tsx:26` — ✅ Single runtime router (canonical)
  - `src/App/AppProviders.router.test.tsx:24` — ✅ Test-only (acceptable)
- **Status**: ✅ PASS — Single runtime router

---

## Phase 1 — Duplicate Discovery Audit Table

### GROUP DUP-001: Hero Component (Marketing Banner)

| Property | Value |
|----------|-------|
| **Group ID** | DUP-001 |
| **Responsibility** | Landing hero section (main marketing banner on `/`) |
| **Files Involved** | `src/pages/home/Hero.tsx` (hardcoded), `src/components/layout/Hero.tsx` (translations) |
| **Exports** | Both: `default Hero` |
| **Reachability** | `src/pages/home/Hero.tsx`: **Runtime-imported** (via `LandingPage.tsx:8`); `src/components/layout/Hero.tsx`: **Orphan** |
| **Evidence** | `grep "from.*Hero\|import.*Hero" src` → Only `LandingPage.tsx:8` imports from `"./home/Hero"` |
| **Divergence** | Hardcoded: `"🌴 Island Life, Made Easy."`, `"Discover North Cyprus"`. Translations: uses `t('hero_title')` = `"Discover the Best of"`, `t('hero_experts')` = `"North Cyprus—Effortlessly."` |
| **Risk Level** | **High** — Copy drift, i18n bypassed |
| **Canonical Candidate** | `src/pages/home/Hero.tsx` (currently in production); translation version is orphan |

---

### GROUP DUP-002: Layout Shell (Navbar + Footer + Outlet)

| Property | Value |
|----------|-------|
| **Group ID** | DUP-002 |
| **Responsibility** | Global shell layout (Navbar + Footer + Outlet) |
| **Files Involved** | `src/App/AppLayout.tsx`, `src/layouts/ConsumerLayout.tsx`, `src/layouts/AdminLayout.tsx` |
| **Exports** | All: `default` exports |
| **Reachability** | `AppLayout.tsx`: **Routed** (via `AppRoutes.tsx:71`); `ConsumerLayout.tsx`: **Orphan**; `AdminLayout.tsx`: **Orphan** |
| **Evidence** | `grep "from.*ConsumerLayout\|import.*ConsumerLayout\|from.*AdminLayout\|import.*AdminLayout" src` → **Zero matches** |
| **Divergence** | `AppLayout`: Uses auth modals inline, accepts `vm` prop. `ConsumerLayout`: Different prop API (`onOpenAuth`, `onAdminLogin`, `activeView`). `AdminLayout`: Has auth guard built-in. |
| **Risk Level** | **Medium** — Orphan files cause confusion |
| **Canonical Candidate** | `src/App/AppLayout.tsx` (currently routed) |

---

### GROUP DUP-003: Chat Entry Point (Bubble vs Panel vs Page)

| Property | Value |
|----------|-------|
| **Group ID** | DUP-003 |
| **Responsibility** | Chat entry/display UI |
| **Files Involved** | `src/components/chat/ChatBubble.tsx`, `src/components/chat/FloatingMerveButton.tsx`, `src/features/chat/components/AgentChatPanel.tsx`, `src/pages/chat/ChatPage.tsx`, `src/pages/chat/AgentChat.tsx` |
| **Exports** | `ChatBubble`: default + named; `FloatingMerveButton`: default + named; `AgentChatPanel`: default; `ChatPage`: default; `AgentChat`: default |
| **Reachability** | `ChatBubble`: **Test-only** (mocked in `AppLayout.shell.test.tsx:22`); `FloatingMerveButton`: **Test-only** (mocked in `AppLayout.shell.test.tsx:26`); `AgentChatPanel`: **Runtime-imported** (via `LandingPage.tsx:14`, `ChatPage.tsx:2`); `ChatPage`: **Routed** (via `AppRoutes.tsx:73`); `AgentChat`: **Runtime-imported** (via `AgentChatPanel.tsx:2`, `ChatBubble.tsx:13`) |
| **Evidence** | `grep "from.*ChatBubble\|import.*ChatBubble" src` → Zero runtime imports; `grep "from.*FloatingMerveButton\|import.*FloatingMerveButton" src` → Zero runtime imports; `grep "from.*AgentChatPanel\|import.*AgentChatPanel" src` → `LandingPage.tsx:14`, `ChatPage.tsx:2` |
| **Divergence** | `ChatBubble`: Full-screen overlay, imports `AgentChat`. `FloatingMerveButton`: Floating action button. `AgentChatPanel`: Wrapper with `embedded`/`page` variants. `AgentChat`: Core chat implementation with `variant` prop. |
| **Risk Level** | **Low** — Orphan files only affect test complexity |
| **Canonical Candidate** | `AgentChatPanel` → `AgentChat` chain (currently used). `ChatBubble` and `FloatingMerveButton` are orphan. |

---

### GROUP DUP-004: Unsafe Barrel Shims (Self-Reference Risk)

| Property | Value |
|----------|-------|
| **Group ID** | DUP-004 |
| **Responsibility** | Module re-export barrels |
| **Files Involved** | Multiple `index.ts` files with ambiguous `"./X"` exports |
| **Exports** | `export { default } from "./X"` where X is ambiguous |
| **Reachability** | Various (some routed, some runtime) |
| **Evidence** | `grep 'export \{ default \} from "\./[^/]+["']' src` → 20 files with ambiguous `./X` patterns |
| **Divergence** | N/A — structural issue, not content divergence |
| **Risk Level** | **Medium** — Can cause ESM resolution cycles |
| **Canonical Candidate** | N/A — requires fix to explicit leaf paths |

**UNSAFE Barrels (ambiguous `./X` pattern):**

| File | Export | Issue |
|------|--------|-------|
| `src/App/index.ts` | `"./App"` | Could resolve to `./App/index.ts` or `./App.tsx` |
| `src/pages/discover/index.tsx` | `"./Discover"` | Could resolve to `./Discover/index.ts` |
| `src/pages/discover/Discover/index.ts` | `"./Discover"` | Self-reference risk |
| `src/pages/connect/Connect/index.ts` | `"./Connect"` | Self-reference risk |
| `src/components/admin/BookingsDeck/index.ts` | `"./BookingsDeck"` | Self-reference risk |
| `src/components/admin/ControlTower/index.ts` | `"./ControlTower"` | Self-reference risk |
| `src/components/admin/ConnectManager/CurationDeck/index.ts` | `"./CurationDeck"` | Self-reference risk |
| `src/components/admin/DiscoverManager/DiscoverControlDeck/index.ts` | `"./DiscoverControlDeck"` | Self-reference risk |
| `src/auth/AuthModal/index.ts` | `"./AuthModal"` | Self-reference risk |
| `src/components/consumer/MessagesView/index.ts` | `"./MessagesView"` | Self-reference risk |
| `src/components/TaxiStatusCard/index.ts` | `"./TaxiStatusCard"` | Self-reference risk |
| `src/components/admin/CatalogManager/sections/MerveIntegrationSection/index.ts` | `"./MerveIntegrationSection"` | Self-reference risk |
| `src/components/admin/CatalogManager/Forms/ExperienceForm/index.ts` | `"./ExperienceForm"` | Self-reference risk |
| `src/components/admin/CatalogManager/Forms/StayForm/index.ts` | `"./StayForm"` | Self-reference risk |
| `src/components/admin/CatalogManager/Forms/EventForm/index.ts` | `"./EventForm"` | Self-reference risk |
| `src/components/admin/CatalogManager/Forms/ActivityForm/index.ts` | `"./ActivityForm"` | Self-reference risk |
| `src/components/admin/CatalogManager/sections/OfferingsManager/index.ts` | `"./OfferingsManager"` | Self-reference risk |
| `src/dashboard/modules/KnowledgeModule/index.ts` | `"./KnowledgeModule"` | Self-reference risk |
| `src/dashboard/modules/TeachAgentModule/index.ts` | `"./TeachAgentModule"` | Self-reference risk |
| `src/pages/connect/EventDetailModal/index.ts` | `"./EventDetailModal"` | Self-reference risk |

**SAFE Shims (explicit leaf paths):**

| File | Export | Status |
|------|--------|--------|
| `src/pages/connect/Connect.tsx` | `"./Connect/Connect"` | ✅ SAFE |
| `src/components/admin/ConnectManager/CurationDeck.tsx` | `"./CurationDeck/CurationDeck"` | ✅ SAFE |
| `src/components/admin/BookingsDeck.tsx` | `"./BookingsDeck/BookingsDeck"` | ✅ SAFE |
| `src/components/admin/DiscoverManager/DiscoverControlDeck.tsx` | `"./DiscoverControlDeck/DiscoverControlDeck"` | ✅ SAFE |
| `src/components/admin/ControlTower.tsx` | `"./ControlTower/ControlTower"` | ✅ SAFE |
| `src/auth/AuthModal.tsx` | `"./AuthModal/AuthModal"` | ✅ SAFE |
| (and 10+ other `.tsx` shims with explicit leaf paths) | | ✅ SAFE |

---

## Phase 1 — Summary Metrics

| Category | Count |
|----------|-------|
| Duplicate Groups Found | 4 |
| Orphan Files | 4 (`components/layout/Hero.tsx`, `layouts/ConsumerLayout.tsx`, `layouts/AdminLayout.tsx`, `components/chat/ChatBubble.tsx`, `components/chat/FloatingMerveButton.tsx`) |
| Test-Only Files | 2 (`ChatBubble.tsx`, `FloatingMerveButton.tsx` — only referenced in test mocks) |
| Unsafe Barrels | 20 (ambiguous `./X` patterns) |
| Safe Shims | 15+ (explicit leaf paths) |

---

## Route Snapshot (Current State)

| Path | Component | Layout | Evidence |
|------|-----------|--------|----------|
| `/` | `LandingPage.tsx` | `AppLayout` | `AppRoutes.tsx:72` |
| `/chat` | `ChatPage.tsx` | `AppLayout` | `AppRoutes.tsx:73` |
| `/discover` | `DiscoverPage` via shim | `AppLayout` | `AppRoutes.tsx:74` |
| `/connect` | `ConnectPage` via shim | `AppLayout` | `AppRoutes.tsx:75` |
| `/connect/:id` | `ConnectDetail.tsx` | `AppLayout` | `AppRoutes.tsx:76` |
| `/profile` | `ProfileView.tsx` | `AppLayout` | `AppRoutes.tsx:77` (guarded) |
| `/messages` | `MessagesView.tsx` | `AppLayout` | `AppRoutes.tsx:78` (guarded) |
| `/settings` | `SettingsView.tsx` | `AppLayout` | `AppRoutes.tsx:79` (guarded) |
| `/admin/login` | `AdminLogin.tsx` | `AppLayout` | `AppRoutes.tsx:80` |
| `/admin` | `ControlTower.tsx` | `AppLayout` | `AppRoutes.tsx:81` (guarded) |
| `/admin/merve` | `MerveController.tsx` | `AppLayout` | `AppRoutes.tsx:82` (guarded) |
| `/merchant` | `MerchantEntry.tsx` | `AppLayout` | `AppRoutes.tsx:83` |
| `/merchant/jobs` | `MerchantJobs.tsx` | `AppLayout` | `AppRoutes.tsx:84` |

---

## Phase 2 — Canonicalization Plan

### 2.1 Hero Component (DUP-001)
**Decision**: Keep `src/pages/home/Hero.tsx` as canonical (currently in production).
**Action**: Delete `src/components/layout/Hero.tsx` (orphan).
**Rationale**: The hardcoded version is currently rendered; translation version is unused. Copy decision is product, not engineering.

### 2.2 Layout Shell (DUP-002)
**Decision**: Keep `src/App/AppLayout.tsx` as canonical.
**Action**: Delete `src/layouts/ConsumerLayout.tsx` and `src/layouts/AdminLayout.tsx` (both orphan).
**Rationale**: Neither is imported anywhere; `AppLayout` handles all routes.

### 2.3 Chat Entry (DUP-003)
**Decision**: `AgentChatPanel` → `AgentChat` is canonical chain.
**Action**: 
- Delete `src/components/chat/ChatBubble.tsx` (orphan/test-only)
- Delete `src/components/chat/FloatingMerveButton.tsx` (orphan/test-only)
- Update test mocks to not reference deleted components
**Rationale**: Per product intent, chat is embedded on Landing and full-page on `/chat`. No floating bubble needed.

### 2.4 Unsafe Barrels (DUP-004)
**Decision**: Fix all ambiguous `./X` patterns to explicit leaf paths.
**Action**: For each barrel `index.ts` with `export { default } from "./X"`, change to `export { default } from "./X/X"` if `X/X.tsx` exists.
**Rationale**: Prevents ESM self-reference cycles.

### 2.5 Guardrails
**Action**: Add `"forceConsistentCasingInFileNames": true` to tsconfig.json.

---

## Phase 3 — Minimum Safe Changes (Ordered)

1. **Add casing guard**: Update `tsconfig.json` to add `forceConsistentCasingInFileNames: true`

2. **Delete orphan Hero**: Remove `src/components/layout/Hero.tsx`

3. **Delete orphan layouts**: Remove `src/layouts/ConsumerLayout.tsx` and `src/layouts/AdminLayout.tsx`

4. **Delete orphan chat components**: Remove `src/components/chat/ChatBubble.tsx` and `src/components/chat/FloatingMerveButton.tsx`

5. **Update test mocks**: Remove mocks for deleted chat components in `src/App/AppLayout.shell.test.tsx`

6. **Fix unsafe barrels (20 files)**: Change `export { default } from "./X"` to `export { default } from "./X/X"` for all barrel files

---

## Phase 4 — Verification Commands

After applying changes, run:

```bash
# 1. Build check
pnpm exec vite build

# 2. Type check (confirm no new TS2307 errors for touched files)
pnpm exec tsc -p tsconfig.json --noEmit

# 3. Cycle check (if madge available)
pnpm run check:cycles

# 4. Test run
pnpm exec vitest run
```

---

**End of Audit — Ready for Phase 3 Implementation**



