import React, { useState, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import {
  Stay,
  Region,
  Activity as ConnectActivity,
  Event as ConnectEvent,
  Place as ConnectPlace,
  Experience as ConnectExperience,
} from '../../types/connect';
import StayBookingModule from '../connect/StayBookingModule';
import ActivityBookingModule from '../connect/ActivityBookingModule';
import EventBookingModule from '../connect/EventBookingModule';
import PlaceBookingModule from '../connect/PlaceBookingModule';
import ExperienceBookingModule from '../connect/ExperienceBookingModule';
import { BookingsService } from '../../services/domains/bookings/bookings.service';
import { UnifiedListingsService } from '../../services/unifiedListingsService';
import { UnifiedListing } from '../../types/UnifiedListing';
import { getVisibleRegions } from '../../services/discoverConfigService';
import { RegionConfig } from '../../types/adminConfig';

import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';

const regionLabel = (region: Region | string): string => {
  const regionLower = typeof region === 'string' ? region.toLowerCase() : region;
  switch (regionLower) {
    case 'kyrenia':
      return 'Kyrenia';
    case 'famagusta':
      return 'Famagusta';
    case 'nicosia':
      return 'Nicosia';
    case 'karpaz':
      return 'Karpaz';
    case 'lefke':
      return 'Lefke';
    case 'guzelyurt':
      return 'Guzelyurt';
    default:
      return typeof region === 'string' ? region : 'North Cyprus';
  }
};

// Category definitions matching admin dashboard
const PLACE_CATEGORIES = [
  { value: 'all', label: 'All', emoji: '🌍' },
  { value: 'restaurants', label: 'Restaurants', emoji: '🍽️' },
  { value: 'cafes', label: 'Cafes', emoji: '☕' },
  { value: 'bars', label: 'Bars', emoji: '🍺' },
  { value: 'nightlife', label: 'Nightlife', emoji: '🍸' },
  { value: 'spas_wellness', label: 'Spas & Wellness', emoji: '💆' },
  { value: 'gyms_fitness', label: 'Gyms & Fitness', emoji: '💪' },
  { value: 'beauty_salons', label: 'Beauty Salons', emoji: '💇' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'car_rentals', label: 'Car Rentals', emoji: '🚗' },
  { value: 'services', label: 'Services', emoji: '🛠️' },
  { value: 'pharmacies', label: 'Pharmacies', emoji: '💊' },
];

const ACTIVITY_CATEGORIES = [
  { value: 'all', label: 'All', emoji: '🌍' },
  { value: 'gyms_fitness', label: 'Gyms & Fitness', emoji: '💪' },
  { value: 'spas_wellness', label: 'Spas & Wellness', emoji: '💆' },
  { value: 'bowling_recreation', label: 'Bowling & Recreation', emoji: '🎳' },
  { value: 'water_activities', label: 'Water Activities', emoji: '🏄' },
  { value: 'adventure_sports', label: 'Adventure Sports', emoji: '🪂' },
  { value: 'motor_activities', label: 'Motor Activities', emoji: '🏎️' },
  { value: 'shooting_sports', label: 'Shooting Sports', emoji: '🎯' },
  { value: 'golf_tennis', label: 'Golf & Tennis', emoji: '⛳' },
  { value: 'horse_riding', label: 'Horse Riding', emoji: '🐴' },
  { value: 'yoga_meditation', label: 'Yoga & Meditation', emoji: '🧘' },
  { value: 'escape_rooms', label: 'Escape Rooms', emoji: '🔐' },
  { value: 'amusement_parks', label: 'Amusement Parks', emoji: '🎢' },
  { value: 'outdoor_activities', label: 'Outdoor Activities', emoji: '🏕️' },
  { value: 'beach_clubs', label: 'Beach Clubs', emoji: '🏖️' },
];

const STAY_CATEGORIES = [
  { value: 'all', label: 'All', emoji: '🌍' },
  { value: 'hotels_stays', label: 'Hotels', emoji: '🏨' },
  { value: 'villas', label: 'Villas', emoji: '🏡' },
  { value: 'apartments', label: 'Apartments', emoji: '🏢' },
  { value: 'guest_houses', label: 'Guest Houses', emoji: '🏠' },
  { value: 'boutique_hotels', label: 'Boutique Hotels', emoji: '✨' },
];

const Discover: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stays' | 'activities' | 'events' | 'places' | 'experiences'>('stays');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Data state
  const [stays, setStays] = useState<Stay[]>([]);
  const [activities, setActivities] = useState<ConnectActivity[]>([]);
  const [events, setEvents] = useState<ConnectEvent[]>([]);
  const [places, setPlaces] = useState<ConnectPlace[]>([]);
  const [experiences, setExperiences] = useState<ConnectExperience[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking modals state
  const [bookingStay, setBookingStay] = useState<Stay | null>(null);
  const [bookingActivity, setBookingActivity] = useState<ConnectActivity | null>(null);
  const [bookingEvent, setBookingEvent] = useState<ConnectEvent | null>(null);
  const [bookingPlace, setBookingPlace] = useState<ConnectPlace | null>(null);
  const [bookingExperience, setBookingExperience] = useState<ConnectExperience | null>(null);
  // Dynamic regions from config
  const [dynamicRegions, setDynamicRegions] = useState<RegionConfig[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Load dynamic regions from Firestore config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const visibleRegions = await getVisibleRegions();
        setDynamicRegions(visibleRegions);
      } catch (error) {
        console.error('Failed to load region config:', error);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Build regions array from dynamic config (fallback to minimal if config fails)
  const regions: { id: string; label: string }[] = [
    { id: 'all', label: 'All Regions' },
    ...dynamicRegions.map(r => ({ id: r.id, label: r.label }))
  ];

  // Fetch data on mount and when region changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const unifiedListings = await UnifiedListingsService.getApproved();

        const newStays: Stay[] = [];
        const newActivities: ConnectActivity[] = [];
        const newEvents: ConnectEvent[] = [];
        const newPlaces: ConnectPlace[] = [];
        const newExperiences: ConnectExperience[] = [];

        unifiedListings.forEach(ul => {
          // Filter by region if activeRegion is not 'all'
          if (activeRegion !== 'all' && ul.region?.toLowerCase() !== activeRegion) {
            return;
          }

          const commonFields = {
            id: ul.id,
            title: ul.title,
            description: ul.description,
            images: ul.images || [],
            region: (ul.region?.toLowerCase() || 'kyrenia') as Region,
            coordinates: { lat: ul.lat, lng: ul.lng },
            rating: ul.rating || 0,
            reviews: 0,
            createdAt: ul.createdAt instanceof Date ? ul.createdAt : new Date(), // Handle Timestamp if needed
            updatedAt: ul.updatedAt instanceof Date ? ul.updatedAt : new Date(),
            actions: ul.actions || { allowBooking: true },
            approved: true,
            currency: 'GBP', // Default
          };

          // Determine type and map to specific arrays
          if (ul.type === 'stay') {
            newStays.push({
              ...commonFields,
              type: 'stay',
              price: ul.pricePerNight || 0,
              currency: ul.currency || 'GBP',
              amenities: ul.amenities || [],
              hostId: 'admin', // Placeholder
              maxGuests: ul.bedrooms ? ul.bedrooms * 2 : 2,
              bedrooms: ul.bedrooms || 1,
              bathrooms: ul.bathrooms || 1,
            } as Stay);
          } else if (ul.type === 'event') {
            newEvents.push({
              ...commonFields,
              type: 'event',
              date: new Date().toISOString(), // Placeholder
              startTime: new Date(),
              endTime: new Date(),
              location: ul.address || ul.region,
              price: ul.priceLevel ? ul.priceLevel * 10 : 0, // Placeholder pricing logic
              organizerId: 'admin',
              attendees: [],
              isPublic: true,
            } as ConnectEvent);
          } else if (ul.type === 'experience') {
            newExperiences.push({
              ...commonFields,
              type: 'experience',
              price: ul.priceLevel ? ul.priceLevel * 20 : 0,
              duration: '2 hours', // Placeholder
              difficulty: 'Moderate',
              included: [],
              requirements: [],
            } as ConnectExperience);
          } else if (ul.type === 'activity') {
            newActivities.push({
              ...commonFields,
              type: 'activity',
              price: ul.priceLevel ? ul.priceLevel * 15 : 0,
              duration: '1 hour',
              category: ul.category || 'General',
            } as ConnectActivity);
          } else {
            // Default to Place
            // Further categorization for Places vs Activities based on category if needed
            if (['gyms_fitness', 'spas_wellness', 'bowling_recreation', 'water_activities'].includes(ul.category?.toLowerCase() || '')) {
              newActivities.push({
                ...commonFields,
                type: 'activity',
                price: ul.priceLevel ? ul.priceLevel * 15 : 0,
                duration: '1 hour',
                category: ul.category || 'General',
              } as ConnectActivity);
            } else {
              newPlaces.push({
                ...commonFields,
                type: 'place',
                category: ul.category || 'General',
                price: 0, // Places usually don't have a price to book directly in this context
              } as ConnectPlace);
            }
          }
        });

        setStays(newStays);
        setActivities(newActivities);
        setEvents(newEvents);
        setPlaces(newPlaces);
        setExperiences(newExperiences);

      } catch (error) {
        console.error('Error fetching discover data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeRegion]);

  // Reset category when tab changes
  useEffect(() => {
    setActiveCategory('all');
  }, [activeTab]);

  // Filter by region (client-side for places which don't filter by region in service)
  const filteredStays = activeCategory === 'all'
    ? stays
    : stays.filter(s => s.category === activeCategory);

  const filteredActivities = activeCategory === 'all'
    ? activities
    : activities.filter(a => a.category === activeCategory);

  const filteredEvents = events;

  const filteredPlaces = (() => {
    let filtered = activeRegion === 'all'
      ? places
      : places.filter(p => p.region === activeRegion);

    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }

    return filtered;
  })();

  const filteredExperiences = experiences;

  const handleConfirmBooking = async (range: DateRange, guests: number, total: number, guestDetails: any) => {
    if (!bookingStay) return;
    if (!user) {
      alert('Please sign in to complete your booking.');
      return;
    }

    if (!range.from || !range.to) {
      alert('Please select valid dates.');
      return;
    }

    try {
      await BookingsService.createBooking({
        userId: user.id,
        stayId: bookingStay.id,
        startDate: range.from,
        endDate: range.to,
        guests,
        totalPrice: total,
        currency: bookingStay.currency || 'GBP',
        guestDetails,
      });

      alert(
        `Booking request received!\n\nStay: ${bookingStay.title}\nDates: ${formatDate(range.from, { year: 'numeric', month: 'short', day: 'numeric' })} - ${formatDate(range.to, { year: 'numeric', month: 'short', day: 'numeric' })}\nGuests: ${guests}\nTotal: ${bookingStay.currency || 'GBP'
        } ${total}`,
      );
      setBookingStay(null);
    } catch (error) {
      console.error('Booking failed', error);
      alert('Booking failed. Please try again.');
    }
  };

  const handleConfirmActivityBooking = async (
    range: DateRange,
    guests: number,
    total: number,
    guestDetails: any,
  ) => {
    if (!bookingActivity) return;
    if (!user) {
      alert('Please sign in to complete your booking.');
      return;
    }
    if (!range.from) {
      alert('Please select a date.');
      return;
    }

    const from = range.from;
    const to = range.to || from;

    try {
      await BookingsService.createBooking({
        userId: user.id,
        catalogType: 'activity',
        itemTitle: bookingActivity.title,
        activityId: bookingActivity.id,
        startDate: from,
        endDate: to,
        guests,
        totalPrice: total,
        currency: bookingActivity.currency || 'GBP',
        guestDetails,
      });

      alert(
        `Booking request received!\n\nActivity: ${bookingActivity.title}\nDate: ${formatDate(from, { year: 'numeric', month: 'short', day: 'numeric' })}\nGuests: ${guests}\nTotal: ${bookingActivity.currency || 'GBP'
        } ${total}`,
      );
      setBookingActivity(null);
    } catch (error) {
      console.error('Activity booking failed', error);
      alert('Booking failed. Please try again.');
    }
  };

  const handleConfirmEventBooking = async (
    range: DateRange,
    tickets: number,
    total: number,
    guestDetails: any,
  ) => {
    if (!bookingEvent) return;
    if (!user) {
      alert('Please sign in to complete your booking.');
      return;
    }
    const from = range.from || new Date();
    const to = range.to || from;

    try {
      await BookingsService.createBooking({
        userId: user.id,
        catalogType: 'event',
        itemTitle: bookingEvent.title,
        eventId: bookingEvent.id,
        startDate: from,
        endDate: to,
        guests: tickets,
        totalPrice: total,
        currency: bookingEvent.currency || 'GBP',
        guestDetails,
      });

      alert(
        `Tickets reserved!\n\nEvent: ${bookingEvent.title}\nDate: ${formatDate(from, { year: 'numeric', month: 'short', day: 'numeric' })}\nTickets: ${tickets}\nTotal: ${bookingEvent.currency || 'GBP'
        } ${total}`,
      );
      setBookingEvent(null);
    } catch (error) {
      console.error('Event booking failed', error);
      alert('Booking failed. Please try again.');
    }
  };

  const handleConfirmPlaceBooking = async (
    range: DateRange,
    guests: number,
    total: number,
    guestDetails: any,
  ) => {
    if (!bookingPlace) return;
    if (!user) {
      alert('Please sign in to complete your booking.');
      return;
    }
    if (!range.from) {
      alert('Please select a date.');
      return;
    }
    const from = range.from;
    const to = range.to || from;

    try {
      await BookingsService.createBooking({
        userId: user.id,
        catalogType: 'place',
        itemTitle: bookingPlace.title,
        placeId: bookingPlace.id,
        startDate: from,
        endDate: to,
        guests,
        totalPrice: total,
        currency: bookingPlace.currency || 'GBP',
        guestDetails,
      });

      alert(
        `Trip request received!\n\nDestination: ${bookingPlace.title}\nDate: ${formatDate(from, { year: 'numeric', month: 'short', day: 'numeric' })}\nGuests: ${guests}\nTotal: ${bookingPlace.currency || 'GBP'
        } ${total}`,
      );
      setBookingPlace(null);
    } catch (error) {
      console.error('Place trip booking failed', error);
      alert('Booking failed. Please try again.');
    }
  };

  const handleConfirmExperienceBooking = async (
    range: DateRange,
    guests: number,
    total: number,
    guestDetails: any,
  ) => {
    if (!bookingExperience) return;
    if (!user) {
      alert('Please sign in to complete your booking.');
      return;
    }
    if (!range.from) {
      alert('Please select a date.');
      return;
    }
    const from = range.from;
    const to = range.to || from;

    try {
      await BookingsService.createBooking({
        userId: user.id,
        catalogType: 'experience',
        itemTitle: bookingExperience.title,
        experienceId: bookingExperience.id,
        startDate: from,
        endDate: to,
        guests,
        totalPrice: total,
        currency: bookingExperience.currency || 'GBP',
        guestDetails,
      });

      alert(
        `Booking request received!\n\nExperience: ${bookingExperience.title}\nDate: ${formatDate(from, { year: 'numeric', month: 'short', day: 'numeric' })}\nGuests: ${guests}\nTotal: ${bookingExperience.currency || 'GBP'
        } ${total}`,
      );
      setBookingExperience(null);
    } catch (error) {
      console.error('Experience booking failed', error);
      alert('Booking failed. Please try again.');
    }
  };

  const renderCard = (item: any, onClick: () => void, priceLabel: string) => (
    <div
      key={item.id}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer overflow-hidden"
    >
      <div className="h-40 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold">
        {item.images && item.images[0] ? (
          <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          'No Image'
        )}
      </div>
      <div className="p-4 space-y-1">
        <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{item.title}</h3>
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <MapPin size={12} /> {regionLabel(item.region)}
        </div>
        <div className="text-sm font-semibold text-slate-900">
          {priceLabel}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-4">
        <p className="text-xs font-bold uppercase text-teal-500 mb-1">Discover</p>
        <h1 className="text-3xl font-bold text-slate-900">Explore North Cyprus</h1>
        <p className="text-sm text-slate-500 mt-1">Curated stays, unforgettable experiences, and the best local spots.</p>

        <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide">
          {regions.map(region => (
            <button
              key={region.id}
              onClick={() => setActiveRegion(region.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeRegion === region.id
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {region.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-6 mb-6 overflow-x-auto scrollbar-hide">
          {(['stays', 'activities', 'events', 'places', 'experiences'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition ${activeTab === tab
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Category Filters - Show based on active tab */}
        {(activeTab === 'places' || activeTab === 'activities' || activeTab === 'stays') && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide">
            {(() => {
              let categories = PLACE_CATEGORIES;
              if (activeTab === 'activities') categories = ACTIVITY_CATEGORIES;
              if (activeTab === 'stays') categories = STAY_CATEGORIES;

              return categories.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeCategory === cat.value
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50'
                    }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ));
            })()}
          </div>
        )}

      </div>

      <main className="max-w-7xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-teal-600" />
            <p className="text-slate-500 mt-4">Loading content...</p>
          </div>
        ) : (
          <>
            {activeTab === 'stays' && (
              <>
                {filteredStays.length === 0 ? (
                  <div className="text-center text-slate-500 py-16">
                    <p className="text-lg font-semibold">No stays found</p>
                    <p className="text-sm mt-2">Check back later or explore other regions.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredStays.map(item =>
                      renderCard(
                        item,
                        () => {
                          setBookingStay(item);
                          setBookingActivity(null);
                          setBookingEvent(null);
                          setBookingPlace(null);
                          setBookingExperience(null);
                        },
                        item.price ? `${item.currency || 'GBP'} ${item.price}/${item.billingPeriod || 'night'}` : '—'
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'activities' && (
              <>
                {filteredActivities.length === 0 ? (
                  <div className="text-center text-slate-500 py-16">
                    <p className="text-lg font-semibold">No activities found</p>
                    <p className="text-sm mt-2">Check back later or explore other regions.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredActivities.map(item =>
                      renderCard(
                        item,
                        () => {
                          setBookingActivity(item);
                          setBookingStay(null);
                          setBookingEvent(null);
                          setBookingPlace(null);
                          setBookingExperience(null);
                        },
                        item.price ? `${item.currency || 'GBP'} ${item.price}` : 'Contact for price'
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'events' && (
              <>
                {filteredEvents.length === 0 ? (
                  <div className="text-center text-slate-500 py-16">
                    <p className="text-lg font-semibold">No events found</p>
                    <p className="text-sm mt-2">Check back later or explore other regions.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredEvents.map(item =>
                      renderCard(
                        item,
                        () => {
                          setBookingEvent(item);
                          setBookingStay(null);
                          setBookingActivity(null);
                          setBookingPlace(null);
                          setBookingExperience(null);
                        },
                        item.price ? `${item.currency || 'GBP'} ${item.price}` : 'Free entry'
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'places' && (
              <>
                {filteredPlaces.length === 0 ? (
                  <div className="text-center text-slate-500 py-16">
                    <p className="text-lg font-semibold">No places found</p>
                    <p className="text-sm mt-2">Check back later or explore other regions.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredPlaces.map(item =>
                      renderCard(
                        item,
                        () => {
                          setBookingPlace(item);
                          setBookingStay(null);
                          setBookingActivity(null);
                          setBookingEvent(null);
                          setBookingExperience(null);
                        },
                        'Plan a trip'
                      )
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === 'experiences' && (
              <>
                {filteredExperiences.length === 0 ? (
                  <div className="text-center text-slate-500 py-16">
                    <p className="text-lg font-semibold">No experiences found</p>
                    <p className="text-sm mt-2">Check back later or explore other regions.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredExperiences.map(item =>
                      renderCard(
                        item,
                        () => {
                          setBookingExperience(item);
                          setBookingStay(null);
                          setBookingActivity(null);
                          setBookingEvent(null);
                          setBookingPlace(null);
                        },
                        item.price ? `${item.currency || 'GBP'} ${item.price}` : 'Contact to book'
                      )
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {bookingStay && (
        <StayBookingModule stay={bookingStay} onClose={() => setBookingStay(null)} onBook={handleConfirmBooking} />
      )}

      {bookingActivity && (
        <ActivityBookingModule
          activity={bookingActivity}
          onClose={() => setBookingActivity(null)}
          onBook={handleConfirmActivityBooking}
        />
      )}

      {bookingEvent && (
        <EventBookingModule
          event={bookingEvent}
          onClose={() => setBookingEvent(null)}
          onBook={handleConfirmEventBooking}
        />
      )}

      {bookingPlace && (
        <PlaceBookingModule
          place={bookingPlace}
          onClose={() => setBookingPlace(null)}
          onBook={handleConfirmPlaceBooking}
        />
      )}

      {bookingExperience && (
        <ExperienceBookingModule
          experience={bookingExperience}
          onClose={() => setBookingExperience(null)}
          onBook={handleConfirmExperienceBooking}
        />
      )}
    </div>
  );
};

export default Discover;
