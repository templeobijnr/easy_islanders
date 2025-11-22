
import { MarketplaceDomain } from './enums';

export interface AgentPersona {
  id: string;
  name: string;
  role: string;
  description: string;
  domainFocus: MarketplaceDomain[];
  color: string;
  iconName: 'Building2' | 'Car' | 'Sparkles' | 'Utensils' | 'Hotel';
  avatarUrl: string; 
}
