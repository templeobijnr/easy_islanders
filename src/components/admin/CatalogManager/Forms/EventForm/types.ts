/**
 * EventForm - Types
 */
import type { UnifiedListing, MerveConfig } from "../../../../../types";

export interface EventFormProps {
    initialValue?: UnifiedListing | null;
    onSave: (listing: UnifiedListing) => void;
    onCancel?: () => void;
}

export interface EventFormState {
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
    displayPrice: string;
    googlePlaceId: string;
    showOnMap: boolean;
    bookingEnabled: boolean;
    eventDate: string;
    eventTime: string;
    eventEndDate: string;
    eventEndTime: string;
    venueName: string;
    merveConfig: Partial<MerveConfig>;
}

export const DEFAULT_EVENT_STATE: EventFormState = {
    category: "community",
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
    displayPrice: "",
    googlePlaceId: "",
    showOnMap: true,
    bookingEnabled: false,
    eventDate: "",
    eventTime: "",
    eventEndDate: "",
    eventEndTime: "",
    venueName: "",
    merveConfig: { enabled: false, actions: [] },
};
