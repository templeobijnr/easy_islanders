/**
 * Merchant API Client
 * 
 * Handles API calls for the Merchant Webview (`/m`).
 * Uses session JWT (not Firebase Auth) for authentication.
 */

// =============================================================================
// STORAGE
// =============================================================================

const MERCHANT_SESSION_KEY = 'merchant_session';

export interface MerchantSession {
    accessToken: string;
    listingId: string;
    scopes: string[];
}

export function getMerchantSession(): MerchantSession | null {
    const stored = sessionStorage.getItem(MERCHANT_SESSION_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

export function setMerchantSession(session: MerchantSession): void {
    sessionStorage.setItem(MERCHANT_SESSION_KEY, JSON.stringify(session));
}

export function clearMerchantSession(): void {
    sessionStorage.removeItem(MERCHANT_SESSION_KEY);
}

// =============================================================================
// API BASE
// =============================================================================

function getApiBase(): string {
    // Use Jobs API base (jobsApi function)
    const envBase = (import.meta as any).env?.VITE_JOBS_API_URL as string | undefined;
    const fallback = (import.meta as any).env?.VITE_API_URL?.replace(/\/api\/?$/, '/jobsApi') as string | undefined;
    return envBase || fallback || '/jobsApi';
}

function merchantUrl(path: string): string {
    const base = getApiBase().replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${base}/v1/merchant${normalized}`;
}

// =============================================================================
// FETCH HELPER
// =============================================================================

async function fetchMerchant<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const session = getMerchantSession();
    if (!session) {
        throw new Error('No merchant session. Please use a valid magic link.');
    }

    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${session.accessToken}`);
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(merchantUrl(path), { ...init, headers });
    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        const message =
            typeof payload === 'string'
                ? payload
                : (payload as any)?.error?.message || (payload as any)?.message || `HTTP ${response.status}`;
        throw new Error(message);
    }

    return (payload as any).data ?? payload;
}

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Exchange a raw magic link token for a session.
 * This is the ONLY unauthenticated call.
 */
export async function exchangeMerchantToken(rawToken: string): Promise<MerchantSession> {
    const base = getApiBase().replace(/\/$/, '');
    const response = await fetch(`${base}/v1/merchant/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawToken }),
    });

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        const message =
            typeof payload === 'string'
                ? payload
                : (payload as any)?.error?.message || 'Invalid or expired token';
        throw new Error(message);
    }

    const data = (payload as any).data;
    const session: MerchantSession = {
        accessToken: data.accessToken,
        listingId: data.listingId,
        scopes: data.scopes,
    };

    setMerchantSession(session);
    return session;
}

/**
 * Job type for merchant view.
 */
export interface MerchantJob {
    id: string;
    actionType: string;
    actionData: Record<string, any>;
    status: string;
    jobCode: string;
    createdAt: string;
    confirmedByUserAt?: string;
}

/**
 * Get jobs for the merchant's listing.
 */
export async function getMerchantJobs(): Promise<MerchantJob[]> {
    return fetchMerchant<MerchantJob[]>('/jobs');
}

/**
 * Accept a job.
 */
export async function acceptJob(jobId: string): Promise<MerchantJob> {
    return fetchMerchant<MerchantJob>(`/jobs/${jobId}/accept`, {
        method: 'POST',
    });
}

/**
 * Decline a job.
 */
export async function declineJob(jobId: string, reason?: string): Promise<MerchantJob> {
    return fetchMerchant<MerchantJob>(`/jobs/${jobId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
    });
}
