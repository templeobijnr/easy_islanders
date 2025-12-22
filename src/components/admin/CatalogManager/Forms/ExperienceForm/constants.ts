/**
 * ExperienceForm - Constants
 */
export interface CategoryOption {
    value: string;
    label: string;
    googleType: string;
}

export const EXPERIENCE_CATEGORIES: CategoryOption[] = [
    { value: "tours", label: "🚨 Tours", googleType: "tourist_attraction" },
    { value: "cultural", label: "🏛️ Cultural Experiences", googleType: "museum" },
    { value: "culinary", label: "🍳 Culinary Experiences", googleType: "restaurant" },
    { value: "adventure", label: "🧗 Adventure", googleType: "tourist_attraction" },
    { value: "nature", label: "🌿 Nature & Wildlife", googleType: "park" },
    { value: "workshops", label: "🎨 Workshops & Classes", googleType: "art_gallery" },
    { value: "photography", label: "📸 Photography Sessions", googleType: "photographer" },
];

export const REGIONS_WITH_SUBREGIONS: Record<string, string[]> = {
    Famagusta: ["Famagusta City", "Salamis", "Tuzla", "Bogaz", "Yeni Boğaziçi", "Geçitkale"],
    Kyrenia: ["Kyrenia Center", "Lapta", "Alsancak", "Bellapais", "Ozankoy", "Catalkoy", "Karaoğlanoğlu", "Esentepe"],
    Iskele: ["Long Beach", "Bafra", "Bogaz", "Yeni Erenkoy"],
    Nicosia: ["North Nicosia", "Gönyeli", "Haspolat", "Değirmenlik"],
    Karpaz: ["Dipkarpaz", "Sipahi", "Kumyalı", "Büyükkonuk", "Ziyamet", "Yeşilköy", "Golden Beach", "Kaplıca"],
};

export const REGIONS = Object.keys(REGIONS_WITH_SUBREGIONS);

export const PLACES_PROXY_URL =
    import.meta.env.VITE_PLACES_PROXY_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") + "/googlePlacesProxy" : "");
