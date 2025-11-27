
import { UnifiedItem } from './marketplace';
import { Booking } from './booking';

/**
 * Single chat message in the Agent UI.
 *
 * This is the shape used by the frontend chat components and
 * is intentionally a simplified view over the richer backend
 * `chatSessions/{session}/messages` documents.
 */
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;

  /**
   * Optional structured suggestions returned with this turn,
   * e.g. listings the agent recommends in response to a query.
   */
  recommendedItems?: UnifiedItem[];

  /**
   * Booking object created/updated as part of this turn
   * (short‑term stay, long‑term viewing, taxi, etc.).
   */
  booking?: Booking;

  /**
   * Indicates that this turn should surface a payment
   * affordance in the UI (e.g. Stripe checkout card).
   */
  paymentRequest?: boolean;

  /**
   * Set when this turn triggered a WhatsApp side‑effect
   * (e.g. taxi dispatch, vendor contact) so the UI can
   * reflect that something also happened off‑platform.
   */
  whatsappTriggered?: boolean;

  /**
   * Optional map location to show alongside the message.
   * Used when the agent wants to present a pin on the
   * island map (e.g. "here is the villa you asked about").
   */
  mapLocation?: {
    lat: number;
    lng: number;
    title: string;
  };
}
