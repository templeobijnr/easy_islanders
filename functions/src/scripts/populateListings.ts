import { db } from '../config/firebase';
import {
  MarketplaceDomain, RealEstateType, VehicleType,
  HotelType, RestaurantType, EventType, ServiceType
} from '../types/enums';

// North Cyprus locations
const locations = [
  'Kyrenia', 'Famagusta', 'Nicosia', 'Morphou', 'Trikomo',
  'Bellapais', 'Lapta', 'Iskele', 'Catalkoy', 'Esentepe',
  'Alsancak', 'Ozankoy', 'Karaman', 'Bogaz', 'Karpaz'
];

// Real Estate data
const realEstateCategories = ['Villa', 'Apartment', 'Penthouse', 'Studio', 'Townhouse', 'Land', 'Commercial'];
const realEstateAmenities = [
  'Pool', 'Gym', 'Parking', 'Wifi', 'AC', 'Sea View', 'Mountain View',
  'Garden', 'BBQ', 'Balcony', 'Terrace', 'Jacuzzi', 'Security', 'Elevator'
];

// Car data
const carMakes = ['Toyota', 'Hyundai', 'BMW', 'Mercedes', 'Audi', 'Volkswagen', 'Nissan', 'Honda', 'Ford', 'Kia'];
const carModels: Record<string, string[]> = {
  'Toyota': ['Corolla', 'Camry', 'RAV4', 'Yaris', 'Land Cruiser'],
  'Hyundai': ['i10', 'i20', 'Tucson', 'Elantra', 'Santa Fe'],
  'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'i8'],
  'Mercedes': ['C-Class', 'E-Class', 'GLA', 'GLC', 'S-Class'],
  'Audi': ['A3', 'A4', 'Q3', 'Q5', 'Q7'],
  'Volkswagen': ['Golf', 'Passat', 'Tiguan', 'Polo', 'Jetta'],
  'Nissan': ['Micra', 'Qashqai', 'X-Trail', 'Juke', 'Navara'],
  'Honda': ['Civic', 'Accord', 'CR-V', 'Jazz', 'HR-V'],
  'Ford': ['Focus', 'Fiesta', 'Kuga', 'Mondeo', 'Ranger'],
  'Kia': ['Picanto', 'Sportage', 'Ceed', 'Sorento', 'Stonic']
};
const carFeatures = ['AC', 'GPS', 'Bluetooth', 'USB', 'Cruise Control', 'Parking Sensors', 'Sunroof', 'Leather Seats'];

// Restaurant data
const restaurantNames = [
  'The Olive Tree', 'Harbour Lights', 'Sunset Bistro', 'Cyprus Kitchen', 'Sea Breeze',
  'Mountain View Restaurant', 'The Garden Cafe', 'Castle View', 'Mediterranean Grill', 'Island Flavours',
  'The Blue Lagoon', 'Vintage Wine Bar', 'Spice Garden', 'The Golden Fish', 'Terrace Restaurant'
];

// Event data
const eventVenues = [
  'Bellapais Abbey', 'Kyrenia Harbour', 'Salamis Ruins', 'Nicosia City Center',
  'Famagusta Castle', 'Karpaz Beach', 'Cratos Hotel', 'Merit Casino', 'City Mall', 'The Arkin'
];

// Service provider names
const serviceProviders = [
  'Cyprus Pro Services', 'Island Solutions', 'Expert Care', 'Quick Fix', 'Premium Services',
  'Local Experts', 'Reliable Services', 'Professional Touch', 'Island Care', 'Trusted Services'
];

// Hotel names
const hotelNames = [
  'The Dome Hotel', 'Acapulco Resort', 'Merit Royal', 'Cratos Premium', 'Oscar Resort',
  'Riverside Holiday Village', 'Grand Sapphire', 'Kaya Artemis', 'Limak Cyprus', 'Noah\'s Ark',
  'Salamis Bay Conti', 'Vuni Palace', 'The Colony', 'Bellapais Gardens', 'Pia Bella'
];

// Marketplace product categories
const marketplaceCategories = [
  'Electronics', 'Furniture', 'Home Appliances', 'Sports Equipment', 'Books',
  'Clothing', 'Toys', 'Garden Equipment', 'Tools', 'Musical Instruments'
];

// Helper functions
const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBoolean = (): boolean => Math.random() > 0.5;
const randomSubset = <T>(arr: T[], min: number, max: number): T[] => {
  const count = randomInt(min, max);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

// Generate listings
const generateRealEstateListing = (index: number, type: RealEstateType) => {
  const category = randomFromArray(realEstateCategories);
  const location = randomFromArray(locations);

  let priceRange: [number, number];
  switch (type) {
    case 'short-term':
      priceRange = [50, 500];
      break;
    case 'long-term':
      priceRange = [300, 2000];
      break;
    case 'sale':
      priceRange = [50000, 500000];
      break;
    case 'project':
      priceRange = [80000, 400000];
      break;
  }

  return {
    domain: 'Real Estate' as MarketplaceDomain,
    title: `${category} in ${location}`,
    description: `Beautiful ${category.toLowerCase()} located in ${location}. Perfect for ${type === 'short-term' ? 'holidays' : type === 'long-term' ? 'long-term living' : 'investment'}.`,
    imageUrl: `https://picsum.photos/800/600?random=${index}`,
    location,
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    reviews: randomInt(5, 100),
    tags: randomSubset(realEstateAmenities, 2, 4),
    status: 'active',
    price: randomInt(priceRange[0], priceRange[1]),
    currency: 'GBP',
    agentPhone: '+90 533 ' + randomInt(100, 999) + ' ' + randomInt(1000, 9999),
    rentalType: type,
    category,
    amenities: randomSubset(realEstateAmenities, 3, 8),
    maxGuests: randomInt(2, 10),
    bedrooms: randomInt(1, 6),
    bathrooms: randomInt(1, 4),
    livingRooms: randomInt(1, 3),
    squareMeters: randomInt(50, 400),
    furnishedStatus: randomFromArray(['Unfurnished', 'Semi-Furnished', 'Fully Furnished'] as const),
    titleDeedType: randomFromArray(['Turkish Title', 'Exchange Title', 'TMD Title'] as const),
    views: randomInt(10, 500),
    leads: randomInt(0, 50),
    isBoosted: randomBoolean()
  };
};

const generateVehicle = (index: number, type: VehicleType) => {
  const make = randomFromArray(carMakes);
  const model = randomFromArray(carModels[make]);
  const year = randomInt(2015, 2024);
  const location = randomFromArray(locations);

  let priceRange: [number, number];
  switch (type) {
    case 'rental':
      priceRange = [15, 150];
      break;
    case 'sale':
      priceRange = [5000, 50000];
      break;
    case 'taxi':
      priceRange = [20, 100];
      break;
  }

  return {
    domain: 'Cars' as MarketplaceDomain,
    title: `${year} ${make} ${model}`,
    description: `Reliable ${make} ${model} from ${year}. ${type === 'rental' ? 'Available for daily/weekly rental' : type === 'sale' ? 'Excellent condition, well maintained' : 'Licensed taxi service'}.`,
    imageUrl: `https://picsum.photos/800/600?random=car${index}`,
    location,
    rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
    reviews: randomInt(5, 80),
    tags: [make, model, type],
    status: 'active',
    price: randomInt(priceRange[0], priceRange[1]),
    currency: type === 'rental' || type === 'taxi' ? 'GBP' : 'GBP',
    type,
    make,
    model,
    year,
    transmission: randomFromArray(['Automatic', 'Manual'] as const),
    fuelType: randomFromArray(['Petrol', 'Diesel', 'Electric', 'Hybrid'] as const),
    seats: randomInt(2, 7),
    features: randomSubset(carFeatures, 3, 6),
    mileage: type === 'sale' ? randomInt(10000, 150000) : undefined,
    agentPhone: type === 'taxi' ? '+905488639394' : undefined
  };
};

const generateHotel = (index: number, hotelType: HotelType) => {
  const name = randomFromArray(hotelNames) + (hotelType === 'Resort & Casino' ? ' Casino' : '');
  const location = randomFromArray(locations);
  const stars = randomInt(3, 5);

  return {
    domain: 'Hotels' as MarketplaceDomain,
    title: name,
    description: `${stars}-star ${hotelType} in ${location}. Enjoy luxury accommodations with stunning views.`,
    imageUrl: `https://picsum.photos/800/600?random=hotel${index}`,
    location,
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    reviews: randomInt(20, 500),
    tags: [hotelType, `${stars} Star`, location],
    status: 'active',
    price: randomInt(50, 300),
    currency: 'GBP',
    hotelType,
    stars,
    amenities: randomSubset([...realEstateAmenities, 'Restaurant', 'Bar', 'Spa', 'Beach Access'], 5, 10),
    breakfastIncluded: randomBoolean(),
    checkInTime: '14:00',
    checkOutTime: '11:00',
    roomTypes: randomSubset(['Standard', 'Deluxe', 'Suite', 'Family Room', 'Presidential'], 2, 4)
  };
};

const generateRestaurant = (index: number, category: RestaurantType) => {
  const name = randomFromArray(restaurantNames);
  const location = randomFromArray(locations);

  return {
    domain: 'Restaurants' as MarketplaceDomain,
    title: name,
    description: `${category} restaurant serving delicious cuisine in ${location}. Perfect for dining with friends and family.`,
    imageUrl: `https://picsum.photos/800/600?random=restaurant${index}`,
    location,
    rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
    reviews: randomInt(10, 300),
    tags: [category, 'Dining', location],
    status: 'active',
    price: randomInt(15, 100),
    currency: 'GBP',
    category,
    ingredients: randomSubset(['Fresh Fish', 'Local Vegetables', 'Imported Meats', 'Organic', 'Homemade'], 2, 4),
    isVegetarian: randomBoolean(),
    preparationTime: randomInt(15, 60),
    restaurantName: name
  };
};

const generateEvent = (index: number, eventType: EventType) => {
  const venue = randomFromArray(eventVenues);
  const location = randomFromArray(locations);
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, 90));
  const totalTickets = randomInt(50, 1000);

  return {
    domain: 'Events' as MarketplaceDomain,
    title: `${eventType} at ${venue}`,
    description: `Join us for an amazing ${eventType.toLowerCase()} event at ${venue}. Don't miss out!`,
    imageUrl: `https://picsum.photos/800/600?random=event${index}`,
    location,
    rating: parseFloat((4.0 + Math.random() * 1.0).toFixed(1)),
    reviews: randomInt(5, 150),
    tags: [eventType, venue],
    status: 'active',
    price: randomInt(10, 200),
    currency: 'GBP',
    eventType,
    date: date.toISOString().split('T')[0],
    venue,
    totalTickets,
    ticketsAvailable: randomInt(0, totalTickets),
    organizer: randomFromArray(serviceProviders)
  };
};

const generateService = (index: number, category: ServiceType) => {
  const providerName = randomFromArray(serviceProviders);
  const location = randomFromArray(locations);

  return {
    domain: randomFromArray(['Services', 'Health & Beauty'] as const),
    title: `${category} - ${providerName}`,
    description: `Professional ${category.toLowerCase()} services in ${location}. Experienced and reliable.`,
    imageUrl: `https://picsum.photos/800/600?random=service${index}`,
    location,
    rating: parseFloat((4.0 + Math.random() * 1.0).toFixed(1)),
    reviews: randomInt(5, 100),
    tags: [category, 'Professional', location],
    status: 'active',
    price: randomInt(20, 200),
    currency: 'GBP',
    category,
    pricingModel: randomFromArray(['hourly', 'fixed', 'quote'] as const),
    durationMinutes: randomInt(30, 240),
    providerName,
    serviceArea: randomSubset(locations, 1, 5)
  };
};

const generateMarketplaceProduct = (index: number) => {
  const category = randomFromArray(marketplaceCategories);
  const location = randomFromArray(locations);

  return {
    domain: 'Marketplace' as MarketplaceDomain,
    title: `${category} Item #${index}`,
    description: `Quality ${category.toLowerCase()} product in great condition. Located in ${location}.`,
    imageUrl: `https://picsum.photos/800/600?random=product${index}`,
    location,
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    reviews: randomInt(5, 80),
    tags: [category, location],
    status: 'active',
    price: randomInt(10, 500),
    currency: 'GBP',
    category,
    condition: randomFromArray(['New', 'Used'] as const),
    stock: randomInt(1, 50),
    sellerName: randomFromArray(serviceProviders)
  };
};

// Main population function
export const populateListings = async () => {
  console.log('🚀 Starting database population...');

  const batch = db.batch();
  let count = 0;

  try {
    // Real Estate (100 per type)
    const realEstateTypes: RealEstateType[] = ['short-term', 'long-term', 'sale', 'project'];
    for (const type of realEstateTypes) {
      for (let i = 0; i < 100; i++) {
        const listing = generateRealEstateListing(count, type);
        const docRef = db.collection('listings').doc(`re_${type}_${i}`);
        batch.set(docRef, listing);
        count++;
      }
      console.log(`✅ Generated 100 Real Estate listings for type: ${type}`);
    }

    // Cars (100 per type)
    const vehicleTypes: VehicleType[] = ['rental', 'sale', 'taxi'];
    for (const type of vehicleTypes) {
      for (let i = 0; i < 100; i++) {
        const vehicle = generateVehicle(count, type);
        const docRef = db.collection('listings').doc(`car_${type}_${i}`);
        batch.set(docRef, vehicle);
        count++;
      }
      console.log(`✅ Generated 100 Car listings for type: ${type}`);
    }

    // Hotels (100 per type)
    const hotelTypes: HotelType[] = ['Boutique', 'Resort & Casino', 'City Hotel', 'Bungalow', 'Historic'];
    for (const type of hotelTypes) {
      for (let i = 0; i < 100; i++) {
        const hotel = generateHotel(count, type);
        const docRef = db.collection('listings').doc(`hotel_${type.replace(/\s+/g, '_')}_${i}`);
        batch.set(docRef, hotel);
        count++;
      }
      console.log(`✅ Generated 100 Hotel listings for type: ${type}`);
    }

    // Restaurants (100 per type)
    const restaurantTypes: RestaurantType[] = ['Meyhane', 'Seafood', 'Bistro', 'Fine Dining', 'Cafe'];
    for (const type of restaurantTypes) {
      for (let i = 0; i < 100; i++) {
        const restaurant = generateRestaurant(count, type);
        const docRef = db.collection('listings').doc(`restaurant_${type.replace(/\s+/g, '_')}_${i}`);
        batch.set(docRef, restaurant);
        count++;
      }
      console.log(`✅ Generated 100 Restaurant listings for type: ${type}`);
    }

    // Events (100 per type)
    const eventTypes: EventType[] = ['Party', 'Concert', 'Cultural', 'Networking', 'Festival'];
    for (const type of eventTypes) {
      for (let i = 0; i < 100; i++) {
        const event = generateEvent(count, type);
        const docRef = db.collection('listings').doc(`event_${type}_${i}`);
        batch.set(docRef, event);
        count++;
      }
      console.log(`✅ Generated 100 Event listings for type: ${type}`);
    }

    // Services (100 per type - first 5 types to keep it manageable)
    const serviceTypes: ServiceType[] = [
      'Plumbing', 'Electrician', 'Gardening', 'Home Maintenance', 'Renovation',
      'Cleaning', 'Vehicle Services', 'Repair', 'Weddings & Events', 'Pet Services'
    ];
    for (const type of serviceTypes) {
      for (let i = 0; i < 100; i++) {
        const service = generateService(count, type);
        const docRef = db.collection('listings').doc(`service_${type.replace(/\s+/g, '_')}_${i}`);
        batch.set(docRef, service);
        count++;
      }
      console.log(`✅ Generated 100 Service listings for type: ${type}`);
    }

    // Marketplace (100 products)
    for (let i = 0; i < 100; i++) {
      const product = generateMarketplaceProduct(count);
      const docRef = db.collection('listings').doc(`product_${i}`);
      batch.set(docRef, product);
      count++;
    }
    console.log(`✅ Generated 100 Marketplace listings`);

    // Commit the batch (Firestore has a 500 doc limit per batch, so we need multiple batches)
    console.log(`📦 Total listings generated: ${count}`);
    console.log('⚠️  Note: Firestore batch write limit is 500. We need to split into multiple batches...');

    // We can't commit all at once, so let's return the count for now
    // In production, you'd want to split this into multiple batches
    console.log('⚠️  Please use the chunked version to actually write to Firestore');

    return count;

  } catch (error) {
    console.error('❌ Error populating listings:', error);
    throw error;
  }
};

// Chunked version for actual Firebase write
export const populateListingsChunked = async () => {
  console.log('🚀 Starting chunked database population...');

  let totalCount = 0;
  const chunkSize = 500;
  let currentBatch = db.batch();
  let batchCount = 0;
  let batchNumber = 1;

  const addToBatch = async (docRef: FirebaseFirestore.DocumentReference, data: any) => {
    // Remove undefined values and add timestamps
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    // Add required fields
    const now = new Date();
    cleanData.createdAt = now;
    cleanData.updatedAt = now;
    cleanData.ownerUid = cleanData.ownerUid || 'system'; // Add default owner if not present

    currentBatch.set(docRef, cleanData);
    batchCount++;
    totalCount++;

    if (batchCount >= chunkSize) {
      console.log(`📦 Committing batch ${batchNumber} (${batchCount} documents)...`);
      await currentBatch.commit();
      console.log(`✅ Batch ${batchNumber} committed successfully`);
      currentBatch = db.batch();
      batchCount = 0;
      batchNumber++;
    }
  };

  try {
    let count = 0;

    // Real Estate
    const realEstateTypes: RealEstateType[] = ['short-term', 'long-term', 'sale', 'project'];
    for (const type of realEstateTypes) {
      for (let i = 0; i < 100; i++) {
        const listing = generateRealEstateListing(count, type);
        const docRef = db.collection('listings').doc(`re_${type}_${i}`);
        await addToBatch(docRef, listing);
        count++;
      }
      console.log(`✅ Queued 100 Real Estate listings for type: ${type}`);
    }

    // Cars
    const vehicleTypes: VehicleType[] = ['rental', 'sale', 'taxi'];
    for (const type of vehicleTypes) {
      for (let i = 0; i < 100; i++) {
        const vehicle = generateVehicle(count, type);
        const docRef = db.collection('listings').doc(`car_${type}_${i}`);
        await addToBatch(docRef, vehicle);
        count++;
      }
      console.log(`✅ Queued 100 Car listings for type: ${type}`);
    }

    // Hotels
    const hotelTypes: HotelType[] = ['Boutique', 'Resort & Casino', 'City Hotel', 'Bungalow', 'Historic'];
    for (const type of hotelTypes) {
      for (let i = 0; i < 100; i++) {
        const hotel = generateHotel(count, type);
        const docRef = db.collection('listings').doc(`hotel_${type.replace(/\s+/g, '_')}_${i}`);
        await addToBatch(docRef, hotel);
        count++;
      }
      console.log(`✅ Queued 100 Hotel listings for type: ${type}`);
    }

    // Restaurants
    const restaurantTypes: RestaurantType[] = ['Meyhane', 'Seafood', 'Bistro', 'Fine Dining', 'Cafe'];
    for (const type of restaurantTypes) {
      for (let i = 0; i < 100; i++) {
        const restaurant = generateRestaurant(count, type);
        const docRef = db.collection('listings').doc(`restaurant_${type.replace(/\s+/g, '_')}_${i}`);
        await addToBatch(docRef, restaurant);
        count++;
      }
      console.log(`✅ Queued 100 Restaurant listings for type: ${type}`);
    }

    // Events
    const eventTypes: EventType[] = ['Party', 'Concert', 'Cultural', 'Networking', 'Festival'];
    for (const type of eventTypes) {
      for (let i = 0; i < 100; i++) {
        const event = generateEvent(count, type);
        const docRef = db.collection('listings').doc(`event_${type}_${i}`);
        await addToBatch(docRef, event);
        count++;
      }
      console.log(`✅ Queued 100 Event listings for type: ${type}`);
    }

    // Services
    const serviceTypes: ServiceType[] = [
      'Plumbing', 'Electrician', 'Gardening', 'Home Maintenance', 'Renovation',
      'Cleaning', 'Vehicle Services', 'Repair', 'Weddings & Events', 'Pet Services'
    ];
    for (const type of serviceTypes) {
      for (let i = 0; i < 100; i++) {
        const service = generateService(count, type);
        const docRef = db.collection('listings').doc(`service_${type.replace(/\s+/g, '_')}_${i}`);
        await addToBatch(docRef, service);
        count++;
      }
      console.log(`✅ Queued 100 Service listings for type: ${type}`);
    }

    // Marketplace
    for (let i = 0; i < 100; i++) {
      const product = generateMarketplaceProduct(count);
      const docRef = db.collection('listings').doc(`product_${i}`);
      await addToBatch(docRef, product);
      count++;
    }
    console.log(`✅ Queued 100 Marketplace listings`);

    // Commit any remaining documents
    if (batchCount > 0) {
      console.log(`📦 Committing final batch ${batchNumber} (${batchCount} documents)...`);
      await currentBatch.commit();
      console.log(`✅ Final batch committed successfully`);
    }

    console.log(`\n🎉 Successfully populated ${totalCount} listings across all categories!`);
    return totalCount;

  } catch (error) {
    console.error('❌ Error populating listings:', error);
    throw error;
  }
};

// CLI runner
if (require.main === module) {
  populateListingsChunked()
    .then(count => {
      console.log(`✅ Done! Populated ${count} listings.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}
