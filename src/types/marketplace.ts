
import { 
  MarketplaceDomain, RealEstateType, HotelType, VehicleType, 
  ServiceType, RestaurantType, EventType 
} from './enums';

export interface BaseItem {
  id: string;
  domain: MarketplaceDomain;
  title: string;
  description?: string;
  imageUrl: string;
  location: string; 
  rating?: number;
  reviews?: number;
  tags: string[];
  status?: string;
  price: number;
  currency: string;
  agentPhone?: string; 
}

export interface Listing extends BaseItem {
  domain: 'Real Estate';
  businessId?: string;
  ownerUid?: string;
  ownerId?: string;
  referenceCode?: string;
  rentalType: RealEstateType; 
  category: string; 
  amenities?: string[];
  maxGuests?: number;
  latitude?: number;
  longitude?: number;
  placeName?: string;
  
  bedrooms?: number;
  bathrooms?: number;
  livingRooms?: number;
  squareMeters?: number; 
  plotSize?: number; 
  buildYear?: number;
  floorNumber?: number;
  totalFloors?: number;
  
  completionDate?: string; 
  developerName?: string; 
  
  furnishedStatus?: 'Unfurnished' | 'Semi-Furnished' | 'Fully Furnished';
  titleDeedType?: 'Turkish Title' | 'Exchange Title' | 'TMD Title' | 'Leasehold';
  vatStatus?: 'Paid' | 'Not Paid' | 'Exempt';
  
  images?: string[];
  
  views?: number;
  leads?: number;
  isBoosted?: boolean;
}

export interface HotelItem extends BaseItem {
  domain: 'Hotels';
  hotelType: HotelType;
  stars: number;
  amenities: string[];
  breakfastIncluded: boolean;
  checkInTime: string;
  checkOutTime: string;
  roomTypes?: string[];
}

export interface Vehicle extends BaseItem {
  domain: 'Cars';
  type: VehicleType; 
  make: string;
  model: string;
  year: number;
  transmission: 'Automatic' | 'Manual';
  fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
  seats: number;
  features: string[];
  mileage?: number; 
}

export interface Service extends BaseItem {
  domain: 'Services' | 'Health & Beauty';
  category: ServiceType; 
  subCategory?: string; // Specific niche (e.g., 'Leak Detection' under 'Plumbing')
  pricingModel: 'hourly' | 'fixed' | 'quote';
  durationMinutes?: number; // Avg duration
  availableSlots?: string[]; 
  providerName: string;
  serviceArea?: string[];
}

export interface RestaurantItem extends BaseItem {
  domain: 'Restaurants';
  category: RestaurantType;
  ingredients?: string[];
  isVegetarian?: boolean;
  preparationTime?: number;
  restaurantName: string;
}

export interface EventItem extends BaseItem {
  domain: 'Events';
  eventType: EventType;
  date: string;
  venue: string;
  totalTickets: number;
  ticketsAvailable: number;
  organizer: string;
}

export interface Product extends BaseItem {
  domain: 'Marketplace';
  category: string; 
  condition: 'New' | 'Used';
  stock: number;
  sellerName: string;
}

export type UnifiedItem = Listing | Vehicle | Service | RestaurantItem | EventItem | Product | HotelItem;
