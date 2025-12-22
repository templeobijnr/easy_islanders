# Control Tower 🏰 (Admin Dashboard)

The **Control Tower** is the central "God Mode" administration interface for Easy Islanders. It is designed to give Super Admins complete visibility and control over the platform's operations, from real-time social activity to system health and content moderation.

## 1. Architecture Overview

The Control Tower is built as a single-page application within the main React app, accessible only to users with `isAdmin: true` in their profile. It features a **Cyberpunk/Dark Mode** aesthetic ("God Mode") to distinguish it from the consumer-facing app.

### Key Layout Components:
*   **Global Header**: Contains the "Control Tower" branding, global search bar (mock), UTC clock, and Admin Profile access.
*   **Collapsible Sidebar**: Provides navigation between different "Decks" (Modules).
*   **Main Content Area**: Renders the active Deck.
*   **Admin Profile Modal**: Displays security status and session info.

---

## 2. Modules (Decks)

### 🚀 Mission Control (Dashboard Home)
**Purpose**: High-level overview of system health and key metrics.
*   **Stats Cards**: Display real-time (currently mock) counters for Active Users, Revenue, etc.
*   **System Health**: Visualizes API latency and service uptime.
*   **Status**: *Partially Implemented (Mock Data)*.

### 📍 Connect Manager (V1.5 Feature)
**Purpose**: Management of the "Connect" social platform features. This module is fully integrated with Firestore.
*   **Tabs**:
    1.  **Pins 📍**:
        *   **Map Interface**: Interactive Mapbox map showing the current pin location. Supports "Use My Location" and drag-to-move.
        *   **Pin Creation Form**: A comprehensive form to create new `Place`, `Activity`, `Event`, or `Trip` entities.
            *   **Fields**: Title, Type, Region, Category, Description.
            *   **Action Config**: Checkboxes to enable/disable user actions (Check-in, Join, Wave, Booking, Taxi).
            *   **Backend**: Writes directly to `places`, `activities`, `events`, or `trips` collections in Firestore.
    2.  **Moderation 🛡️**:
        *   **Queue**: Lists user-created Events that have `approved: false`.
        *   **Actions**: Admins can **Approve** (sets `approved: true`) or **Deny** (sets `approved: false`, `denied: true`).
        *   **Real-time**: Updates automatically as decisions are made.
    3.  **Live Feed ⚡**:
        *   **Stream**: A real-time list of the latest User Check-ins from the `checkins` collection.
        *   **Details**: Shows User Avatar, Name, Pin Type, and Timestamp.

### 👥 User Directory
**Purpose**: Search and manage user profiles.
*   **Status**: 🔒 *Locked (Future Sprint)*.

### 💰 Financials
**Purpose**: View revenue, transaction history, and payouts.
*   **Status**: 🔒 *Locked (Future Sprint)*.

### 🎛️ Algorithm Tuner
**Purpose**: Adjust weights for the recommendation engine (e.g., "Boost Historical Sites").
*   **Status**: 🔒 *Locked (Future Sprint)*.

### 🛡️ Content Moderation
**Purpose**: Review reported content (chats, reviews, photos).
*   **Status**: 🔒 *Locked (Future Sprint)*.

### ⚙️ System Config
**Purpose**: Manage global settings, feature flags, and API keys.
*   **Status**: 🔒 *Locked (Future Sprint)*.

---

## 3. Technical Implementation

*   **File**: `src/components/admin/ControlTower.tsx`
*   **State Management**: Uses local React state (`useState`) for UI tabs and form data.
*   **Data Layer**: Direct Firebase Firestore integration using `firebase/firestore` SDK.
*   **Map**: `mapbox-gl` integration for the Pins module.
*   **Styling**: Tailwind CSS with extensive use of `slate-900`, `cyan-500` (accent), and `backdrop-blur` effects for the "Glassmorphism" look.

## 4. Future Roadmap

1.  **Connect Real Data to Mission Control**: Replace mock stats with Cloud Function aggregations.
2.  **Unlock User Directory**: Implement user search and "Ban/Suspend" actions.
3.  **Unlock Content Moderation**: Build a queue for reported chat messages.
