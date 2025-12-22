# AskMerve Mobile App

Expo React Native mobile application for AskMerve.

## Tech Stack

- **Framework**: Expo SDK 54 with expo-router
- **Language**: TypeScript (strict mode)
- **Auth**: Firebase Phone Auth via `@react-native-firebase/auth`
- **API Client**: `@askmerve/api-client` (shared with web)
- **Contracts**: `@askmerve/contracts` (shared DTO schemas)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8.15+
- Xcode (for iOS development)
- Android Studio (for Android development)
- Expo Go app (for quick development)

### Installation

From the monorepo root:

```bash
# Install all workspace dependencies
pnpm install

# Build shared packages (required before first run)
pnpm --filter @askmerve/contracts build
pnpm --filter @askmerve/shared build
pnpm --filter @askmerve/api-client build
```

### Development

```bash
# Start Expo development server
pnpm --filter mobile start

# Or with dev client
pnpm --filter mobile dev
```

### Platform-Specific Commands

```bash
# iOS
pnpm --filter mobile ios

# Android
pnpm --filter mobile android

# Web
pnpm --filter mobile web
```

### Quality Checks

```bash
# TypeScript type checking
pnpm --filter mobile typecheck

# ESLint
pnpm --filter mobile lint
```

## Project Structure

```
apps/mobile/
├── app/                      # Expo Router pages
│   ├── (auth)/               # Auth stack (phone, verify)
│   ├── (tabs)/               # Tab navigation (chat, discover, connect, activity)
│   ├── job/                  # Job detail screens
│   └── _layout.tsx           # Root layout with ErrorBoundary
├── components/               # Shared components
│   ├── ErrorBoundary.tsx     # Global error boundary
│   └── Map/                  # Map components
├── context/                  # React context providers
│   └── AuthContext.tsx       # Firebase auth context
├── services/                 # API and utility services
├── theme/                    # Design tokens
│   └── tokens.ts             # Colors, spacing, typography
└── utils/                    # Utility functions
    ├── env.ts                # Environment configuration
    └── storage.ts            # Secure storage adapter
```

## Environment Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |

## Shared Packages

This app uses shared workspace packages:

- **`@askmerve/contracts`**: Transport-safe Zod DTOs for Connect and Identity
- **`@askmerve/shared`**: Core business schemas (Jobs, Listings, Actions)
- **`@askmerve/api-client`**: HTTP client for API calls

## Firebase Configuration

- iOS: `GoogleService-Info.plist`
- Android: `google-services.json`

## ESLint Rules

The mobile app enforces:
- **300-line file limit** (aligned with web standards)
- **No `console.*`** except `console.warn` and `console.error`

## Path Aliases

TypeScript and Babel are configured with these aliases:

| Alias | Path |
|-------|------|
| `@/*` | `./*` |
| `@/components/*` | `./components/*` |
| `@/context/*` | `./context/*` |
| `@/services/*` | `./services/*` |
| `@/utils/*` | `./utils/*` |
| `@/theme/*` | `./theme/*` |
