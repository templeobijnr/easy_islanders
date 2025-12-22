/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SHIM — firebaseConfig.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This file exists for backward compatibility.
 * Canonical location: ./infrastructure/firebase/firebase.config.ts
 *
 * DO NOT add new imports to this file.
 * Update imports to use: '@/services/infrastructure/firebase/firebase.config'
 * ═══════════════════════════════════════════════════════════════════════════
 */

export { app, analytics, db, auth, storage, rtdb } from "./infrastructure/firebase/firebase.config";
