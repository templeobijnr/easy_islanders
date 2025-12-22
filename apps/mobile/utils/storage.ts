import * as SecureStore from 'expo-secure-store';
import { StorageAdapter } from '@askmerve/api-client';

export class SecureStoreAdapter implements StorageAdapter {
    async getItem(key: string): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (e) {
            console.error('SecureStore getItem error:', e);
            return null;
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (e) {
            console.error('SecureStore setItem error:', e);
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (e) {
            console.error('SecureStore removeItem error:', e);
        }
    }
}
