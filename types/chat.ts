
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
