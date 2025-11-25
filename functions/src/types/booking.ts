
import { MarketplaceDomain } from './enums';

export interface UserDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappPreferred: boolean;
  trackingPreference: 'minimal' | 'personalized' | 'none';
  notes?: string;
}

export interface UpsellService {
  id: string;
  label: string;
  description: string;
  price: number;
  iconName: 'Car' | 'Utensils' | 'MapPin' | 'Wine' | 'Sparkles' | 'Compass';
  selected: boolean;
}

export interface Booking {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  domain: MarketplaceDomain;
  customerName: string; 
  customerContact?: string; 
  date: string; 
  confirmationNumber?: string;
  
  status: 
    | 'payment_pending' 
    | 'confirmed' 
    | 'viewing_requested' 
    | 'viewing_awaiting_owner' 
    | 'viewing_confirmed' 
    | 'taxi_dispatched' 
    | 'meeting_requested' 
    | 'cooking' 
    | 'ready' 
    | 'delivered' 
    | 'cancelled'
    | 'new'
    | 'served';
  
  totalPrice: number;
  
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  viewingTime?: string; 
  serviceDate?: string; 
  quantity?: number;
  
  paymentMethod?: 'card' | 'cash' | 'crypto';
  receiptUrl?: string;
  
  whatsappStatus?: 'sending' | 'sent' | 'read' | 'replied';
  agentPhone?: string;

  specialRequests?: string;
  needsPickup?: boolean;
  userDetails?: UserDetails;
  selectedUpsells?: UpsellService[];
  
  pickupCoordinates?: { lat: number, lng: number };
  driverDetails?: { name: string, plate: string, car: string, eta: string };
}

export interface ConsumerRequest {
  id: string;
  userId: string; // 'me' for demo
  content: string;
  domain: MarketplaceDomain;
  status: 'pending' | 'forwarded' | 'fulfilled';
  timestamp: string;
  budget?: number;
  responses?: number;
}

export interface PromotionSubscription {
  id: string;
  label: string;
  domain: MarketplaceDomain | 'All';
  isSubscribed: boolean;
}
