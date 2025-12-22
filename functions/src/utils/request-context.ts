import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestContextValues {
    requestId: string;
    businessId?: string;
    sessionId?: string;
    docId?: string;
}

const storage = new AsyncLocalStorage<RequestContextValues>();

export function runWithRequestContext<T>(
    values: RequestContextValues,
    fn: () => T
): T {
    return storage.run(values, fn);
}

export function getRequestContext(): Partial<RequestContextValues> {
    return storage.getStore() ?? {};
}

export function setRequestContext(values: Partial<RequestContextValues>): void {
    const store = storage.getStore();
    if (!store) return;
    Object.assign(store, values);
}

export function getOrCreateRequestId(maybeRequestId?: string): string {
    const trimmed = (maybeRequestId || '').trim();
    if (trimmed) return trimmed;
    return randomUUID();
}

