
/**
 * Frontend‑side implementations for "tools" used by the local
 * agent experience (when running without the full backend).
 *
 * These functions:
 *  - operate on UnifiedItem data from StorageService
 *  - mimic what the real backend + tools do (search, booking,
 *    taxi dispatch, encyclopedia lookups, etc.)
 *  - are safe to use in Storybook / local dev or as a fallback
 *    when the Functions API is not available.
 *
 * Production flows should go through the Firebase Functions
 * tool resolvers; these implementations are primarily for
 * prototyping and offline behaviour.
 */

import { UnifiedItem, Booking, Listing, HotelItem, Vehicle } from "../types";
import { StorageService } from "../services/storageService";
import { ISLAND_KNOWLEDGE_BASE, MOCK_REALTIME_DATA } from "../services/knowledgeBase";

// --- Helper to fetch all data ---
const getAllUnifiedItems = async (): Promise<UnifiedItem[]> => {
  return await StorageService.getListings();
};

// --- IMPLEMENTATIONS ---

/**
 * Local search implementation that mirrors the behaviour of
 * the backend `searchMarketplace` tool using in‑memory items.
 */
export const executeSearch = async (args: any): Promise<UnifiedItem[]> => {
  console.log("Executing Search Tool:", args);
  const allItems = await getAllUnifiedItems();

  let results = allItems.filter(item => {
    // 1. Domain Check
    if (item.domain !== args.domain && args.domain !== 'Marketplace') return false;
    
    // 2. SubCategory / Type Check
    if (args.subCategory) {
       const sub = args.subCategory.toLowerCase();
       
       if (item.domain === 'Real Estate') {
          const l = item as Listing;
          if (l.rentalType !== sub && !l.category.toLowerCase().includes(sub)) return false;
       }
       else if (item.domain === 'Hotels') {
          const h = item as HotelItem;
          if (h.hotelType.toLowerCase() !== sub) return false;
       }
       else if (item.domain === 'Cars') {
          const c = item as Vehicle;
          if (c.type !== sub) return false;
       }
       else {
         if (!(item as any).category?.toLowerCase().includes(sub)) return false;
       }
    }

    // 3. Location Check
    if (args.location && !item.location.toLowerCase().includes(args.location.toLowerCase())) {
      return false;
    }

    // 4. Price Check (Robust)
    if (args.minPrice !== undefined && item.price < args.minPrice) return false;
    if (args.maxPrice !== undefined && item.price > args.maxPrice) return false;

    // 5. Amenities Check (Strict)
    if (args.amenities && Array.isArray(args.amenities)) {
       const itemFeatures = [
          ...(item.tags || []),
          ...((item as any).amenities || []),
          ...((item as any).features || [])
       ].map(f => f.toLowerCase());

       const hasAll = args.amenities.every((req: string) => 
          itemFeatures.some(f => f.includes(req.toLowerCase()))
       );

       if (!hasAll) return false;
    }

    // 6. Text Query Check
    if (args.query) {
      const q = args.query.toLowerCase();
      const matches = 
        item.title.toLowerCase().includes(q) || 
        item.tags.some(t => t.toLowerCase().includes(q));
      if (!matches) return false;
    }
    
    return true;
  });

  // 7. Sorting
  if (args.sortBy) {
     if (args.sortBy === 'price_asc') {
        results.sort((a, b) => a.price - b.price);
     } else if (args.sortBy === 'price_desc') {
        results.sort((a, b) => b.price - a.price);
     } else if (args.sortBy === 'rating') {
        results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
     }
  }

  return results;
};

/**
 * Create a local booking object for an item and decide whether
 * the UI should show a payment step.
 *
 * In production this is backed by Firestore + Stripe; here we
 * just create a client‑side Booking instance.
 */
export const executeBooking = async (args: any): Promise<{ booking: Booking, requiresPayment: boolean }> => {
  const allItems = await getAllUnifiedItems();
  const item = allItems.find(i => i.id === args.itemId);
  
  if (!item) throw new Error("Item not found");

  // STRICT FLOW SEPARATION
  const isShortTerm = args.flowType === 'short_term_rental';
  
  // Status determination
  // Short Term -> Waiting for payment
  // Long Term -> Requesting a viewing from the owner
  const initialStatus = isShortTerm ? 'payment_pending' : 'viewing_requested';

  return {
    booking: {
      id: `ORD-${Math.floor(Math.random() * 100000)}`,
      itemId: item.id,
      itemTitle: item.title,
      itemImage: item.imageUrl,
      domain: item.domain,
      customerName: args.customerName || "Guest User",
      customerContact: args.customerContact,
      specialRequests: args.specialRequests,
      needsPickup: args.needsPickup || false,
      totalPrice: item.price,
      status: initialStatus,
      date: new Date().toISOString(),
      
      // Map specifics based on flow
      checkIn: args.checkInDate,
      checkOut: args.checkOutDate,
      viewingTime: args.viewingSlot, // Only for long-term
      
      agentPhone: item.agentPhone,
      userDetails: undefined, 
      selectedUpsells: []
    },
    requiresPayment: isShortTerm // Only show Payment Card for short-term
  };
};

/**
 * Simulated WhatsApp side‑effect used by the UI to show that a
 * message was "sent" without actually calling Twilio.
 */
export const executeWhatsApp = async (args: any) => {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { status: 'sent', delivered: true, timestamp: new Date().toISOString() };
};

/**
 * Resolve static island knowledge articles for topics like
 * residency, utilities, emergency numbers etc.
 */
export const executeEncyclopedia = async (args: any) => {
  console.log("Consulting Encyclopedia for:", args.topic);
  const topicData = (ISLAND_KNOWLEDGE_BASE as any)[args.topic];
  if (topicData) {
    return topicData;
  }
  return { content: "Information not found in the local knowledge base." };
};

/**
 * Return mock realtime data such as weather or FX rates.
 * In production this is handled by backend integrations.
 */
export const executeRealTimeInfo = async (args: any) => {
  console.log("Fetching Real Time Info:", args.category);
  const data = (MOCK_REALTIME_DATA as any)[args.category];
  return data || { error: "Real-time data unavailable" };
};

/**
 * Simulate a taxi dispatch by assigning a mock driver and ETA,
 * then saving a Booking object to local storage.
 */
export const executeTaxiDispatch = async (args: any): Promise<{ booking: Booking }> => {
  // Simulate Dispatch Logic
  const drivers = [
    { name: "Mehmet Yilmaz", plate: "MH 123", car: "Mercedes V-Class (Black)" },
    { name: "Ali Can", plate: "KV 882", car: "Toyota Camry (White)" },
    { name: "Sarah Jones", plate: "UK 009", car: "Ford Tourneo Custom" }
  ];
  const selectedDriver = drivers[Math.floor(Math.random() * drivers.length)];
  const eta = `${Math.floor(Math.random() * 10) + 5} mins`;

  const taxiBooking: Booking = {
    id: `TAXI-${Math.floor(Math.random() * 10000)}`,
    itemId: 'taxi-service',
    itemTitle: `Taxi to ${args.destination || 'Current Location'}`,
    itemImage: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2670&auto=format&fit=crop',
    domain: 'Cars',
    customerName: args.customerName,
    customerContact: args.customerPhone,
    date: new Date().toISOString(),
    status: 'taxi_dispatched',
    totalPrice: 0, // Metered
    pickupCoordinates: { lat: args.latitude, lng: args.longitude },
    driverDetails: { ...selectedDriver, eta }
  };

  // Save immediately as taxis are instant dispatch
  await StorageService.saveBooking(taxiBooking);

  return {
    booking: taxiBooking
  };
};

/**
 * Create a local "consumer request" when no marketplace supply
 * matches the user's needs (e.g. special requests or future
 * flows). In production this would write to Firestore so
 * businesses can respond.
 */
export const executeCreateConsumerRequest = async (args: any) => {
  console.log("Creating Consumer Request:", args);
  const req = {
    id: `REQ-${Date.now()}`,
    userId: 'me',
    content: args.content,
    domain: args.domain,
    status: 'pending',
    timestamp: new Date().toISOString(),
    budget: args.budget
  };
  
  await StorageService.saveConsumerRequest(req as any);
  return { success: true, requestId: req.id, message: "Request forwarded to relevant businesses." };
};
