/**
 * Integration Service: V1 Backend API
 *
 * Responsibility:
 * - URL resolution for V1 gateway endpoints
 * - Authenticated fetch wrapper for V1 API calls
 *
 * External Dependencies:
 * - V1 Backend API (/v1/*)
 *
 * Firestore Collections:
 * - None (communicates via backend API)
 *
 * Layer: Integration Service
 *
 * Dependencies:
 * - Firebase Auth (for tokens)
 *
 * Notes:
 * - Handles multiple env URL formats
 * - Utility for other services to call backend
 * - Safe to modify in isolation
 *
 * Stability: Core
 */

import { User as FirebaseUser } from 'firebase/auth';

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Resolve the V1 gateway base URL.
 *
 * Accepted env shapes:
 * - https://…cloudfunctions.net/api/v1        (legacy default in this repo)
 * - https://…cloudfunctions.net/api          (legacy function root)
 * - https://…cloudfunctions.net/apiV1        (V1 function root)
 * - https://…web.app                         (Hosting root; /v1 is rewritten to apiV1)
 * - https://…web.app/v1                      (also accepted)
 */
export function getV1GatewayBaseUrl(): string {
  const envBase = (import.meta as any).env?.VITE_API_V1_URL as string | undefined;
  const fallbackBase = (import.meta as any).env?.VITE_API_URL as string | undefined;
  let base = envBase || fallbackBase || '';
  base = trimTrailingSlashes(base);

  // If a caller provides a full /v1 base (e.g. https://host/v1), strip it;
  // `v1Url()` will re-apply it consistently.
  base = base.replace(/\/v1$/, '');

  // If pointing at the legacy Cloud Function base, swap to the V1 function name.
  base = base.replace(/\/api\/v1$/, '/apiV1');
  base = base.replace(/\/api$/, '/apiV1');

  // If already pointing at /apiV1/v1, normalize to /apiV1.
  base = base.replace(/\/apiV1\/v1$/, '/apiV1');

  return base;
}

export function v1Url(path: string): string {
  const base = getV1GatewayBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withV1 = normalized.startsWith('/v1/') ? normalized : `/v1${normalized}`;
  return base ? `${base}${withV1}` : withV1;
}

export async function fetchWithAuth<T>(
  firebaseUser: FirebaseUser,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await firebaseUser.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(v1Url(path), { ...init, headers });
  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === 'string'
        ? payload
        : (payload as any)?.error || (payload as any)?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}
