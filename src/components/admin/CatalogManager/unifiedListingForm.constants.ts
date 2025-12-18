export const PLACES_PROXY_URL =
  import.meta.env.VITE_PLACES_PROXY_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, "") +
      "/googlePlacesProxy"
    : "");

// ============================================================================
// CATEGORY CONFIGURATION
// ============================================================================

export const LISTING_CATEGORIES = [
  // 🏠 Stays (accommodation - special fields)
  {
    value: "stays_villas",
    label: "🏠 Villas",
    type: "stay",
    googleType: "lodging",
  },
  {
    value: "stays_apartments",
    label: "🏢 Apartments",
    type: "stay",
    googleType: "lodging",
  },
  {
    value: "stays_hotels",
    label: "🏨 Hotels",
    type: "stay",
    googleType: "lodging",
  },
  {
    value: "stays_guesthouses",
    label: "🏡 Guest Houses / B&B",
    type: "stay",
    googleType: "lodging",
  },
  {
    value: "stays_boutique",
    label: "✨ Boutique Hotels",
    type: "stay",
    googleType: "lodging",
  },
  // 🍽️ Food & Drink
  {
    value: "restaurants",
    label: "🍽️ Restaurants",
    type: "place",
    googleType: "restaurant",
  },
  { value: "cafes", label: "☕ Cafes", type: "place", googleType: "cafe" },
  { value: "bars", label: "🍺 Bars", type: "place", googleType: "bar" },
  // 💆 Wellness
  {
    value: "spas_wellness",
    label: "💆 Spas & Wellness",
    type: "place",
    googleType: "spa",
  },
  {
    value: "gyms_fitness",
    label: "💪 Gyms & Fitness",
    type: "place",
    googleType: "gym",
  },
  {
    value: "beauty_salons",
    label: "💇 Beauty Salons",
    type: "place",
    googleType: "beauty_salon",
  },
  // 🎉 Entertainment
  {
    value: "nightlife",
    label: "🍸 Nightlife",
    type: "place",
    googleType: "night_club",
  },
  {
    value: "cinemas_theaters",
    label: "🎬 Cinemas & Theaters",
    type: "place",
    googleType: "movie_theater",
  },
  {
    value: "bowling_recreation",
    label: "🎳 Bowling & Recreation",
    type: "activity",
    googleType: "bowling_alley",
  },
  // 🏖️ Nature & Outdoors
  {
    value: "parks_nature",
    label: "🌿 Parks & Nature",
    type: "place",
    googleType: "park",
  },
  {
    value: "beaches",
    label: "🏖️ Beaches",
    type: "place",
    googleType: "natural_feature",
  },
  {
    value: "water_activities",
    label: "🚤 Water Activities",
    type: "activity",
    googleType: "tourist_attraction",
  },
  // 🏛️ Culture & Attractions
  {
    value: "museums_culture",
    label: "🏛️ Museums & Culture",
    type: "place",
    googleType: "museum",
  },
  {
    value: "attractions",
    label: "📍 Tourist Attractions",
    type: "place",
    googleType: "tourist_attraction",
  },
  // 🛍️ Shopping & Services
  {
    value: "shopping",
    label: "🛍️ Shopping",
    type: "place",
    googleType: "shopping_mall",
  },
  {
    value: "car_rentals",
    label: "🚗 Car Rentals",
    type: "place",
    googleType: "car_rental",
  },
  {
    value: "services",
    label: "🛠️ Services",
    type: "place",
    googleType: "establishment",
  },
  // 💊 Health & Finance
  {
    value: "pharmacies_medical",
    label: "💊 Pharmacies",
    type: "place",
    googleType: "pharmacy",
  },
  {
    value: "banks_finance",
    label: "🏦 Banks & ATMs",
    type: "place",
    googleType: "bank",
  },
  // 🚉 Transport
  {
    value: "transport",
    label: "🚉 Transport Hubs",
    type: "place",
    googleType: "transit_station",
  },
  {
    value: "gas_ev_charging",
    label: "⛽ Gas & EV Charging",
    type: "place",
    googleType: "gas_station",
  },
  // 🎯 Events & Experiences
  {
    value: "events",
    label: "🎉 Events",
    type: "event",
    googleType: "tourist_attraction",
  },
  {
    value: "experiences",
    label: "🎯 Experiences",
    type: "experience",
    googleType: "tourist_attraction",
  },
] as const;

// North Cyprus Regions with sub-regions
export const REGIONS_WITH_SUBREGIONS: Record<string, string[]> = {
  Kyrenia: [
    "Kyrenia Center",
    "Alsancak",
    "Lapta",
    "Karaoğlanoğlu",
    "Çatalköy",
    "Esentepe",
    "Bahçeli",
    "Tatlısu",
    "Kayalar",
    "Ozanköy",
    "Bellapais",
    "Edremit",
    "Zeytinlik",
    "Karşıyaka",
    "Alagadi",
    "Korineum",
  ],
  Famagusta: [
    "Famagusta Center",
    "Salamis",
    "Tuzla",
    "Yeni Boğaziçi",
    "İskele",
    "Bafra",
    "Mehmetçik",
    "Kaleburnu",
    "Geçitkale",
    "Sındırgı",
    "Boğaz",
    "Long Beach",
  ],
  İskele: [
    "İskele Center",
    "Bafra",
    "Bogaz",
    "Long Beach",
    "Ceasar Bay",
    "Kaplica",
    "Yeni Erenköy",
  ],
  Nicosia: [
    "North Nicosia",
    "Gönyeli",
    "Haspolat",
    "Alayköy",
    "Hamitköy",
    "Ortaköy",
    "Dikmen",
    "Taşkent",
    "Mia Milia",
  ],
  Güzelyurt: [
    "Güzelyurt Center",
    "Lefke",
    "Yeşilırmak",
    "Gaziveren",
    "Kalkanlı",
    "Zorlu",
    "Bostancı",
  ],
  Lefke: ["Lefke Center", "Gemikonağı", "Çamlıbel", "Yeşilyurt"],
  Karpaz: [
    "Dipkarpaz",
    "Sipahi",
    "Kumyalı",
    "Büyükkonuk",
    "Ziyamet",
    "Yeşilköy",
    "Golden Beach",
    "Kaplıca",
  ],
};

export const REGIONS = Object.keys(REGIONS_WITH_SUBREGIONS);

// Stay-specific amenities
export const STAY_AMENITIES = [
  // Core comforts
  "Air Conditioning",
  "Heating",
  "Wi-Fi",
  "Fast Wi-Fi",
  "TV",
  "Flat Screen TV",
  "Streaming Service",
  // Bedrooms
  "Linens",
  "Wardrobe",
  "Extra Bed",
  "Blackout Curtains",
  // Bathrooms
  "Private Bathroom",
  "Bathtub",
  "Shower",
  "Toiletries",
  "Towels",
  "Hairdryer",
  // Kitchen
  "Kitchen",
  "Fully Equipped Kitchen",
  "Coffee Machine",
  "Electric Kettle",
  "Refrigerator",
  "Dishwasher",
  "Microwave",
  // Laundry
  "Washing Machine",
  "Dryer",
  "Iron",
  // Outdoors
  "Balcony",
  "Terrace",
  "Private Garden",
  "BBQ",
  "Private Pool",
  "Shared Pool",
  // Views
  "Sea View",
  "Pool View",
  "Garden View",
  "Mountain View",
  // Parking
  "Free Parking",
  "Garage",
  "Airport Shuttle",
  // Wellness
  "Gym",
  "Spa",
  "Sauna",
  "Hot Tub",
  // Safety
  "Security 24/7",
  "Smoke Detectors",
  "First Aid Kit",
  // Other
  "Pets Allowed",
  "Non-smoking",
  "Elevator",
  "Work Space",
];

export const PROPERTY_TYPES = [
  "Villa",
  "Apartment",
  "Studio",
  "Penthouse",
  "Hotel Room",
  "Guest House",
  "Bungalow",
  "Cottage",
  "Boutique Suite",
];
