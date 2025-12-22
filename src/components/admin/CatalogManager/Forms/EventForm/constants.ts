/**
 * EventForm - Constants
 */
export const EVENT_CATEGORIES = [
    { value: "community", label: "🎉 Community Event" },
    { value: "music", label: "🎵 Music & Concert" },
    { value: "sports", label: "⚽ Sports" },
    { value: "arts", label: "🎨 Arts & Culture" },
    { value: "food", label: "🍽️ Food & Drink" },
    { value: "business", label: "💼 Business & Networking" },
    { value: "education", label: "📚 Education & Workshop" },
    { value: "charity", label: "❤️ Charity" },
    { value: "other", label: "✨ Other" },
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
