/**
 * PlaceForm Constants
 */
import type { PlaceCategory } from './types';

export const PLACES_PROXY_URL =
    import.meta.env.VITE_PLACES_PROXY_URL ||
    (import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '') +
        '/googlePlacesProxy'
        : '');

export const PLACE_CATEGORIES: PlaceCategory[] = [
    {
        value: 'restaurants',
        label: '🍽️ Restaurants',
        googleType: 'restaurant',
        searchKeyword: 'restaurant dining food',
    },
    {
        value: 'cafes',
        label: '☕ Cafes',
        googleType: 'cafe',
        searchKeyword: 'cafe coffee shop',
    },
    {
        value: 'bars',
        label: '🍺 Bars',
        googleType: 'bar',
        searchKeyword: 'bar pub drinks',
    },
    {
        value: 'spas_wellness',
        label: '💆 Spas & Wellness',
        googleType: 'spa',
        searchKeyword: 'spa massage wellness',
    },
    {
        value: 'gyms_fitness',
        label: '💪 Gyms & Fitness',
        googleType: 'gym',
        searchKeyword: 'gym fitness center workout',
    },
    {
        value: 'beauty_salons',
        label: '💇 Beauty Salons',
        googleType: 'beauty_salon',
        searchKeyword: 'beauty salon hair nails',
    },
    {
        value: 'nightlife',
        label: '🍸 Nightlife',
        googleType: 'night_club',
        searchKeyword: 'nightclub club disco lounge',
    },
    {
        value: 'shopping',
        label: '🛍️ Shopping',
        googleType: 'shopping_mall',
        searchKeyword: 'shopping mall store boutique',
    },
    {
        value: 'car_rentals',
        label: '🚗 Car Rentals',
        googleType: 'car_rental',
        searchKeyword: 'car rental hire vehicle',
    },
    {
        value: 'services',
        label: '🛠️ Services',
        googleType: 'establishment',
        searchKeyword: 'services local business',
    },
    {
        value: 'pharmacies',
        label: '💊 Pharmacies',
        googleType: 'pharmacy',
        searchKeyword: 'pharmacy chemist drugstore',
    },
];

export const DEFAULT_FORM_STATE = {
    category: 'restaurants',
    subcategory: '',
    title: '',
    description: '',
    address: '',
    lat: 35.33,
    lng: 33.32,
    region: 'Kyrenia',
    subregion: '',
    cityId: 'north-cyprus',
    phone: '',
    email: '',
    website: '',
    images: [] as string[],
    rating: 0,
    priceLevel: 0,
    displayPrice: '',
    openingHours: [] as string[],
    googlePlaceId: '',
    showOnMap: true,
    bookingEnabled: true,
    // Pin Actions defaults
    allowCheckIn: true,
    allowJoin: false,
    allowWave: true,
    allowTaxi: true,
    allowNavigate: true,
    // Merve integration
    merveConfig: {
        enabled: false,
        actions: [],
        whatsappE164: '',
        coverageAreas: [],
        tags: [],
    },
};
