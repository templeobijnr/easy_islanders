/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURAL CONTRACT — firebase.config.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Layer: Infrastructure
 * Status: FOUNDATIONAL — Do not modify without architecture review
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OWNS:
 * ─────────────────────────────────────────────────────────────────────────────
 * - Firebase app initialization
 * - Firestore instance (db)
 * - Authentication instance (auth)
 * - Storage instance (storage)
 * - Analytics instance (analytics)
 * - Realtime Database instance (rtdb, optional)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOES NOT OWN:
 * ─────────────────────────────────────────────────────────────────────────────
 * - Any business logic
 * - Any domain operations
 * - Any data transformations
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠ WARNING: All services depend on this file.
 * ─────────────────────────────────────────────────────────────────────────────
 * Single Firebase app instance shared across entire application.
 * Modifications here affect EVERYTHING.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase, Database } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
    authDomain: "easy-islanders.firebaseapp.com",
    projectId: "easy-islanders",
    storageBucket: "easy-islanders.firebasestorage.app",
    messagingSenderId: "618304320776",
    appId: "1:618304320776:web:5f602d332d4b28d07628bd",
    measurementId: "G-GLVWS1QT7E",
    ...(import.meta.env.VITE_FIREBASE_DATABASE_URL
        ? { databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string }
        : {}),
};

// Initialize primary Firebase app (single instance for all auth flows)
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore - explicitly connecting to the named database 'easy-db'
const db = getFirestore(app, "easy-db");

// Initialize Firebase Authentication (single instance - admin/consumer distinguished by Custom Claims)
const auth = getAuth(app);

// Optional: Initialize Firebase Realtime Database (for token refresh signals)
let rtdb: Database | null = null;
if (import.meta.env.VITE_FIREBASE_DATABASE_URL) {
    rtdb = getDatabase(app);
}

// Initialize Firebase Storage
const storage = getStorage(app);

// Optionally connect to Storage emulator in development when explicitly enabled
if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost" &&
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true"
) {
    connectStorageEmulator(storage, "127.0.0.1", 9199);
}

let analytics = null;

// Safely initialize analytics only if supported in the current environment
if (typeof window !== "undefined") {
    isSupported()
        .then((supported) => {
            if (supported) {
                analytics = getAnalytics(app);
            }
        })
        .catch((err) => {
            console.warn(
                "Firebase Analytics is not supported in this environment:",
                err
            );
        });
}

export { app, analytics, db, auth, storage, rtdb };
