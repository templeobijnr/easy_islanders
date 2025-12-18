import { useReducer } from "react";
import type {
  CurationMode,
  GeocodingResult,
  LocationMode,
  Venue,
} from "../curationTypes";

export type UploadingImage = { file: File; progress: number };

export interface CurationFormState {
  mode: CurationMode;
  isLoading: boolean;

  locationMode: LocationMode;
  searchQuery: string;
  venues: Venue[];
  filteredVenues: Venue[];
  selectedVenue: Venue | null;

  geoSearchQuery: string;
  geoResults: GeocodingResult[];
  selectedLocation: GeocodingResult | null;
  isGeoSearching: boolean;

  manualAddress: string;
  manualLat: string;
  manualLng: string;

  eventTitle: string;
  eventDesc: string;
  eventCategory: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  region: string;

  uploadedImages: string[];
  uploadingImages: UploadingImage[];

  enabledActions: Record<string, boolean>;
  actionUrls: Record<string, string>;

  selectedSections: string[];
}

type Updater<T> = T | ((prev: T) => T);

type Action =
  | { type: "set"; field: keyof CurationFormState; next: Updater<any> }
  | { type: "resetSections"; activeSection: string };

function applyUpdater<T>(prev: T, next: Updater<T>): T {
  return typeof next === "function" ? (next as (p: T) => T)(prev) : next;
}

function createInitialState(activeSection: string): CurationFormState {
  return {
    mode: "quick",
    isLoading: false,

    locationMode: "venue",
    searchQuery: "",
    venues: [],
    filteredVenues: [],
    selectedVenue: null,

    geoSearchQuery: "",
    geoResults: [],
    selectedLocation: null,
    isGeoSearching: false,

    manualAddress: "",
    manualLat: "",
    manualLng: "",

    eventTitle: "",
    eventDesc: "",
    eventCategory: "party",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    region: "kyrenia",

    uploadedImages: [],
    uploadingImages: [],

    enabledActions: {},
    actionUrls: {},

    selectedSections: [activeSection],
  };
}

function reducer(state: CurationFormState, action: Action): CurationFormState {
  switch (action.type) {
    case "set":
      return {
        ...state,
        [action.field]: applyUpdater((state as any)[action.field], action.next),
      };
    case "resetSections":
      return { ...state, selectedSections: [action.activeSection] };
    default:
      return state;
  }
}

export function useCurationForm(activeSection: string) {
  const [state, dispatch] = useReducer(
    reducer,
    activeSection,
    createInitialState,
  );

  const setField =
    <K extends keyof CurationFormState>(field: K) =>
    (next: Updater<CurationFormState[K]>) =>
      dispatch({ type: "set", field, next });

  return {
    state,

    setMode: setField("mode"),
    setIsLoading: setField("isLoading"),

    setLocationMode: setField("locationMode"),
    setSearchQuery: setField("searchQuery"),
    setVenues: setField("venues"),
    setFilteredVenues: setField("filteredVenues"),
    setSelectedVenue: setField("selectedVenue"),

    setGeoSearchQuery: setField("geoSearchQuery"),
    setGeoResults: setField("geoResults"),
    setSelectedLocation: setField("selectedLocation"),
    setIsGeoSearching: setField("isGeoSearching"),

    setManualAddress: setField("manualAddress"),
    setManualLat: setField("manualLat"),
    setManualLng: setField("manualLng"),

    setEventTitle: setField("eventTitle"),
    setEventDesc: setField("eventDesc"),
    setEventCategory: setField("eventCategory"),
    setStartDate: setField("startDate"),
    setStartTime: setField("startTime"),
    setEndDate: setField("endDate"),
    setEndTime: setField("endTime"),
    setRegion: setField("region"),

    setUploadedImages: setField("uploadedImages"),
    setUploadingImages: setField("uploadingImages"),

    setEnabledActions: setField("enabledActions"),
    setActionUrls: setField("actionUrls"),

    setSelectedSections: setField("selectedSections"),
    resetSelectedSections: () =>
      dispatch({ type: "resetSections", activeSection }),
  };
}
