import { useEffect, useReducer } from "react";
import type {
  UnifiedListing,
  ListingType,
  BookingOptions,
  ListingActions,
} from "../../../../types/UnifiedListing";
import {
  DEFAULT_BOOKING_OPTIONS,
  DEFAULT_LISTING_ACTIONS,
  CATEGORY_BOOKING_PRESETS,
} from "../../../../types/UnifiedListing";
import { LISTING_CATEGORIES } from "../unifiedListingForm.constants";

export interface ListingFormState {
  type: ListingType;
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
  bookingEnabled: boolean;
  bookingOptions: BookingOptions;
  actions: ListingActions;
  googlePlaceId: string;
  // Stay-specific fields
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
  showOnMap: boolean;
  // Merve integration fields
  merveEnabled: boolean;
  merveToolType: string;
  merveWhatsappE164: string;
  merveDispatchTemplate: string;
  merveCoverageAreas: string;
  merveTags: string;
}

export type ListingFormSetState = (
  next: ListingFormState | ((prev: ListingFormState) => ListingFormState),
) => void;

type Action =
  | { type: "set"; state: ListingFormState }
  | { type: "update"; patch: Partial<ListingFormState> }
  | { type: "updateFn"; updater: (prev: ListingFormState) => ListingFormState };

function reducer(state: ListingFormState, action: Action): ListingFormState {
  switch (action.type) {
    case "set":
      return action.state;
    case "update":
      return { ...state, ...action.patch };
    case "updateFn":
      return action.updater(state);
    default:
      return state;
  }
}

function getDefaultState(): ListingFormState {
  return {
    type: "place",
    category: "restaurants",
    subcategory: "",
    title: "",
    description: "",
    address: "",
    lat: 35.33,
    lng: 33.32,
    region: "Kyrenia",
    subregion: "",
    cityId: "north-cyprus",
    phone: "",
    email: "",
    website: "",
    images: [],
    rating: 0,
    priceLevel: 0,
    displayPrice: "",
    openingHours: [],
    bookingEnabled: true,
    bookingOptions: { ...DEFAULT_BOOKING_OPTIONS },
    actions: { ...DEFAULT_LISTING_ACTIONS },
    googlePlaceId: "",
    // Stay-specific defaults
    propertyType: "Villa",
    bedrooms: 2,
    bathrooms: 1,
    amenities: [],
    pricePerNight: 0,
    currency: "GBP",
    cleaningFee: 0,
    hostName: "",
    hostPhone: "",
    hostEmail: "",
    showOnMap: true,
    // Merve integration defaults
    merveEnabled: false,
    merveToolType: "restaurant",
    merveWhatsappE164: "",
    merveDispatchTemplate: "",
    merveCoverageAreas: "",
    merveTags: "",
  };
}

function fromEditingListing(editingListing: UnifiedListing): ListingFormState {
  return {
    ...getDefaultState(),
    type: editingListing.type,
    category: editingListing.category,
    subcategory: editingListing.subcategory || "",
    title: editingListing.title,
    description: editingListing.description,
    address: editingListing.address,
    lat: editingListing.lat,
    lng: editingListing.lng,
    region: editingListing.region,
    subregion: (editingListing as any).subregion || "",
    cityId: editingListing.cityId,
    phone: editingListing.phone || "",
    email: editingListing.email || "",
    website: editingListing.website || "",
    images: editingListing.images,
    rating: editingListing.rating || 0,
    priceLevel: editingListing.priceLevel || 0,
    displayPrice: editingListing.displayPrice || "",
    openingHours: editingListing.openingHours || [],
    bookingEnabled: editingListing.bookingEnabled,
    bookingOptions: editingListing.bookingOptions || {
      ...DEFAULT_BOOKING_OPTIONS,
    },
    actions: editingListing.actions || { ...DEFAULT_LISTING_ACTIONS },
    googlePlaceId: editingListing.googlePlaceId || "",
    showOnMap: (editingListing as any).showOnMap ?? true,
    // Stay-specific fields
    propertyType: (editingListing as any).propertyType || "Villa",
    bedrooms: (editingListing as any).bedrooms || 2,
    bathrooms: (editingListing as any).bathrooms || 1,
    amenities: (editingListing as any).amenities || [],
    pricePerNight: (editingListing as any).pricePerNight || 0,
    currency: (editingListing as any).currency || "GBP",
    cleaningFee: (editingListing as any).cleaningFee || 0,
    hostName: (editingListing as any).hostName || "",
    hostPhone: (editingListing as any).hostPhone || "",
    hostEmail: (editingListing as any).hostEmail || "",
    // Merve integration fields
    merveEnabled: (editingListing as any).merve?.enabled || false,
    merveToolType: (editingListing as any).merve?.toolType || "restaurant",
    merveWhatsappE164: (editingListing as any).merve?.whatsappE164 || "",
    merveDispatchTemplate:
      (editingListing as any).merve?.dispatchTemplate || "",
    merveCoverageAreas: (
      (editingListing as any).merve?.coverageAreas || []
    ).join(", "),
    merveTags: ((editingListing as any).merve?.tags || []).join(", "),
  };
}

export function useListingForm(editingListing?: UnifiedListing | null) {
  const [form, dispatch] = useReducer(reducer, undefined, getDefaultState);

  const setForm: ListingFormSetState = (next) => {
    if (typeof next === "function") {
      dispatch({
        type: "updateFn",
        updater: next as (prev: ListingFormState) => ListingFormState,
      });
      return;
    }
    dispatch({ type: "set", state: next });
  };

  useEffect(() => {
    if (!editingListing) return;
    dispatch({ type: "set", state: fromEditingListing(editingListing) });
  }, [editingListing]);

  const handleCategoryChange = (newCategory: string) => {
    const categoryConfig = LISTING_CATEGORIES.find(
      (c) => c.value === newCategory,
    );
    const bookingPreset = (CATEGORY_BOOKING_PRESETS as any)[newCategory] || {};

    dispatch({
      type: "updateFn",
      updater: (prev) => ({
        ...prev,
        category: newCategory,
        type: (categoryConfig?.type || "place") as ListingType,
        bookingOptions: {
          ...DEFAULT_BOOKING_OPTIONS,
          ...bookingPreset,
        },
      }),
    });
  };

  return { form, setForm, handleCategoryChange };
}
