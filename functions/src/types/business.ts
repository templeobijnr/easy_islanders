
import { MarketplaceDomain } from './enums';

export interface BusinessConfig {
    id?: string;
    ownerUid?: string;
    domain: MarketplaceDomain | null;
    subType: 'rental' | 'sale' | null;
    businessName: string;
}
