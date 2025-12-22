/**
 * PropertyFormModal Types
 */
import type { Listing } from '../../../../types';

export interface PropertyFormData {
    title: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    rentalType: string;
    location: string;
    bedrooms: number;
    bathrooms: number;
    squareMeters: number;
    plotSize: number;
    buildYear: number;
    furnishedStatus: string;
    amenities: string[];
    imageUrl: string;
    images: string[];
    latitude: number;
    longitude: number;
    formattedAddress: string;
    status: string;
    views?: number;
    depositNeeded?: boolean;
    cleaningFee?: number;
    monthlyDeposit?: number;
    titleDeedType?: string;
    paymentPlanAvailable?: boolean;
    placeName?: string;
    region?: string;
    country?: string;
}

export interface MapboxContextItem {
    id?: string;
    text?: string;
}

export interface MapboxFeature {
    id: string;
    text: string;
    place_name: string;
    center?: [number, number];
    context?: MapboxContextItem[];
    properties?: Record<string, unknown>;
}

export interface PropertyFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (property: Partial<PropertyFormData>) => Promise<void>;
    initialData?: Listing;
    isEditMode?: boolean;
    initialView?: 'overview' | 'edit';
}

export type FormTab = 'essentials' | 'details' | 'location' | 'amenities' | 'media';
