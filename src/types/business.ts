
import { MarketplaceDomain } from './enums';

export interface AvailabilityConfig {
  enabled: boolean;
  defaultHours: {
    open: string;   // HH:MM format
    close: string;  // HH:MM format
  };
  daysOpen: string[];  // ["monday", "tuesday", ...]
}

export interface BlockedTimeRange {
  startTime: string;  // HH:MM format
  endTime: string;    // HH:MM format
  reason?: string;
}

export interface BlockedDate {
  id: string;
  date: string;  // YYYY-MM-DD
  allDay?: boolean;  // true = entire day blocked
  timeBlocks?: BlockedTimeRange[];  // specific time ranges blocked
  reason?: string;
  createdAt?: any;  // Firestore timestamp
}

export interface BusinessConfig {
  id?: string;
  ownerUid?: string;
  domain: MarketplaceDomain | null;
  subType: 'rental' | 'sale' | null;
  businessName: string;
  agentConfig?: {
    tone: 'Friendly' | 'Professional' | 'Luxury' | 'Party Vibe' | string;
    isActive: boolean;
    rules: string[];
    customInputs?: string;
  };
  availability?: AvailabilityConfig;
}
