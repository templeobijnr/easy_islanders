/**
 * StayForm - Types
 */
import type { UnifiedListing, MerveConfig } from "../../../../../types";

export interface StayFormProps {
    initialValue?: UnifiedListing | null;
    onSave: (listing: UnifiedListing) => void;
    onCancel?: () => void;
}

export interface StayFormState {
    category: string;
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
    propertyType: string;
    bedrooms: number;
    bathrooms: number;
    amenities: string[];
    pricePerNight: number;
    currency: string;
    cleaningFee: number;
    hostName: string;
    hostPhone: string;
    hostEmail: string;
    bookingEnabled: boolean;
    merveConfig: Partial<MerveConfig>;
}

export const DEFAULT_STAY_STATE: StayFormState = {
    category: "stays_villas",
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
    propertyType: "Villa",
    bedrooms: 1,
    bathrooms: 1,
    amenities: [],
    pricePerNight: 0,
    currency: "EUR",
    cleaningFee: 0,
    hostName: "",
    hostPhone: "",
    hostEmail: "",
    bookingEnabled: false,
    merveConfig: { enabled: false, actions: [] },
};
