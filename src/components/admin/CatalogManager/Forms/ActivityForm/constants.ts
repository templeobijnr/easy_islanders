/**
 * ActivityForm - Constants
 */
export interface CategoryOption {
    value: string;
    label: string;
    googleType: string;
    searchKeyword?: string;
}

export const ACTIVITY_CATEGORIES: CategoryOption[] = [
    { value: "spas_wellness", label: "🧘 Spa & Wellness", googleType: "spa", searchKeyword: "spa massage wellness center" },
    { value: "gyms_fitness", label: "💪 Gyms & Fitness", googleType: "gym", searchKeyword: "gym fitness center workout" },
    { value: "water_sports", label: "🏄 Water Sports", googleType: "tourist_attraction", searchKeyword: "water sports jet ski kayak" },
    { value: "diving", label: "🤿 Diving", googleType: "tourist_attraction", searchKeyword: "scuba diving snorkeling dive center" },
    { value: "boat_tours", label: "⛵ Boat Tours", googleType: "tourist_attraction", searchKeyword: "boat tour yacht cruise sailing" },
    { value: "amusement_parks", label: "🎢 Amusement Parks", googleType: "amusement_park", searchKeyword: "amusement park theme park" },
    { value: "outdoor_activities", label: "🏕️ Outdoor Activities", googleType: "park", searchKeyword: "outdoor activities hiking camping" },
    { value: "beach_clubs", label: "🏖️ Beach Clubs", googleType: "tourist_attraction", searchKeyword: "beach club resort pool" },
    { value: "horse_riding", label: "🐴 Horse Riding", googleType: "tourist_attraction", searchKeyword: "horse riding equestrian stables ranch" },
    { value: "yoga_meditation", label: "🧘‍♀️ Yoga & Meditation", googleType: "yoga_studio", searchKeyword: "yoga studio meditation retreat" },
    { value: "golf", label: "⛳ Golf", googleType: "golf_course", searchKeyword: "golf course club driving range" },
    { value: "casino", label: "🎰 Casino", googleType: "casino", searchKeyword: "casino gambling gaming" },
    { value: "other_activities", label: "✨ Other Activities", googleType: "tourist_attraction", searchKeyword: "activities things to do entertainment" },
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
    (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") + "/googlePlacesProxy"
        : "");
