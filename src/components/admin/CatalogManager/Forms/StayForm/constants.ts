/**
 * StayForm - Constants
 */
export const STAY_CATEGORIES = [
    { value: "stays_villas", label: "🏡 Villas" },
    { value: "stays_apartments", label: "🏢 Apartments" },
    { value: "stays_hotels", label: "🏨 Hotels" },
    { value: "stays_guesthouses", label: "🏡 Guest Houses / B&B" },
    { value: "stays_boutique", label: "✨ Boutique Hotels" },
];

export const STAY_AMENITIES = [
    "Air Conditioning", "Heating", "Wi-Fi", "Fast Wi-Fi", "TV", "Flat Screen TV", "Streaming Service",
    "Linens", "Wardrobe", "Extra Bed", "Blackout Curtains",
    "Towels", "Hairdryer", "Toiletries", "Shower", "Bathtub", "Jacuzzi",
    "Full Kitchen", "Kitchenette", "Fridge", "Microwave", "Oven", "Dishwasher", "Coffee Machine", "Kettle",
    "Private Pool", "Shared Pool", "Garden", "BBQ Area", "Terrace", "Balcony", "Sea View", "Mountain View",
    "Private Parking", "Street Parking", "Beach Access", "Gym Access", "Spa Access",
    "24h Reception", "Room Service", "Daily Housekeeping", "Laundry Service",
    "Pets Allowed", "Non-smoking", "Elevator", "Work Space",
];

export const PROPERTY_TYPES = ["Villa", "Apartment", "Studio", "Penthouse", "Hotel Room", "Guest House", "Bungalow", "Cottage", "Boutique Suite"];

export const REGIONS_WITH_SUBREGIONS: Record<string, string[]> = {
    Famagusta: ["Famagusta City", "Salamis", "Tuzla", "Bogaz", "Yeni Boğaziçi", "Geçitkale"],
    Kyrenia: ["Kyrenia Center", "Lapta", "Alsancak", "Bellapais", "Ozankoy", "Catalkoy", "Karaoğlanoğlu", "Esentepe"],
    Iskele: ["Long Beach", "Bafra", "Bogaz", "Yeni Erenkoy"],
    Nicosia: ["North Nicosia", "Gönyeli", "Haspolat", "Değirmenlik"],
    Karpaz: ["Dipkarpaz", "Sipahi", "Kumyalı", "Büyükkonuk", "Ziyamet", "Yeşilköy", "Golden Beach", "Kaplıca"],
};

export const REGIONS = Object.keys(REGIONS_WITH_SUBREGIONS);

export const CURRENCIES = [
    { value: "EUR", label: "€ EUR" },
    { value: "USD", label: "$ USD" },
    { value: "GBP", label: "£ GBP" },
    { value: "TRY", label: "₺ TRY" },
];
