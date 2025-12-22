/**
 * PlaceForm Types
 */
import type { UnifiedListing } from '@/types/UnifiedListing';
import type { MerveConfig } from '../../sections/MerveIntegrationSection';

export interface PlaceFormProps {
    initialValue?: UnifiedListing | null;
    onSave: (listing: UnifiedListing) => void;
    onCancel?: () => void;
}

export interface PlaceFormState {
    category: string;
    subcategory: string;
    title: string;
    description: string;
    address: string;
    lat: number;
    lng: number;
    region: string;
    subregion: string;
    cityId: string;
    phone: string;
    email: string;
    website: string;
    images: string[];
    rating: number;
    priceLevel: number;
    displayPrice: string;
    openingHours: string[];
    googlePlaceId: string;
    showOnMap: boolean;
    bookingEnabled: boolean;
    // Pin Actions for Map
    allowCheckIn: boolean;
    allowJoin: boolean;
    allowWave: boolean;
    allowTaxi: boolean;
    allowNavigate: boolean;
    // Merve integration (new actions[] model)
    merveConfig: Partial<MerveConfig>;
}

export interface PlaceCategory {
    value: string;
    label: string;
    googleType: string;
    searchKeyword: string;
}

export interface ImportSuggestion {
    id: string;
    primary: string;
    secondary: string;
}
