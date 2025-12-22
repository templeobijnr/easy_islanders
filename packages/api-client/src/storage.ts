/**
 * Storage Adapter Interface
 *
 * Platform-agnostic storage abstraction for token management.
 * Web uses localStorage, mobile uses expo-secure-store.
 */

/**
 * Storage adapter that both web and mobile must implement.
 */
export interface StorageAdapter {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
}

/**
 * Browser localStorage adapter.
 * Use this in web applications.
 */
export class LocalStorageAdapter implements StorageAdapter {
    async getItem(key: string): Promise<string | null> {
        return localStorage.getItem(key);
    }

    async setItem(key: string, value: string): Promise<void> {
        localStorage.setItem(key, value);
    }

    async removeItem(key: string): Promise<void> {
        localStorage.removeItem(key);
    }
}

/**
 * In-memory storage adapter for testing.
 */
export class InMemoryStorageAdapter implements StorageAdapter {
    private store: Map<string, string> = new Map();

    async getItem(key: string): Promise<string | null> {
        return this.store.get(key) ?? null;
    }

    async setItem(key: string, value: string): Promise<void> {
        this.store.set(key, value);
    }

    async removeItem(key: string): Promise<void> {
        this.store.delete(key);
    }

    clear(): void {
        this.store.clear();
    }
}
