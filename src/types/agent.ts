
import { MarketplaceDomain } from './enums';

/**
 * Declarative description of an AI agent persona.
 *
 * These objects are used by the frontend to:
 *  - render the agent switcher (name, color, icon)
 *  - decide which marketplace domains each persona focuses on
 *  - pick the right avatar + copy to show in the chat header
 *
 * The backend system prompt also uses `domainFocus` + `role`
 * to specialise behaviour per persona (e.g. real‑estate vs taxis).
 */
export interface AgentPersona {
  id: string;

  /** Display name shown in the UI, e.g. "Merve" or "City OS". */
  name: string;

  /** Short label for what this agent is (Real Estate Specialist, Concierge, etc.). */
  role: string;

  /** Longer description used in intros / context copy. */
  description: string;

  /** Domains this agent is allowed to handle directly. */
  domainFocus: MarketplaceDomain[];

  /** Brand color used for badges, accents, etc. */
  color: string;

  /** Icon from the design system for this persona. */
  iconName: 'Building2' | 'Car' | 'Sparkles' | 'Utensils' | 'Hotel';

  /** Avatar image URL for the chat header / agent chips. */
  avatarUrl: string; 
}
