import { useRef, useState } from "react";
import {
  LISTING_CATEGORIES,
  PLACES_PROXY_URL,
} from "../unifiedListingForm.constants";
import { GoogleImportService } from "../../../../services/googleImportService";
import type { ListingFormSetState } from "./useListingForm";

type LocationSuggestion = { id: string; primary: string; secondary: string };

interface UseGoogleImportArgs {
  category: string;
  region: string;
  subregion: string;
  setForm: ListingFormSetState;
  setError: (msg: string) => void;
}

export function useGoogleImport({
  category,
  region,
  subregion,
  setForm,
  setError,
}: UseGoogleImportArgs) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLocationSearch = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `${PLACES_PROXY_URL}?action=autocomplete&input=${encodeURIComponent(query.trim())}&region=cy`,
        );
        const data = await res.json();

        if (data.predictions) {
          setSuggestions(
            data.predictions.map((p: any) => ({
              id: p.place_id,
              primary: p.structured_formatting?.main_text || p.description,
              secondary: p.structured_formatting?.secondary_text || "",
            })),
          );
        }
      } catch (err) {
        console.error("Location search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectPlace = async (placeId: string) => {
    setIsSearching(true);
    setSuggestions([]);
    setSearchQuery("");

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

      setForm((prev) => ({
        ...prev,
        title: mapped.title || prev.title,
        description: mapped.description || prev.description,
        address: details.formatted_address || mapped.region || prev.address,
        lat: details.geometry?.location?.lat || prev.lat,
        lng: details.geometry?.location?.lng || prev.lng,
        phone: details.international_phone_number || prev.phone,
        website: details.website || prev.website,
        rating: details.rating || prev.rating,
        priceLevel: details.price_level || prev.priceLevel,
        openingHours: details.opening_hours?.weekday_text || prev.openingHours,
        images: importedImages.length > 0 ? importedImages : prev.images,
        googlePlaceId: placeId,
      }));

      setError("");
    } catch (err) {
      console.error("Place import failed:", err);
      setError("Failed to import place details");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBrowseCategory = async () => {
    const categoryConfig = LISTING_CATEGORIES.find((c) => c.value === category);
    if (!categoryConfig) return;

    setIsSearching(true);
    try {
      const location = subregion || region;
      const query = `${categoryConfig.googleType}s in ${location}, North Cyprus`;
      const res = await fetch(
        `${PLACES_PROXY_URL}?action=textsearch&query=${encodeURIComponent(query)}&region=cy`,
      );
      const data = await res.json();

      if (data.results) {
        setSuggestions(
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
      setIsSearching(false);
    }
  };

  return {
    searchQuery,
    suggestions,
    isSearching,
    handleLocationSearch,
    handleBrowseCategory,
    handleSelectPlace,
  };
}
