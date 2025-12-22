/**
 * Admin Configuration Types
 * Enhanced with geo-fencing and alias support for location normalization
 */

// ============================================================================
// REGION & LOCATION CONFIG
// ============================================================================

export interface GeoPoint {
    lat: number;
    lng: number;
    radiusKm: number;  // Circular geofence radius
}

export interface SubRegionConfig {
    id: string;           // 'girne', 'lapta', 'alsancak'
    label: string;        // 'Girne', 'Lapta', 'Alsancak'
    isVisible: boolean;
    geo?: GeoPoint;       // Optional sub-region center
    aliases: string[];    // ['Kyrenia Center', 'Girne Merkez']
}

export interface RegionConfig {
    id: string;           // 'kyrenia', 'famagusta', 'iskele'
    label: string;        // 'Kyrenia', 'Famagusta', 'İskele'
    isVisible: boolean;
    geo: GeoPoint;        // Region center with radius
    aliases: string[];    // ['Girne', 'Κερύνεια', 'Keryneia']
    subRegions: SubRegionConfig[];
}

// ============================================================================
// TAB & CATEGORY CONFIG (Discover Page)
// ============================================================================

export interface CategoryConfig {
    id: string;           // 'restaurants', 'spas_wellness'
    label: string;        // 'Restaurants', 'Spas & Wellness'
    icon?: string;        // Emoji or icon identifier
    isVisible: boolean;
}

export interface TabConfig {
    id: string;           // 'eat', 'play', 'stay', 'explore'
    label: string;        // 'Eat', 'Play', 'Stay', 'Explore'
    icon?: string;
    isVisible: boolean;
    categories: CategoryConfig[];
}

// ============================================================================
// DISCOVER PAGE CONFIG
// ============================================================================

export interface DiscoverConfig {
    regions: RegionConfig[];
    tabs: TabConfig[];
    lastUpdated: Date | null;
}

// ============================================================================
// HOMEPAGE CONFIG
// ============================================================================

export interface FeaturedItemConfig {
    listingId: string;
    title: string;
    imageUrl?: string;
    order: number;
}

export interface HomepageConfig {
    featuredStays: FeaturedItemConfig[];
    curatedExperiences: FeaturedItemConfig[];
    heroSection?: {
        title: string;
        subtitle: string;
        backgroundImage?: string;
    };
    lastUpdated: Date | null;
}

// ============================================================================
// LOCATION NORMALIZATION TYPES
// ============================================================================

export type NormalizationMethod = 'spatial' | 'text_exact' | 'text_fuzzy' | 'failed';

export interface LocationMatch {
    regionId: string;
    regionLabel: string;
    subRegionId?: string;
    subRegionLabel?: string;
    confidence: number;      // 0-100
    method: NormalizationMethod;
    distance?: number;       // Distance in km (for spatial matches)
}

export interface NormalizationResult {
    match: LocationMatch | null;
    alternatives: LocationMatch[];  // Other possible matches
    rawInput: {
        lat?: number;
        lng?: number;
        address?: string;
    };
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_REGIONS: RegionConfig[] = [
    {
        id: 'kyrenia',
        label: 'Kyrenia',
        isVisible: true,
        geo: { lat: 35.3406, lng: 33.3196, radiusKm: 25 },
        aliases: ['Girne', 'Κερύνεια', 'Keryneia', 'Güzelyalı'],
        subRegions: [
            { id: 'kyrenia-center', label: 'Kyrenia Center', isVisible: true, aliases: ['Girne Center', 'Girne Merkez'], geo: { lat: 35.3406, lng: 33.3196, radiusKm: 3 } },
            { id: 'alsancak', label: 'Alsancak', isVisible: true, aliases: ['Karavas'], geo: { lat: 35.3333, lng: 33.1833, radiusKm: 3 } },
            { id: 'lapta', label: 'Lapta', isVisible: true, aliases: ['Lapithos', 'Lapethos'], geo: { lat: 35.3350, lng: 33.1667, radiusKm: 3 } },
            { id: 'karaoglanoglu', label: 'Karaoğlanoğlu', isVisible: true, aliases: ['Agios Georgios'], geo: { lat: 35.3500, lng: 33.2833, radiusKm: 2 } },
            { id: 'catalkoy', label: 'Çatalköy', isVisible: true, aliases: ['Agios Epiktitos'], geo: { lat: 35.3167, lng: 33.3833, radiusKm: 2 } },
            { id: 'esentepe', label: 'Esentepe', isVisible: true, aliases: ['Agios Amvrosios'], geo: { lat: 35.3333, lng: 33.5667, radiusKm: 3 } },
            { id: 'bahceli', label: 'Bahçeli', isVisible: true, aliases: ['Kalogrea'], geo: { lat: 35.3333, lng: 33.5167, radiusKm: 2 } },
            { id: 'tatlisu', label: 'Tatlısu', isVisible: true, aliases: ['Akanthou'], geo: { lat: 35.3667, lng: 33.6333, radiusKm: 3 } },
            { id: 'kayalar', label: 'Kayalar', isVisible: true, aliases: ['Orga'], geo: { lat: 35.3333, lng: 33.1333, radiusKm: 2 } },
            { id: 'ozankoy', label: 'Ozanköy', isVisible: true, aliases: ['Kazafani'], geo: { lat: 35.3167, lng: 33.3500, radiusKm: 2 } },
            { id: 'bellapais', label: 'Bellapais', isVisible: true, aliases: ['Beylerbeyi', 'Bellabayis'], geo: { lat: 35.3000, lng: 33.3500, radiusKm: 2 } },
            { id: 'edremit', label: 'Edremit', isVisible: true, aliases: ['Trimithi'], geo: { lat: 35.2833, lng: 33.2833, radiusKm: 2 } },
            { id: 'zeytinlik', label: 'Zeytinlik', isVisible: true, aliases: ['Templos'], geo: { lat: 35.3000, lng: 33.4000, radiusKm: 2 } },
            { id: 'karsiyaka', label: 'Karşıyaka', isVisible: true, aliases: ['Vasilia'], geo: { lat: 35.3167, lng: 33.1500, radiusKm: 3 } },
            { id: 'alagadi', label: 'Alagadi', isVisible: true, aliases: ['Turtle Beach'], geo: { lat: 35.3333, lng: 33.4667, radiusKm: 3 } },
            { id: 'korineum', label: 'Korineum', isVisible: true, aliases: ['Korineum Golf'], geo: { lat: 35.3500, lng: 33.5500, radiusKm: 3 } },
        ]
    },
    {
        id: 'famagusta',
        label: 'Famagusta',
        isVisible: true,
        geo: { lat: 35.1250, lng: 33.9417, radiusKm: 20 },
        aliases: ['Gazimağusa', 'Αμμόχωστος', 'Ammochostos', 'Mağusa'],
        subRegions: [
            { id: 'famagusta-center', label: 'Famagusta Center', isVisible: true, aliases: ['Gazimağusa Merkez'], geo: { lat: 35.1250, lng: 33.9417, radiusKm: 4 } },
            { id: 'salamis', label: 'Salamis', isVisible: true, aliases: ['Ancient Salamis'], geo: { lat: 35.1833, lng: 33.9000, radiusKm: 3 } },
            { id: 'tuzla', label: 'Tuzla', isVisible: true, aliases: ['Enkomi'], geo: { lat: 35.1667, lng: 33.8833, radiusKm: 3 } },
            { id: 'yenibogazici', label: 'Yeni Boğaziçi', isVisible: true, aliases: ['Ayios Sergios'], geo: { lat: 35.2000, lng: 33.8333, radiusKm: 3 } },
            { id: 'mehmetcik', label: 'Mehmetçik', isVisible: true, aliases: ['Galateia'], geo: { lat: 35.4833, lng: 34.1500, radiusKm: 3 } },
            { id: 'kaleburnu', label: 'Kaleburnu', isVisible: true, aliases: ['Galinoporni'], geo: { lat: 35.5167, lng: 34.2333, radiusKm: 3 } },
            { id: 'gecitkale', label: 'Geçitkale', isVisible: true, aliases: ['Lefkoniko'], geo: { lat: 35.2667, lng: 33.7167, radiusKm: 3 } },
            { id: 'sindirgi', label: 'Sındırgı', isVisible: true, aliases: ['Vatili'], geo: { lat: 35.2000, lng: 33.7000, radiusKm: 2 } },
        ]
    },
    {
        id: 'iskele',
        label: 'İskele',
        isVisible: true,
        geo: { lat: 35.2833, lng: 33.8833, radiusKm: 25 },
        aliases: ['Trikomo', 'Iskele'],
        subRegions: [
            { id: 'iskele-center', label: 'İskele Center', isVisible: true, aliases: ['Trikomo Center'], geo: { lat: 35.2833, lng: 33.8833, radiusKm: 3 } },
            { id: 'bafra', label: 'Bafra', isVisible: true, aliases: ['Vokolida'], geo: { lat: 35.3333, lng: 33.9500, radiusKm: 5 } },
            { id: 'bogaz', label: 'Boğaz', isVisible: true, aliases: ['Bogazi'], geo: { lat: 35.3167, lng: 33.8667, radiusKm: 3 } },
            { id: 'longbeach', label: 'Long Beach', isVisible: true, aliases: ['Golden Coast', 'Altın Kum'], geo: { lat: 35.3167, lng: 33.8167, radiusKm: 5 } },
            { id: 'caesarbay', label: 'Caesar Bay', isVisible: true, aliases: ['Ceasar Bay'], geo: { lat: 35.3000, lng: 33.8500, radiusKm: 3 } },
            { id: 'kaplica', label: 'Kaplıca', isVisible: true, aliases: ['Davlos'], geo: { lat: 35.4167, lng: 33.8333, radiusKm: 3 } },
            { id: 'yenierenköy', label: 'Yeni Erenköy', isVisible: true, aliases: ['Yialusa'], geo: { lat: 35.5333, lng: 34.1667, radiusKm: 3 } },
        ]
    },
    {
        id: 'nicosia',
        label: 'Nicosia',
        isVisible: true,
        geo: { lat: 35.1856, lng: 33.3823, radiusKm: 20 },
        aliases: ['Lefkoşa', 'Λευκωσία', 'Lefkosa'],
        subRegions: [
            { id: 'north-nicosia', label: 'North Nicosia', isVisible: true, aliases: ['Lefkoşa Merkez'], geo: { lat: 35.1856, lng: 33.3823, radiusKm: 5 } },
            { id: 'gonyeli', label: 'Gönyeli', isVisible: true, aliases: ['Kioneli'], geo: { lat: 35.2167, lng: 33.3333, radiusKm: 3 } },
            { id: 'haspolat', label: 'Haspolat', isVisible: true, aliases: ['Mia Milia'], geo: { lat: 35.2333, lng: 33.4000, radiusKm: 3 } },
            { id: 'alaykoy', label: 'Alayköy', isVisible: true, aliases: ['Skyloura'], geo: { lat: 35.2333, lng: 33.3167, radiusKm: 2 } },
            { id: 'hamitkoy', label: 'Hamitköy', isVisible: true, aliases: ['Hamit'], geo: { lat: 35.2000, lng: 33.3500, radiusKm: 2 } },
            { id: 'ortakoy', label: 'Ortaköy', isVisible: true, aliases: ['Ortakoy'], geo: { lat: 35.2167, lng: 33.4000, radiusKm: 2 } },
            { id: 'dikmen', label: 'Dikmen', isVisible: true, aliases: ['Dikomo'], geo: { lat: 35.2833, lng: 33.4167, radiusKm: 2 } },
            { id: 'taskent', label: 'Taşkent', isVisible: true, aliases: ['Vouno'], geo: { lat: 35.2833, lng: 33.3667, radiusKm: 2 } },
            { id: 'miamilia', label: 'Mia Milia', isVisible: true, aliases: ['Haspolat area'], geo: { lat: 35.2500, lng: 33.4000, radiusKm: 2 } },
        ]
    },
    {
        id: 'guzelyurt',
        label: 'Güzelyurt',
        isVisible: true,
        geo: { lat: 35.1989, lng: 32.9922, radiusKm: 20 },
        aliases: ['Morphou', 'Μόρφου', 'Omorfo'],
        subRegions: [
            { id: 'guzelyurt-center', label: 'Güzelyurt Center', isVisible: true, aliases: ['Morphou Center'], geo: { lat: 35.1989, lng: 32.9922, radiusKm: 4 } },
            { id: 'yesilirmak', label: 'Yeşilırmak', isVisible: true, aliases: ['Limnitis'], geo: { lat: 35.1667, lng: 32.8000, radiusKm: 3 } },
            { id: 'gaziveren', label: 'Gaziveren', isVisible: true, aliases: ['Kazivera'], geo: { lat: 35.1667, lng: 32.9167, radiusKm: 2 } },
            { id: 'kalkanli', label: 'Kalkanlı', isVisible: true, aliases: ['Kapouti'], geo: { lat: 35.1500, lng: 32.9333, radiusKm: 2 } },
            { id: 'zorlu', label: 'Zorlu', isVisible: true, aliases: ['Zolou'], geo: { lat: 35.1833, lng: 32.9500, radiusKm: 2 } },
            { id: 'bostanci', label: 'Bostancı', isVisible: true, aliases: ['Zodeia'], geo: { lat: 35.1833, lng: 33.0167, radiusKm: 2 } },
        ]
    },
    {
        id: 'lefke',
        label: 'Lefke',
        isVisible: true,
        geo: { lat: 35.1167, lng: 32.8500, radiusKm: 15 },
        aliases: ['Lefka', 'Λεύκα'],
        subRegions: [
            { id: 'lefke-center', label: 'Lefke Center', isVisible: true, aliases: ['Lefka Merkez'], geo: { lat: 35.1167, lng: 32.8500, radiusKm: 3 } },
            { id: 'gemikonagi', label: 'Gemikonağı', isVisible: true, aliases: ['Karavostasi'], geo: { lat: 35.1333, lng: 32.8333, radiusKm: 3 } },
            { id: 'camlibel', label: 'Çamlıbel', isVisible: true, aliases: ['Myrtou'], geo: { lat: 35.2500, lng: 33.0000, radiusKm: 3 } },
            { id: 'yesilyurt', label: 'Yeşilyurt', isVisible: true, aliases: ['Pendayia'], geo: { lat: 35.1500, lng: 32.8667, radiusKm: 3 } },
        ]
    },
    {
        id: 'karpaz',
        label: 'Karpaz',
        isVisible: true,
        geo: { lat: 35.5833, lng: 34.3833, radiusKm: 30 },
        aliases: ['Karpas', 'Karpaz Peninsula', 'Rizokarpaso'],
        subRegions: [
            { id: 'dipkarpaz', label: 'Dipkarpaz', isVisible: true, aliases: ['Rizokarpaso'], geo: { lat: 35.5833, lng: 34.3833, radiusKm: 5 } },
            { id: 'sipahi', label: 'Sipahi', isVisible: true, aliases: ['Agios Theodoros'], geo: { lat: 35.5333, lng: 34.2500, radiusKm: 3 } },
            { id: 'kumyali', label: 'Kumyalı', isVisible: true, aliases: ['Koma tou Gialou'], geo: { lat: 35.5000, lng: 34.1667, radiusKm: 3 } },
            { id: 'buyukkonuk', label: 'Büyükkonuk', isVisible: true, aliases: ['Komi Kebir'], geo: { lat: 35.4667, lng: 34.0667, radiusKm: 3 } },
            { id: 'ziyamet', label: 'Ziyamet', isVisible: true, aliases: ['Leonarisso'], geo: { lat: 35.4833, lng: 34.1333, radiusKm: 2 } },
            { id: 'yesilkoy', label: 'Yeşilköy', isVisible: true, aliases: ['Ayios Andronikos'], geo: { lat: 35.5667, lng: 34.3167, radiusKm: 2 } },
            { id: 'goldenbeach', label: 'Golden Beach', isVisible: true, aliases: ['Altın Plaj', 'Nangomi'], geo: { lat: 35.6167, lng: 34.4167, radiusKm: 3 } },
        ]
    },
];

export const DEFAULT_TABS: TabConfig[] = [
    {
        id: 'stays',
        label: 'Stays',
        icon: '🏨',
        isVisible: true,
        categories: [
            { id: 'stays_villas', label: 'Villas', icon: '🏠', isVisible: true },
            { id: 'stays_apartments', label: 'Apartments', icon: '🏢', isVisible: true },
            { id: 'stays_hotels', label: 'Hotels', icon: '🏨', isVisible: true },
            { id: 'stays_guesthouses', label: 'Guest Houses / B&B', icon: '🏡', isVisible: true },
            { id: 'stays_boutique', label: 'Boutique Hotels', icon: '✨', isVisible: true },
        ]
    },
    {
        id: 'activities',
        label: 'Activities',
        icon: '🎯',
        isVisible: true,
        categories: [
            { id: 'spas_wellness', label: 'Spa & Wellness', icon: '🧘', isVisible: true },
            { id: 'gyms_fitness', label: 'Gyms & Fitness', icon: '🏋️', isVisible: true },
            { id: 'water_activities', label: 'Water Activities', icon: '🚤', isVisible: true },
            { id: 'bowling_recreation', label: 'Bowling & Recreation', icon: '🎳', isVisible: true },
            { id: 'adventure_sports', label: 'Adventure Sports', icon: '🪂', isVisible: true },
            { id: 'motor_activities', label: 'Motor Activities', icon: '🏎️', isVisible: true },
            { id: 'shooting_sports', label: 'Shooting Sports', icon: '🎯', isVisible: true },
            { id: 'golf_tennis', label: 'Golf & Tennis', icon: '🎾', isVisible: true },
            { id: 'horse_riding', label: 'Horse Riding', icon: '🐴', isVisible: true },
            { id: 'yoga_meditation', label: 'Yoga & Meditation', icon: '🧘‍♀️', isVisible: true },
            { id: 'escape_rooms', label: 'Escape Rooms & Games', icon: '🔐', isVisible: true },
            { id: 'amusement_parks', label: 'Amusement Parks', icon: '🎢', isVisible: true },
            { id: 'outdoor_activities', label: 'Outdoor Activities', icon: '🥾', isVisible: true },
            { id: 'beach_clubs', label: 'Beach Clubs', icon: '🏖️', isVisible: true },
            { id: 'other_activities', label: 'Other Activities', icon: '✨', isVisible: true },
        ]
    },
    {
        id: 'events',
        label: 'Events',
        icon: '🎉',
        isVisible: true,
        categories: [
            { id: 'concerts', label: 'Concerts', icon: '🎵', isVisible: true },
            { id: 'festivals', label: 'Festivals', icon: '🎊', isVisible: true },
            { id: 'exhibitions', label: 'Exhibitions', icon: '🖼️', isVisible: true },
            { id: 'sports_events', label: 'Sports Events', icon: '⚽', isVisible: true },
            { id: 'networking', label: 'Networking', icon: '🤝', isVisible: true },
            { id: 'workshops', label: 'Workshops', icon: '🎓', isVisible: true },
        ]
    },
    {
        id: 'places',
        label: 'Places',
        icon: '📍',
        isVisible: true,
        categories: [
            { id: 'restaurants', label: 'Restaurants', icon: '🍽️', isVisible: true },
            { id: 'cafes', label: 'Cafes', icon: '☕', isVisible: true },
            { id: 'bars', label: 'Bars', icon: '🍺', isVisible: true },
            { id: 'beauty_salons', label: 'Beauty Salons', icon: '💇', isVisible: true },
            { id: 'nightlife', label: 'Nightlife', icon: '🍸', isVisible: true },
            { id: 'shopping', label: 'Shopping', icon: '🛍️', isVisible: true },
            { id: 'car_rentals', label: 'Car Rentals', icon: '🚗', isVisible: true },
            { id: 'services', label: 'Services', icon: '🛠️', isVisible: true },
            { id: 'pharmacies', label: 'Pharmacies', icon: '💊', isVisible: true },
            { id: 'museums_culture', label: 'Museums & Culture', icon: '🏛️', isVisible: true },
            { id: 'parks_nature', label: 'Parks & Nature', icon: '🌿', isVisible: true },
            { id: 'attractions', label: 'Attractions', icon: '📍', isVisible: true },
            { id: 'beaches', label: 'Beaches', icon: '🏖️', isVisible: true },
        ]
    },
    {
        id: 'experiences',
        label: 'Experiences',
        icon: '✨',
        isVisible: true,
        categories: [
            { id: 'tours', label: 'Tours', icon: '🚌', isVisible: true },
            { id: 'cultural', label: 'Cultural Experiences', icon: '🏛️', isVisible: true },
            { id: 'outdoor', label: 'Outdoor Adventures', icon: '⛰️', isVisible: true },
            { id: 'food_drink', label: 'Food & Drink Experiences', icon: '🍷', isVisible: true },
            { id: 'wellness', label: 'Wellness Retreats', icon: '🧘', isVisible: true },
            { id: 'workshops', label: 'Workshops & Classes', icon: '🎨', isVisible: true },
            { id: 'photography', label: 'Photography Sessions', icon: '📸', isVisible: true },
        ]
    },
];

export const DEFAULT_DISCOVER_CONFIG: DiscoverConfig = {
    regions: DEFAULT_REGIONS,
    tabs: DEFAULT_TABS,
    lastUpdated: null,
};

export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = {
    featuredStays: [],
    curatedExperiences: [],
    lastUpdated: null,
};
