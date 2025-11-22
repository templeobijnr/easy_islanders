
import { UnifiedItem } from './marketplace';
import { Booking } from './booking';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  recommendedItems?: UnifiedItem[];
  booking?: Booking;
  paymentRequest?: boolean;
  whatsappTriggered?: boolean;
}

export interface StoredMessage {
  role: 'user' | 'model' | 'system';
  parts: { text?: string }[];
  timestamp: Date;
  metadata?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string;
}
