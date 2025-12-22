/**
 * PropertyFormModal Constants
 */
export const LISTING_TYPES = [
    { id: 'sale', label: 'For Sale' },
    { id: 'short-term', label: 'Short-Term Rental' },
    { id: 'long-term', label: 'Long-Term Rental' },
    { id: 'project', label: 'Off-Plan Project' },
];

export const PROPERTY_TYPES = [
    'Villa',
    'Semi-Detached',
    'Residence',
    'Detached House',
    'Timeshare',
    'Unfinished Building',
    'Flat',
    'Penthouse',
    'Bungalow',
    'Complete Building',
];

export const LOCATIONS = [
    'Kyrenia',
    'Bellapais',
    'Catalkoy',
    'Esentepe',
    'Lapta',
    'Alsancak',
    'Nicosia',
    'Famagusta',
    'Iskele',
    'Long Beach',
];

export const FURNISHING_STATUS = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];

export const DEED_TYPES = ['Exchange Title', 'Turkish Title', 'TMD Title', 'Leasehold'];

export const AMENITY_OPTIONS = [
    'Pool',
    'Gym',
    'Wi-Fi',
    'Hot Tub',
    'Air Conditioning',
    'Sea View',
    'Heating',
    'TV',
    'Mountain View',
    'Kitchen',
    'Spa',
    'Microwave',
    'Flat Screen TV',
    'Shower',
    'Sauna',
    'Toilets',
    'Linens',
    'Private Garden',
    'Garage',
    'Solar Panels',
    'Fireplace',
    'Gated Community',
    'Security 24/7',
    'Generator',
    'Smart Home',
    'BBQ Area',
    'Jacuzzi',
    'Elevator',
    'White Goods',
    'Balcony',
    'Terrace',
    'Parking',
    'Storage Room',
    'Walk-in Closet',
];

export const CANONICAL_DISTRICTS = [
    'Kyrenia',
    'Girne',
    'Catalkoy',
    'Çatalköy',
    'Bellapais',
    'Alsancak',
    'Lapta',
    'Iskele',
    'Famagusta',
    'Nicosia',
    'Lefkosa',
];

export const DEFAULT_FORM_DATA = {
    title: '',
    description: '',
    price: 0,
    currency: 'GBP',
    category: 'Apartment',
    rentalType: 'sale',
    location: 'Kyrenia',
    bedrooms: 2,
    bathrooms: 1,
    squareMeters: 0,
    plotSize: 0,
    buildYear: 2024,
    furnishedStatus: 'Unfurnished',
    amenities: [] as string[],
    imageUrl: '',
    images: [] as string[],
    latitude: 35.33,
    longitude: 33.32,
    formattedAddress: '',
    status: 'draft',
};

export const MAPBOX_TOKEN = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;
