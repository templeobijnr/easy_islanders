
import { Listing, Vehicle, Service, RestaurantItem, EventItem, HotelItem, UnifiedItem, AgentPersona, Client, Campaign, SocialUser, SocialPost, SocialGroup, PassportStamp, HotZone } from './types';

// --- AGENTS (3D Avatars) ---
export const AVAILABLE_AGENTS: AgentPersona[] = [
  {
    id: 'agent_estate',
    name: 'Merve',
    role: 'Real Estate Specialist',
    description: 'Rentals, Sales, Projects & Investments.',
    domainFocus: ['Real Estate'],
    color: 'bg-emerald-500',
    iconName: 'Building2',
    avatarUrl: 'https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg'
  },
  {
    id: 'agent_concierge',
    name: 'Hans',
    role: 'Lifestyle & Hotels',
    description: 'Hotels, events, and VIP services.',
    domainFocus: ['Services', 'Health & Beauty', 'Events', 'Hotels'],
    color: 'bg-purple-500',
    iconName: 'Sparkles',
    avatarUrl: 'https://img.freepik.com/free-psd/3d-illustration-person-with-glasses_23-2149436190.jpg'
  },
  {
    id: 'agent_auto',
    name: 'James',
    role: 'Vehicle Specialist',
    description: 'Luxury rentals and transfers.',
    domainFocus: ['Cars'],
    color: 'bg-blue-500',
    iconName: 'Car',
    avatarUrl: 'https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436180.jpg'
  },
  {
    id: 'agent_gourmet',
    name: 'Svetlana',
    role: 'Food & Dining',
    description: 'Reservations & fine dining.',
    domainFocus: ['Restaurants'],
    color: 'bg-orange-500',
    iconName: 'Utensils',
    avatarUrl: 'https://img.freepik.com/free-psd/3d-illustration-person-with-pink-hair_23-2149436186.jpg'
  }
];

// --- HELPERS FOR DATA GENERATION ---
const LOCATIONS = ['Kyrenia', 'Nicosia', 'Famagusta', 'Iskele', 'Lapta', 'Alsancak', 'Bellapais', 'Catalkoy', 'Esentepe', 'Bogaz'];
const PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=2670&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600596542815-2a4bab928d54?q=80&w=2668&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1512918760532-3ed868d86b5d?q=80&w=2670&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2670&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=2671&auto=format&fit=crop'
];
const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1550355291-bbee04a92027?q=80&w=2636&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2670&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=2670&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=2670&auto=format&fit=crop'
];
const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2670&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=2574&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544510802-4e8b767a52bb?q=80&w=2667&auto=format&fit=crop'
];
const HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2670&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?q=80&w=2525&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1571896349842-6e5a5133a886?q=80&w=2670&auto=format&fit=crop'
];

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// --- GENERATED LISTINGS (50 Items) ---
export const MOCK_LISTINGS: Listing[] = Array.from({ length: 50 }).map((_, i) => {
  const type = getRandom(['Villa', 'Apartment', 'Penthouse', 'Bungalow']);
  const rentalType = getRandom(['sale', 'short-term', 'long-term', 'project']);
  const loc = getRandom(LOCATIONS);
  const price = rentalType === 'sale' || rentalType === 'project' 
    ? 80000 + (i * 5000) 
    : rentalType === 'long-term' ? 400 + (i * 20) : 80 + (i * 5);

  return {
    id: `re_${i}`,
    domain: 'Real Estate',
    title: `${type} in ${loc} - ${rentalType === 'sale' ? 'Luxury Living' : 'Great View'}`,
    location: `${loc}, North Cyprus`,
    price: price,
    currency: 'GBP',
    category: type,
    rentalType: rentalType,
    imageUrl: PROPERTY_IMAGES[i % PROPERTY_IMAGES.length],
    tags: [type, 'Sea View', rentalType === 'project' ? 'Off Plan' : 'Ready'],
    maxGuests: 4 + (i % 4),
    amenities: ['Pool', 'Wifi', 'Parking', 'AC'],
    description: `A stunning ${type.toLowerCase()} located in the heart of ${loc}. Perfect for ${rentalType === 'short-term' ? 'your holiday' : 'living'}.`,
    rating: 4.0 + (i % 10) / 10,
    reviews: 10 + i,
    status: 'active',
    bedrooms: 1 + (i % 4),
    bathrooms: 1 + (i % 3),
    squareMeters: 80 + (i * 5),
    furnishedStatus: i % 2 === 0 ? 'Fully Furnished' : 'Semi-Furnished',
    agentPhone: '905330000000'
  };
});

// --- GENERATED CARS (50 Items) ---
export const MOCK_VEHICLES: Vehicle[] = Array.from({ length: 50 }).map((_, i) => {
  const make = getRandom(['Mercedes', 'BMW', 'Ford', 'Toyota', 'Nissan', 'Land Rover']);
  const type = getRandom(['rental', 'sale']);
  const price = type === 'sale' ? 15000 + (i * 1000) : 30 + (i * 2);
  
  return {
    id: `car_${i}`,
    domain: 'Cars',
    title: `${make} ${type === 'rental' ? 'Rental' : 'Series'}`,
    location: getRandom(LOCATIONS),
    price: price,
    currency: 'GBP',
    imageUrl: CAR_IMAGES[i % CAR_IMAGES.length],
    type: type,
    make: make,
    model: `Model ${i}`,
    year: 2020 + (i % 5),
    transmission: i % 3 === 0 ? 'Manual' : 'Automatic',
    fuelType: i % 4 === 0 ? 'Diesel' : 'Petrol',
    seats: 5,
    features: ['AC', 'Bluetooth', 'GPS'],
    tags: [make, type === 'rental' ? 'Daily' : 'Dealership'],
    status: 'active',
    agentPhone: '905330000000'
  };
});

// --- GENERATED RESTAURANTS (50 Items) ---
export const MOCK_RESTAURANTS: RestaurantItem[] = Array.from({ length: 50 }).map((_, i) => {
  const cat = getRandom(['Meyhane', 'Seafood', 'Bistro', 'Fine Dining', 'Cafe']);
  return {
    id: `rest_${i}`,
    domain: 'Restaurants',
    title: `${cat} Delight ${i}`,
    location: getRandom(LOCATIONS),
    price: 20 + (i % 50),
    currency: 'GBP',
    imageUrl: FOOD_IMAGES[i % FOOD_IMAGES.length],
    category: cat,
    restaurantName: `The ${cat} House ${i}`,
    tags: [cat, 'Dinner', 'Lunch'],
    status: 'active',
    agentPhone: '905330000000'
  };
});

// --- GENERATED HOTELS (50 Items) ---
export const MOCK_HOTELS: HotelItem[] = Array.from({ length: 50 }).map((_, i) => {
  const type = getRandom(['Boutique', 'Resort & Casino', 'City Hotel', 'Bungalow']);
  return {
    id: `hotel_${i}`,
    domain: 'Hotels',
    title: `${type} Paradise ${i}`,
    location: getRandom(LOCATIONS),
    hotelType: type,
    stars: 3 + (i % 3),
    price: 80 + (i * 5),
    currency: 'GBP',
    imageUrl: HOTEL_IMAGES[i % HOTEL_IMAGES.length],
    amenities: ['Pool', 'Spa', 'Gym', 'Breakfast'],
    breakfastIncluded: i % 2 === 0,
    checkInTime: '14:00',
    checkOutTime: '12:00',
    description: `Experience luxury at this amazing ${type}.`,
    tags: [type, 'Luxury', 'Stay'],
    status: 'active',
    agentPhone: '905330000000'
  };
});

// --- GENERATED SERVICES (50 Items) ---
export const MOCK_SERVICES: Service[] = Array.from({ length: 50 }).map((_, i) => {
  const cat = getRandom(['Cleaning', 'Plumbing', 'Electrician', 'Gardening', 'Health', 'Beauty']);
  return {
    id: `srv_${i}`,
    domain: cat === 'Health' || cat === 'Beauty' ? 'Health & Beauty' : 'Services',
    title: `Professional ${cat} ${i}`,
    location: getRandom(LOCATIONS),
    price: 30 + (i % 20),
    currency: 'GBP',
    imageUrl: 'https://images.unsplash.com/photo-1581578731117-104f2a412c5d?q=80&w=2574&auto=format&fit=crop',
    category: cat,
    pricingModel: i % 2 === 0 ? 'hourly' : 'fixed',
    durationMinutes: 60,
    providerName: `${cat} Pros Ltd`,
    tags: [cat, 'Professional', 'Trusted'],
    status: 'active',
    agentPhone: '905330000000'
  };
});

// --- GENERATED EVENTS (50 Items) ---
export const MOCK_EVENTS: EventItem[] = Array.from({ length: 50 }).map((_, i) => {
  const type = getRandom(['Concert', 'Party', 'Festival', 'Cultural']);
  return {
    id: `evt_${i}`,
    domain: 'Events',
    title: `${type} Night ${i}`,
    location: getRandom(LOCATIONS),
    price: 10 + (i % 20),
    currency: 'GBP',
    imageUrl: 'https://images.unsplash.com/photo-1514525253440-b393452e3383?q=80&w=2666&auto=format&fit=crop',
    eventType: type,
    date: '2024-08-15',
    venue: `${getRandom(LOCATIONS)} Amphitheatre`,
    totalTickets: 200,
    ticketsAvailable: 50 + i,
    organizer: 'Island Events Co',
    tags: [type, 'Nightlife', 'Music'],
    status: 'active',
    agentPhone: '905330000000'
  };
});

export const ALL_MOCK_ITEMS: UnifiedItem[] = [
  ...MOCK_LISTINGS,
  ...MOCK_VEHICLES,
  ...MOCK_SERVICES,
  ...MOCK_RESTAURANTS,
  ...MOCK_EVENTS,
  ...MOCK_HOTELS
];

// --- PASSPORT LOCATIONS & STAMPS ---
export const PASSPORT_LOCATIONS = [
  { name: 'Kyrenia Castle', category: 'History', icon: '🏰' },
  { name: 'Bellapais Abbey', category: 'History', icon: '⛪' },
  { name: 'Golden Beach', category: 'Beach', icon: '🏖️' },
  { name: 'Saint Hilarion', category: 'History', icon: '⛰️' },
  { name: 'Niazi\'s Restaurant', category: 'Dining', icon: '🍖' },
  { name: 'Alagadi Turtle Beach', category: 'Nature', icon: '🐢' },
  { name: 'Ghost Town Varosha', category: 'History', icon: '👻' },
  { name: 'Karpaz Gate Marina', category: 'Activity', icon: '⛵' },
  { name: 'Salamis Ruins', category: 'History', icon: '🏛️' },
  { name: 'Kantara Castle', category: 'History', icon: '🏰' },
  { name: 'Blue House', category: 'History', icon: '🏠' },
  { name: 'Cape Greco', category: 'Nature', icon: '🌅' },
];

const MOCK_STAMPS: PassportStamp[] = [
  { id: 's1', locationName: 'Kyrenia Castle', category: 'History', date: '2023-10-15', icon: '🏰' },
  { id: 's2', locationName: 'Golden Beach', category: 'Beach', date: '2023-09-01', icon: '🏖️' },
  { id: 's3', locationName: 'Bellapais Abbey', category: 'History', date: '2024-01-20', icon: '⛪' }
];

// --- SOCIAL MOCK DATA ---
export const MOCK_SOCIAL_USERS: SocialUser[] = [
  {
    id: 'u1',
    name: 'Alex Wanderer',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    rank: 'Islander',
    points: 1250,
    badges: ['Foodie', 'Explorer'],
    interests: ['Tennis', 'Hiking', 'Tech'],
    currentLocation: 'Kyrenia Harbour',
    currentMood: '☕ Working remotely',
    passportStamps: [MOCK_STAMPS[0], MOCK_STAMPS[1]],
    trustScore: 85,
    vouches: 12
  },
  {
    id: 'u2',
    name: 'Sophie Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
    rank: 'Local Legend',
    points: 3400,
    badges: ['VIP', 'Event Host'],
    interests: ['Dining', 'Crypto', 'Sailing'],
    currentLocation: 'Nicosia',
    currentMood: '💃 Night out',
    passportStamps: MOCK_STAMPS,
    trustScore: 98,
    vouches: 45
  },
  {
    id: 'u3',
    name: 'Mike Ross',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    rank: 'Explorer',
    points: 450,
    badges: ['Night Owl'],
    interests: ['Gaming', 'Nightlife', 'Tennis'],
    currentLocation: 'Famagusta',
    currentMood: '🎮 Gaming',
    passportStamps: [MOCK_STAMPS[1]],
    trustScore: 40,
    vouches: 3
  },
  {
    id: 'u4',
    name: 'Sarah Jenkins',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
    rank: 'Castaway',
    points: 150,
    badges: [],
    interests: ['Nature', 'Hiking', 'Photography'],
    currentLocation: 'Karpaz',
    currentMood: '🏕️ Camping',
    passportStamps: [],
    trustScore: 20,
    vouches: 1
  },
  {
    id: 'u5',
    name: 'David Miller',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop',
    rank: 'Explorer',
    points: 320,
    badges: ['Diver'],
    interests: ['Diving', 'Swimming', 'Nature'],
    currentLocation: 'Alsancak',
    currentMood: '🤿 Diving',
    passportStamps: [],
    trustScore: 55,
    vouches: 8
  },
  {
    id: 'u6',
    name: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    rank: 'Islander',
    points: 1100,
    badges: ['Socialite', 'Foodie'],
    interests: ['Dining', 'Events', 'Yoga'],
    currentLocation: 'Bellapais',
    currentMood: '🧘‍♀️ Yoga time',
    passportStamps: [MOCK_STAMPS[2]],
    trustScore: 75,
    vouches: 19
  }
];

export const CURRENT_USER: SocialUser = {
  id: 'me',
  name: 'You',
  avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop',
  rank: 'Explorer',
  points: 650,
  badges: ['Newcomer'],
  interests: ['Tech', 'Sailing'],
  currentLocation: 'Kyrenia',
  currentMood: '🌴 Chilling',
  passportStamps: [MOCK_STAMPS[0]],
  trustScore: 30,
  vouches: 4
};

export const MOCK_HOT_ZONES: HotZone[] = [
  {
    id: 'zone1',
    name: 'La Nouba',
    location: 'Kyrenia',
    category: 'Nightlife',
    activeCount: 55,
    imageUrl: 'https://images.unsplash.com/photo-1566414791190-040526d52455?q=80&w=2670&auto=format&fit=crop',
    isTrending: true
  },
  {
    id: 'zone2',
    name: 'Shooters Coffee',
    location: 'Kyrenia Harbour',
    category: 'Cafe',
    activeCount: 28,
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2678&auto=format&fit=crop'
  },
  {
    id: 'zone3',
    name: 'Escape Beach Club',
    location: 'Alsancak',
    category: 'Beach',
    activeCount: 142,
    imageUrl: 'https://images.unsplash.com/photo-1540206351-d6465b3ac5c1?q=80&w=2664&auto=format&fit=crop',
    isTrending: true
  },
  {
    id: 'zone4',
    name: 'Bellapais Abbey',
    location: 'Bellapais',
    category: 'Culture',
    activeCount: 12,
    imageUrl: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?q=80&w=2670&auto=format&fit=crop'
  },
  {
    id: 'zone5',
    name: 'Porto Crio',
    location: 'Kyrenia Harbour',
    category: 'Dining',
    activeCount: 45,
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2670&auto=format&fit=crop'
  }
];

export const MOCK_GROUPS: SocialGroup[] = [
  {
    id: 'g1',
    name: 'Kyrenia Digital Nomads',
    description: 'Co-working meets coffee. We meet every Wednesday.',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2671&auto=format&fit=crop',
    interest: 'Tech',
    members: 142,
    isMember: true
  },
  {
    id: 'g2',
    name: 'North Cyprus Hikers',
    description: 'Exploring the Five Finger Mountains every weekend.',
    image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2670&auto=format&fit=crop',
    interest: 'Hiking',
    members: 856
  },
  {
    id: 'g3',
    name: 'Cyprus Crypto Club',
    description: 'Trading strategies, blockchain news and meetups.',
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=2555&auto=format&fit=crop',
    interest: 'Crypto',
    members: 320
  },
  {
    id: 'g4',
    name: 'Islander Foodies',
    description: 'Hunting for the best Kebab on the island.',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2670&auto=format&fit=crop',
    interest: 'Dining',
    members: 2100
  },
  {
    id: 'g5',
    name: 'Yoga by the Sea',
    description: 'Morning yoga sessions at Escape Beach.',
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=2670&auto=format&fit=crop',
    interest: 'Nature',
    members: 450
  },
  {
    id: 'g6',
    name: 'Expats in Kyrenia',
    description: 'Support and social events for newcomers.',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2669&auto=format&fit=crop',
    interest: 'Events',
    members: 1200
  },
  {
    id: 'g7',
    name: 'Cyprus Car Enthusiasts',
    description: 'Meetups for classic and sports car owners.',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2600&auto=format&fit=crop',
    interest: 'Cars',
    members: 670
  },
  {
    id: 'g8',
    name: 'Parents of North Cyprus',
    description: 'Playdates, school info and parenting support.',
    image: 'https://images.unsplash.com/photo-1559354692-5e2d652663f8?q=80&w=2558&auto=format&fit=crop',
    interest: 'Social',
    members: 890
  }
];

export const MOCK_SOCIAL_FEED: SocialPost[] = [
  {
    id: 'p1',
    author: MOCK_SOCIAL_USERS[0], // Alex
    type: 'plan',
    content: 'I’m organizing a tennis match at the Lord’s Palace courts this Saturday. Need 2 more players! Who’s in?',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    location: 'Lords Palace Hotel',
    likes: 5,
    comments: 3,
    attendees: [MOCK_SOCIAL_USERS[0], MOCK_SOCIAL_USERS[2]],
    maxAttendees: 4,
    eventDate: 'Sat, 10:00 AM'
  },
  {
    id: 'p2',
    author: MOCK_SOCIAL_USERS[1], // Sophie
    type: 'review',
    content: 'Finally tried the Full Kleftiko at Niazi’s. Absolutely melts in your mouth! 🍖 Best lamb on the island, hands down.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    location: 'Niazi\'s Restaurant',
    imageUrl: 'https://images.unsplash.com/photo-1544510802-4e8b767a52bb?q=80&w=2667&auto=format&fit=crop',
    likes: 24,
    comments: 8,
    rating: 5
  },
  {
    id: 'p3',
    author: MOCK_SOCIAL_USERS[2], // Mike
    type: 'check_in',
    content: 'Checked in for a weekend getaway. The view from here is unreal.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    location: 'Gillham Vineyard Hotel',
    imageUrl: 'https://images.unsplash.com/photo-1560624052-449f5ddf0c31?q=80&w=2535&auto=format&fit=crop',
    likes: 42,
    comments: 2
  },
  {
    id: 'p4',
    author: MOCK_SOCIAL_USERS[5], // Emma
    type: 'status',
    content: 'Sunset yoga at Escape Beach was magical today. Highly recommend joining the group!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    location: 'Escape Beach',
    likes: 18,
    comments: 4
  },
  {
    id: 'p5',
    author: MOCK_SOCIAL_USERS[4], // David
    type: 'review',
    content: 'Just returned from a dive at the Zenobia Wreck. Visibility was perfect. Saw some huge groupers!',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    location: 'Larnaca (Zenobia)',
    imageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=2670&auto=format&fit=crop',
    likes: 56,
    comments: 12,
    rating: 5
  }
];

// --- MOCK CRM DATA ---
export const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'James Wilson',
    email: 'james.w@example.com',
    phone: '+44 7700 900000',
    status: 'Viewing Scheduled',
    source: 'Website',
    lastContact: '2024-05-10',
    assignedAgent: 'Sarah',
    tags: ['Investor', 'High Budget']
  },
  {
    id: 'c2',
    name: 'Elena Petrova',
    email: 'elena.p@example.com',
    phone: '+7 900 000 0000',
    status: 'New Lead',
    source: 'WhatsApp',
    lastContact: '2024-05-12',
    assignedAgent: 'Mike',
    tags: ['Villa', 'Kyrenia']
  },
  {
    id: 'c3',
    name: 'Ahmed Yilmaz',
    email: 'ahmed.y@example.com',
    phone: '+90 533 123 4567',
    status: 'Negotiation',
    source: 'Referral',
    lastContact: '2024-05-14',
    assignedAgent: 'Sarah',
    tags: ['Commercial', 'Famagusta']
  },
  {
    id: 'c4',
    name: 'John Smith',
    email: 'john.s@example.com',
    phone: '+44 7800 111222',
    status: 'Closed',
    source: 'Walk-in',
    lastContact: '2024-04-20',
    assignedAgent: 'Ali',
    tags: ['Car Rental', 'Weekly'],
    totalSpend: 350
  },
  {
    id: 'c5',
    name: 'Maria Garcia',
    email: 'maria.g@example.com',
    phone: '+34 600 000 000',
    status: 'Contacted',
    source: 'Website',
    lastContact: '2024-05-15',
    assignedAgent: 'Mateo',
    tags: ['Holiday', 'Hotel']
  }
];

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'cp1',
    title: 'Summer Villa Promotion',
    type: 'Email',
    status: 'Sent',
    audienceSize: 1250,
    sentDate: '2024-05-01',
    stats: { openRate: 45, clickRate: 12 }
  },
  {
    id: 'cp2',
    title: 'Car Rental Flash Sale',
    type: 'WhatsApp',
    status: 'Scheduled',
    audienceSize: 500,
    sentDate: '2024-06-01',
    stats: { openRate: 0, clickRate: 0 }
  }
];
