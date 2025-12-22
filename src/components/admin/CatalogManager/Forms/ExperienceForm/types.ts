/**
 * ExperienceForm - Types
 */
import type { UnifiedListing, MerveConfig } from "../../../../../types";

export interface ExperienceFormProps {
    initialValue?: UnifiedListing | null;
    onSave: (listing: UnifiedListing) => void;
    onCancel?: () => void;
}

export interface ExperienceFormState {
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
    merveConfig: Partial<MerveConfig>;
}

export const DEFAULT_EXPERIENCE_STATE: ExperienceFormState = {
    category: "tours",
    subcategory: "",
    title: "",
    description: "",
    address: "",
    lat: 0,
    lng: 0,
    region: "",
    subregion: "",
    cityId: "",
    phone: "",
    email: "",
    website: "",
    images: [],
    rating: 0,
    priceLevel: 0,
    displayPrice: "",
    openingHours: [],
    googlePlaceId: "",
    showOnMap: true,
    bookingEnabled: false,
    merveConfig: { enabled: false, actions: [] },
};
