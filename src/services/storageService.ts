
import { ListingsStorage } from './storage/listings';
import { BookingStorage } from './storage/bookings';
import { SocialStorage } from './storage/social';
import { CrmStorage } from './storage/crm';
import { SeederStorage } from './storage/seeder';
import { UserNotification } from '../types';

// --- Simple Event Emitter for Reactive UI ---
type Listener = () => void;
const listeners: Record<string, Listener[]> = {};

const emit = (event: string) => {
  if (listeners[event]) {
    listeners[event].forEach(l => l());
  }
};

const subscribe = (event: string, callback: Listener) => {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(callback);
  return () => {
    listeners[event] = listeners[event].filter(l => l !== callback);
  };
};

// --- Notification Storage (Local Only for Demo) ---
const getNotifications = (): UserNotification[] => {
  const stored = localStorage.getItem('islander_notifications');
  return stored ? JSON.parse(stored) : [];
};

const saveNotification = (notif: UserNotification) => {
  const current = getNotifications();
  const updated = [notif, ...current];
  localStorage.setItem('islander_notifications', JSON.stringify(updated));
  emit('notifications');
};

const markNotificationRead = (id: string) => {
  const current = getNotifications();
  const updated = current.map(n => n.id === id ? { ...n, read: true } : n);
  localStorage.setItem('islander_notifications', JSON.stringify(updated));
  emit('notifications');
};

// Wrap existing storage methods to emit events
const wrapWithEmit = (module: any, eventName: string) => {
  const wrapped: any = {};
  Object.keys(module).forEach(key => {
    if (typeof module[key] === 'function') {
      wrapped[key] = async (...args: any[]) => {
        const result = await module[key](...args);
        // Only emit on save/update methods, simplistic check
        if (key.startsWith('save') || key.startsWith('update') || key.startsWith('delete') || key.startsWith('toggle')) {
          emit(eventName);
        }
        return result;
      };
    } else {
      wrapped[key] = module[key];
    }
  });
  return wrapped;
};

export const StorageService = {
  ...wrapWithEmit(ListingsStorage, 'listings'),
  ...wrapWithEmit(BookingStorage, 'bookings'),
  ...wrapWithEmit(SocialStorage, 'social'),
  ...wrapWithEmit(CrmStorage, 'crm'),
  ...SeederStorage,
  
  // Notification Methods
  getNotifications,
  saveNotification,
  markNotificationRead,
  
  // Pub/Sub
  subscribe,
  emit
};
