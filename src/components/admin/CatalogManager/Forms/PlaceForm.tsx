import { logger } from "@/utils/logger";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Loader2, Save, Search, Phone, Globe, ChevronDown } from "lucide-react";
import ImageUploader from "../../Shared/ImageUploader";
import LocationPicker, { LocationValue } from "../../Shared/LocationPicker";
import OfferingsManager from "../sections/OfferingsManager";
import MerveIntegrationSection, {
  MerveConfig,
} from "../sections/MerveIntegrationSection";
import {
  UnifiedListing,
  DEFAULT_BOOKING_OPTIONS,
  DEFAULT_LISTING_ACTIONS,
  CATEGORY_BOOKING_PRESETS,
} from "../../../../types/UnifiedListing";
import { UnifiedListingsService } from "../../../../services/unifiedListingsService";
import { GoogleImportService } from "../../../../services/googleImportService";

// ============================================================================
// PLACE FORM - Form component for Place listings (general businesses)
// ============================================================================

const PLACES_PROXY_URL =
  import.meta.env.VITE_PLACES_PROXY_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") +
      "/googlePlacesProxy"
    : "");

// Place categories with search keywords for accurate Google results
const PLACE_CATEGORIES = [
  {
    value: "restaurants",
    label: "🍽️ Restaurants",
    googleType: "restaurant",
    searchKeyword: "restaurant dining food",
  },
  {
    value: "cafes",
    label: "☕ Cafes",
    googleType: "cafe",
    searchKeyword: "cafe coffee shop",
  },
  {
    value: "bars",
    label: "🍺 Bars",
    googleType: "bar",
    searchKeyword: "bar pub drinks",
  },
  {
    value: "spas_wellness",
    label: "💆 Spas & Wellness",
    googleType: "spa",
    searchKeyword: "spa massage wellness",
  },
  {
    value: "gyms_fitness",
    label: "💪 Gyms & Fitness",
    googleType: "gym",
    searchKeyword: "gym fitness center workout",
  },
  {
    value: "beauty_salons",
    label: "💇 Beauty Salons",
    googleType: "beauty_salon",
    searchKeyword: "beauty salon hair nails",
  },
  {
    value: "nightlife",
    label: "🍸 Nightlife",
    googleType: "night_club",
    searchKeyword: "nightclub club disco lounge",
  },
  {
    value: "shopping",
    label: "🛍️ Shopping",
    googleType: "shopping_mall",
    searchKeyword: "shopping mall store boutique",
  },
  {
    value: "car_rentals",
    label: "🚗 Car Rentals",
    googleType: "car_rental",
    searchKeyword: "car rental hire vehicle",
  },
  {
    value: "services",
    label: "🛠️ Services",
    googleType: "establishment",
    searchKeyword: "services local business",
  },
  {
    value: "pharmacies",
    label: "💊 Pharmacies",
    googleType: "pharmacy",
    searchKeyword: "pharmacy chemist drugstore",
  },
];

// Dynamic regions will be fetched from config - no more hardcoding!
import {
  getDiscoverConfig,
  getAllRegions,
} from "../../../../services/discoverConfigService";
import { normalizeLocation } from "../../../../utils/LocationNormalizer";
import {
  buildLocationId,
  buildLocationLabel,
} from "../../../../utils/LocationValidator";
import {
  RegionConfig,
  NormalizationResult,
} from "../../../../types/adminConfig";

// Types
interface PlaceFormProps {
  initialValue?: UnifiedListing | null;
  onSave: (listing: UnifiedListing) => void;
  onCancel?: () => void;
}

interface PlaceFormState {
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

const PlaceForm: React.FC<PlaceFormProps> = ({
  initialValue,
  onSave,
  onCancel,
}) => {
  // Form state
  const [form, setForm] = useState<PlaceFormState>({
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
    googlePlaceId: "",
    showOnMap: true,
    bookingEnabled: true,
    // Pin Actions defaults
    allowCheckIn: true,
    allowJoin: false,
    allowWave: true,
    allowTaxi: true,
    allowNavigate: true,
    // Merve integration (new actions[] model)
    merveConfig: {
      enabled: false,
      actions: [],
      whatsappE164: "",
      coverageAreas: [],
      tags: [],
    },
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showBookingOptions, setShowBookingOptions] = useState(false);

  // Dynamic regions from config
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(true);

  // Location normalization state
  const [normalizationResult, setNormalizationResult] =
    useState<NormalizationResult | null>(null);

  // Google import state
  const [importSearchQuery, setImportSearchQuery] = useState("");
  const [importSuggestions, setImportSuggestions] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load regions from config on mount
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const allRegions = await getAllRegions();
        setRegions(allRegions);
        // Set default region if none selected
        if (!form.region && allRegions.length > 0) {
          setForm((prev) => ({ ...prev, region: allRegions[0].label }));
        }
      } catch (err) {
        console.error("Failed to load regions:", err);
      } finally {
        setRegionsLoading(false);
      }
    };
    loadRegions();
  }, []);

  // Initialize form from initialValue (editing mode)
  useEffect(() => {
    if (initialValue) {
      const actions = (initialValue as any).actions || {};
      setForm({
        category: initialValue.category,
        subcategory: initialValue.subcategory || "",
        title: initialValue.title,
        description: initialValue.description,
        address: initialValue.address,
        lat: initialValue.lat,
        lng: initialValue.lng,
        region: initialValue.region,
        subregion: (initialValue as any).subregion || "",
        cityId: initialValue.cityId,
        phone: initialValue.phone || "",
        email: initialValue.email || "",
        website: initialValue.website || "",
        images: initialValue.images,
        rating: initialValue.rating || 0,
        priceLevel: initialValue.priceLevel || 0,
        displayPrice: initialValue.displayPrice || "",
        openingHours: initialValue.openingHours || [],
        googlePlaceId: initialValue.googlePlaceId || "",
        showOnMap: (initialValue as any).showOnMap ?? true,
        bookingEnabled: initialValue.bookingEnabled,
        // Pin actions from stored values
        allowCheckIn: actions.allowCheckIn ?? true,
        allowJoin: actions.allowJoin ?? false,
        allowWave: actions.allowWave ?? true,
        allowTaxi: actions.allowTaxi ?? true,
        allowNavigate: actions.allowNavigate ?? true,
        // Merve integration from existing data (supports both legacy and new format)
        merveConfig: {
          enabled: (initialValue as any).merve?.enabled || false,
          actions: (initialValue as any).merve?.actions || [],
          whatsappE164: (initialValue as any).merve?.whatsappE164 || "",
          coverageAreas: (initialValue as any).merve?.coverageAreas || [],
          tags: (initialValue as any).merve?.tags || [],
          geo: (initialValue as any).merve?.geo,
        },
      });
    }
  }, [initialValue]);

  // Handle location change from LocationPicker
  const handleLocationChange = (location: LocationValue) => {
    setForm((prev) => ({
      ...prev,
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      googlePlaceId: location.placeId || prev.googlePlaceId,
    }));
  };

  // Handle Google Import search
  const handleImportSearch = async (query: string) => {
    setImportSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setImportSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsImporting(true);
      try {
        const res = await fetch(
          `${PLACES_PROXY_URL}?action=autocomplete&input=${encodeURIComponent(query)}&region=cy`,
        );
        const data = await res.json();
        if (data.predictions) {
          setImportSuggestions(
            data.predictions.map((p: any) => ({
              id: p.place_id,
              primary: p.structured_formatting?.main_text || p.description,
              secondary: p.structured_formatting?.secondary_text || "",
            })),
          );
        }
      } catch (err) {
        console.error("Import search failed:", err);
      } finally {
        setIsImporting(false);
      }
    }, 300);
  };

  // Handle Google Place Import
  const handleImportPlace = async (placeId: string) => {
    setIsImporting(true);
    setImportSuggestions([]);
    setImportSearchQuery("");

    try {
      const details = await GoogleImportService.getPlaceDetails(placeId);
      if (!details) {
        setError("Failed to fetch place details");
        return;
      }

      const mapped = GoogleImportService.mapToActivity(details);

      let importedImages: string[] = [];
      if (details.photos?.length) {
        try {
          importedImages = await GoogleImportService.importImages(
            details.photos.slice(0, 5),
            placeId,
          );
        } catch (err) {
          console.warn("Image import failed:", err);
        }
      }

      // Run location normalization
      const lat = details.geometry?.location?.lat;
      const lng = details.geometry?.location?.lng;
      const normResult = await normalizeLocation({
        lat,
        lng,
        address: details.formatted_address,
        addressComponents: (details as any).address_components,
      });

      // Store normalization result for UI display
      setNormalizationResult(normResult);

      // Auto-fill region/subregion based on normalization
      let detectedRegion = form.region;
      let detectedSubregion = "";

      if (normResult.match) {
        detectedRegion = normResult.match.regionLabel;
        if (normResult.match.subRegionLabel) {
          detectedSubregion = normResult.match.subRegionLabel;
        }
        logger.debug(
          `[LocationNormalizer] Matched: ${detectedRegion}/${detectedSubregion} (${normResult.match.method}, ${normResult.match.confidence}%)`,
        );
      }

      setForm((prev) => ({
        ...prev,
        title: mapped.title || prev.title,
        description: mapped.description || prev.description,
        address: details.formatted_address || mapped.region || prev.address,
        lat: lat || prev.lat,
        lng: lng || prev.lng,
        region: detectedRegion,
        subregion: detectedSubregion,
        phone: details.international_phone_number || prev.phone,
        website: details.website || prev.website,
        rating: details.rating || prev.rating,
        priceLevel: details.price_level || prev.priceLevel,
        openingHours: details.opening_hours?.weekday_text || prev.openingHours,
        images: importedImages.length > 0 ? importedImages : prev.images,
        googlePlaceId: placeId,
      }));

      setSuccess(false);
      setError("");
    } catch (err) {
      console.error("Import failed:", err);
      setError("Failed to import place details");
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Browse Category - Use descriptive search keywords for better results
  const handleBrowseCategory = async () => {
    const categoryConfig = PLACE_CATEGORIES.find(
      (c) => c.value === form.category,
    );
    if (!categoryConfig) return;

    setIsImporting(true);
    try {
      const location = form.subregion || form.region;
      // Use searchKeyword for more accurate results instead of just googleType
      const query = `${categoryConfig.searchKeyword} in ${location}, North Cyprus`;
      const res = await fetch(
        `${PLACES_PROXY_URL}?action=textsearch&query=${encodeURIComponent(query)}&region=cy`,
      );
      const data = await res.json();

      if (data.results) {
        setImportSuggestions(
          data.results.map((r: any) => ({
            id: r.place_id,
            primary: r.name,
            secondary: r.formatted_address,
          })),
        );
      }
    } catch (err) {
      console.error("Browse failed:", err);
    } finally {
      setIsImporting(false);
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    // Merve validation (no inference: actions must be explicitly configured)
    const enabledActions = (form.merveConfig.actions || []).filter(
      (a) => a.enabled,
    );
    const globalWhatsApp = form.merveConfig.whatsappE164?.trim() || "";
    const missingTargets = enabledActions.filter(
      (a) =>
        a.dispatch?.channel === "whatsapp" &&
        !(a.dispatch?.toE164?.trim() || globalWhatsApp),
    );
    if (form.merveConfig.enabled && missingTargets.length > 0) {
      setError(
        "Merve Integration: each enabled action needs a WhatsApp target (either Default WhatsApp or a per-action override).",
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Build merve object from MerveConfig
      const merveData = form.merveConfig.enabled
        ? {
            enabled: true,
            actions: (form.merveConfig.actions || []).map((a) => ({
              ...a,
              dispatch: {
                ...a.dispatch,
                toE164: a.dispatch?.toE164?.trim() || undefined,
                template: a.dispatch?.template?.trim() || undefined,
              },
              tags: a.tags?.map((t) => t.trim()).filter(Boolean) || undefined,
              notes: a.notes?.trim() || undefined,
            })),
            whatsappE164: form.merveConfig.whatsappE164?.trim() || undefined,
            coverageAreas: form.merveConfig.coverageAreas || [],
            tags: form.merveConfig.tags || [],
            geo: { lat: form.lat, lng: form.lng },
            // Derived for faster server queries; actions[] remains source of truth
            actionTypesEnabled: enabledActions.map((a) => a.actionType),
          }
        : { enabled: false };

      const listingData: Omit<
        UnifiedListing,
        "id" | "createdAt" | "updatedAt"
      > = {
        type: "place",
        category: form.category,
        subcategory: form.subcategory || undefined,
        title: form.title,
        description: form.description,
        address: form.address,
        lat: form.lat,
        lng: form.lng,
        region: form.region,
        cityId: form.cityId,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        images: form.images,
        rating: form.rating || undefined,
        priceLevel: form.priceLevel || undefined,
        displayPrice: form.displayPrice || undefined,
        openingHours:
          form.openingHours.length > 0 ? form.openingHours : undefined,
        bookingEnabled: form.bookingEnabled,
        bookingOptions: CATEGORY_BOOKING_PRESETS[form.category]
          ? {
              ...DEFAULT_BOOKING_OPTIONS,
              ...CATEGORY_BOOKING_PRESETS[form.category],
            }
          : DEFAULT_BOOKING_OPTIONS,
        actions: {
          ...DEFAULT_LISTING_ACTIONS,
          // Map Pin Actions
          allowCheckIn: form.allowCheckIn,
          allowJoin: form.allowJoin,
          allowWave: form.allowWave,
          allowTaxi: form.allowTaxi,
          allowNavigate: form.allowNavigate,
        } as any,
        googlePlaceId: form.googlePlaceId || undefined,
        showOnMap: form.showOnMap,
        approved: true,
        merve: merveData,
      } as any;

      if (initialValue?.id) {
        await UnifiedListingsService.update(initialValue.id, listingData);
      } else {
        await UnifiedListingsService.create(listingData);
      }

      setSuccess(true);
      setError("");

      setTimeout(() => {
        onSave(listingData as UnifiedListing);
      }, 1000);
    } catch (err: any) {
      console.error("Failed to save place:", err);
      setError(err.message || "Failed to save place");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 text-green-400 flex items-center gap-2">
          ✅ Place saved successfully!
        </div>
      )}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
          ❌ {error}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">📍 Place Details</h3>

            {/* Category & Region */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Category
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                >
                  {PLACE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Region
                  {normalizationResult?.match && (
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        normalizationResult.match.confidence >= 80
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {normalizationResult.match.method === "spatial"
                        ? "🛰️"
                        : "📝"}{" "}
                      {normalizationResult.match.confidence}%
                    </span>
                  )}
                </label>
                {regionsLoading ? (
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-500">
                    Loading regions...
                  </div>
                ) : (
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                    value={form.region}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        region: e.target.value,
                        subregion: "",
                      }));
                      setNormalizationResult(null); // Clear normalization when manually changed
                    }}
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Sub-region */}
            {(() => {
              const currentRegion = regions.find(
                (r) => r.label === form.region,
              );
              const subRegions = currentRegion?.subRegions || [];
              return (
                subRegions.length > 0 && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Sub-region / Area
                    </label>
                    <select
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
                      value={form.subregion}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          subregion: e.target.value,
                        }))
                      }
                    >
                      <option value="">All areas in {form.region}</option>
                      {subRegions.map((sub) => (
                        <option key={sub.id} value={sub.label}>
                          {sub.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              );
            })()}

            {/* 1-Click Import Search */}
            <div className="space-y-2">
              <label className="block text-sm text-slate-400">
                🔍 1-Click Import from Google
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-cyan-500 focus:outline-none text-white"
                    placeholder="Search businesses..."
                    value={importSearchQuery}
                    onChange={(e) => handleImportSearch(e.target.value)}
                  />
                  <Search
                    className="absolute left-3 top-3.5 text-slate-500"
                    size={18}
                  />

                  {importSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      {importSuggestions.map((s) => (
                        <div
                          key={s.id}
                          className="px-4 py-3 hover:bg-slate-800 cursor-pointer"
                          onClick={() => handleImportPlace(s.id)}
                        >
                          <p className="text-white text-sm font-medium">
                            {s.primary}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {s.secondary}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleBrowseCategory}
                  disabled={isImporting}
                  className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isImporting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    "Browse"
                  )}
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
              placeholder="Business Name"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
            />
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white h-24 resize-none"
              placeholder="Business description..."
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />

            {/* Subcategory */}
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
              placeholder="Subcategory (e.g., Italian, Thai, Cocktails...)"
              value={form.subcategory}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subcategory: e.target.value }))
              }
            />
          </div>

          {/* Contact Info */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">📞 Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <Phone
                  className="absolute left-3 top-3.5 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-cyan-500 focus:outline-none text-white"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div className="relative">
                <Globe
                  className="absolute left-3 top-3.5 text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 focus:border-cyan-500 focus:outline-none text-white"
                  placeholder="Website"
                  value={form.website}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, website: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">💰 Pricing</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`flex-1 py-3 rounded-xl border transition-colors font-bold ${
                    form.priceLevel === level
                      ? "bg-cyan-500 border-cyan-400 text-black"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-cyan-500/50"
                  }`}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, priceLevel: level }))
                  }
                >
                  {"$".repeat(level)}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:border-cyan-500 focus:outline-none text-white"
              placeholder="Display Price (e.g., 'From $20', 'Free')"
              value={form.displayPrice}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, displayPrice: e.target.value }))
              }
            />
          </div>

          {/* Images */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-bold text-lg mb-4">🖼️ Images</h3>
            <ImageUploader
              images={form.images}
              onImagesChange={(imgs) =>
                setForm((prev) => ({ ...prev, images: imgs }))
              }
              storagePath="catalog/places"
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Location */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">📍 Location</h3>
            <LocationPicker
              value={{
                lat: form.lat,
                lng: form.lng,
                address: form.address,
                placeId: form.googlePlaceId,
              }}
              onChange={handleLocationChange}
            />

            {/* Show on Map Toggle */}
            <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
              <input
                type="checkbox"
                checked={form.showOnMap}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, showOnMap: e.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
              />
              <div className="flex-1">
                <span className="text-sm text-white font-medium">
                  🗺️ Show on Map
                </span>
                <p className="text-xs text-slate-500">
                  Display a pin for this listing on the Connect map
                </p>
              </div>
            </label>
          </div>

          {/* Opening Hours */}
          {form.openingHours.length > 0 && (
            <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
              <h3 className="text-white font-bold text-lg">🕐 Opening Hours</h3>
              {form.openingHours.map((line, i) => (
                <p key={i} className="text-sm text-slate-400">
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* Pin Actions (Map) */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-white font-bold text-lg">🗺️ Map Pin Actions</h3>
            <p className="text-xs text-slate-500 -mt-2">
              Toggle which actions users can take on this listing's map pin
            </p>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                <input
                  type="checkbox"
                  checked={form.allowCheckIn}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      allowCheckIn: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-sm text-white">📍 Check In</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                <input
                  type="checkbox"
                  checked={form.allowJoin}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      allowJoin: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-sm text-white">🙋 Join</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                <input
                  type="checkbox"
                  checked={form.allowWave}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      allowWave: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-sm text-white">👋 Wave</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50">
                <input
                  type="checkbox"
                  checked={form.allowTaxi}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      allowTaxi: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-sm text-white">🚕 Taxi</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-cyan-500/50 col-span-2">
                <input
                  type="checkbox"
                  checked={form.allowNavigate}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      allowNavigate: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
                />
                <span className="text-sm text-white">
                  🧭 Navigate (Google Maps)
                </span>
              </label>
            </div>
          </div>

          {/* Booking Options */}
          <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowBookingOptions(!showBookingOptions)}
            >
              <h3 className="text-white font-bold text-lg">
                📅 Booking Options
              </h3>
              <ChevronDown
                className={`text-slate-400 transition-transform ${showBookingOptions ? "rotate-180" : ""}`}
              />
            </div>

            <label className="flex items-center gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={form.bookingEnabled}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    bookingEnabled: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
              />
              <span className="text-sm text-white">
                Enable booking requests
              </span>
            </label>
          </div>

          {/* Merve Tool Integration */}
          <div className="mt-6">
            <MerveIntegrationSection
              placeType="restaurant" // Default for generic places, user can change specific actions
              value={form.merveConfig}
              onChange={(config) =>
                setForm((prev) => ({ ...prev, merveConfig: config }))
              }
              lat={form.lat}
              lng={form.lng}
              listingId={initialValue?.id}
              marketId={form.cityId}
            />

            {/* Data Manager (only if enabled and any action uses data) */}
            {form.merveConfig.enabled &&
              (() => {
                const kinds = Array.from(
                  new Set(
                    (form.merveConfig.actions || [])
                      .filter((a) => a.enabled && a.data?.kind)
                      .map((a) => a.data!.kind!),
                  ),
                );
                if (kinds.length === 0) return null;

                // If new listing (no ID yet), show save prompt
                if (!initialValue?.id) {
                  return (
                    <div className="border-t border-emerald-500/20 pt-6 mt-6">
                      <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">💾</span>
                          <div>
                            <p className="text-amber-400 font-medium">
                              Save listing to add menu items
                            </p>
                            <p className="text-slate-400 text-sm mt-1">
                              Click "Create Place" below first, then you can
                              import menu items, prices, and services.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="border-t border-emerald-500/20 pt-6 mt-6">
                    <OfferingsManager
                      listingId={initialValue.id}
                      listingTitle={form.title}
                      marketId={form.cityId}
                      kinds={kinds as any}
                    />
                  </div>
                );
              })()}
          </div>
        </div>

        {/* Submit Buttons */}
        <button
          onClick={handleSubmit}
          disabled={loading || !form.title}
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          {initialValue ? "Update Place" : "Create Place"}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default PlaceForm;
