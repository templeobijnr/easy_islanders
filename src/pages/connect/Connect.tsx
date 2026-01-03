import { logger } from "@/utils/logger";
import React, { useState, useEffect, useRef } from "react";
import {
  MapIcon,
  List,
  ImageIcon,
  Send,
  MapPin,
  MoreHorizontal,
  ShieldCheck,
  MessageCircle,
  Star,
  X,
  Plus,
  Zap,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { SocialService } from "../../services/socialService";
import { SocialUser } from "../../types/social";
import { EventItem } from "../../types";
import IslandMap from "./IslandMap";
import { PlacesService } from "../../services/domains/places/places.service";
import { ActivitiesService } from "../../services/domains/activities/activities.service";
import { ListingsService } from "../../services/domains/stays/stays.service";
import { UnifiedListingsService } from "../../services/unifiedListingsService";
import PassportCard from "./PassportCard";
import PulseBar from "./PulseBar";
import StampsModal from "./StampsModal";
import {
  getLiveVenues,
  getQuickActivities,
  getMyCheckIns,
  checkIn,
  joinEvent,
  joinQuickActivity,
  getConnectFeed,
} from "../../services/connectService";
import FeedItemCard from "./FeedItemCard";
import ActivityDetailModal from "./ActivityDetailModal";
import EventDetailModal from "./EventDetailModal";
import {
  FeedItem,
  Region,
  LiveVenue,
  QuickActivity,
  CheckIn as CheckInType,
} from "../../types/connect";
import CreateEventModal from "./CreateEventModal";
import LiveVenueCard from "./LiveVenueCard";
import ActivityCard from "./ActivityCard";
import StartActivityModal from "./StartActivityModal";
import {
  mapActivityDocToActivity,
  mapPlaceDocToPlace,
  mapStayDocToStay,
} from "../../services/catalogMappers";

const INTERESTS = ["All", "Nightlife", "Nature", "Food", "Beach", "History"];

const REGIONS: { value: Region | "all"; label: string; icon: string }[] = [
  { value: "all", label: "All Regions", icon: "🌍" },
  { value: "kyrenia", label: "Kyrenia", icon: "⚓" },
  { value: "famagusta", label: "Famagusta", icon: "🏰" },
  { value: "nicosia", label: "Nicosia", icon: "🏙️" },
  { value: "karpaz", label: "Karpaz", icon: "🐢" },
  { value: "lefke", label: "Lefke", icon: "🌿" },
  { value: "guzelyurt", label: "Guzelyurt", icon: "🍊" },
];

const Connect: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] =
    useState<SocialUser | null>(null);
  const [viewMode, setViewMode] = useState<"feed" | "map">("feed");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [places, setPlaces] = useState<FeedItem[]>([]);
  const [placeCategory, setPlaceCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [showStamps, setShowStamps] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showStartActivity, setShowStartActivity] = useState(false);
  const [selectedFeedItem, setSelectedFeedItem] = useState<any | null>(null);

  // Connect Feed v1 State
  const [liveVenues, setLiveVenues] = useState<LiveVenue[]>([]);
  const [quickActivities, setQuickActivities] = useState<QuickActivity[]>([]);
  const [myRecentCheckIns, setMyRecentCheckIns] = useState<CheckInType[]>([]);
  const [myCheckedInIds, setMyCheckedInIds] = useState<Set<string>>(new Set());

  // Connect Feed V2 State (God's-Eye View)
  const [todayItems, setTodayItems] = useState<any[]>([]);
  const [weekItems, setWeekItems] = useState<any[]>([]);
  const [trendingItems, setTrendingItems] = useState<any[]>([]);
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<Region | "all">("all");

  // Load Map Data independently (doesn't require auth for public listings)
  const loadMapData = async () => {
    try {
      const unifiedListings = await UnifiedListingsService.getForMap();
      logger.debug("🗺️ Map: Loaded", unifiedListings.length, "listings");

      // Map unified listings to FeedItem format for map pins
      const unifiedPins: FeedItem[] = unifiedListings.map(
        (ul) =>
          ({
            id: ul.id,
            type: ul.type as any,
            title: ul.title,
            description: ul.description,
            coordinates: { lat: ul.lat, lng: ul.lng },
            category: ul.category,
            region: ul.region as Region,
            images: ul.images || [],
            actions: ul.actions,
            price: ul.priceLevel ? ul.priceLevel * 25 : undefined,
            currency: "USD",
            phone: ul.phone,
            website: ul.website,
            bookingEnabled: ul.bookingEnabled,
            createdAt: ul.createdAt,
            updatedAt: ul.updatedAt,
          }) as any,
      );

      setPlaces(unifiedPins);
    } catch (err) {
      console.error("Failed to load map data:", err);
    }
  };

  // Connect Feed V2 Loader (God's-Eye View)
  const loadFeedV1 = async () => {
    try {
      logger.debug("🔥 Loading Connect Feed V2 (God's-Eye View)...");

      // Use the new getConnectFeed engine
      const regionFilter =
        selectedRegion === "all" ? undefined : selectedRegion;
      const feedData = await getConnectFeed(regionFilter);

      // Safely set state with null checks
      setLiveVenues(feedData?.liveNow || []);
      setTodayItems(feedData?.todayItems || []);
      setWeekItems(feedData?.weekItems || []);
      setTrendingItems(feedData?.trendingItems || []);
      setFeaturedItems(feedData?.featuredItems || []);

      // If user is logged in, get their check-ins
      let userCheckIns: CheckInType[] = [];
      if (user?.uid) {
        userCheckIns = await getMyCheckIns(user.uid, 5);
        // Track which venues user is checked into
        const checkedIds = new Set(userCheckIns.map((c) => c.pinId));
        setMyCheckedInIds(checkedIds);
      }
      setMyRecentCheckIns(userCheckIns);

      // Also fetch quick activities for backward compatibility
      const activities = await getQuickActivities(regionFilter);
      setQuickActivities(activities);

      logger.debug(
        `🔥 Feed V2: ${feedData?.liveNow?.length || 0} live, ${feedData?.todayItems?.length || 0} today, ${feedData?.weekItems?.length || 0} week`,
      );
    } catch (err) {
      console.error("Failed to load Feed v1:", err);
    }
  };

  // Simplified loader - only map data, everything else from Connect Feed
  const loadData = async () => {
    try {
      // Ensure user profile exists (needed for check-ins and displaying user info)
      if (user) {
        const profile = await SocialService.ensureUserProfile(user);
        setCurrentUserProfile(profile);
      }

      // Only load places for map - events come from Connect Feed V2
      const [catalogPlaces, unifiedListings] = await Promise.all([
        PlacesService.getPlaces(),
        UnifiedListingsService.getForMap(),
      ]);

      logger.debug(
        "🗺️ [Connect] Unified listings for map:",
        unifiedListings.length,
      );
      logger.debug("🗺️ [Connect] Catalog places:", catalogPlaces.length);

      const placePins: FeedItem[] = catalogPlaces
        .filter((p) => p.coordinates)
        .map((p) => mapPlaceDocToPlace(p as any));

      const unifiedPins: FeedItem[] = unifiedListings.map(
        (ul) =>
          ({
            id: ul.id,
            type: ul.type,
            title: ul.title,
            description: ul.description,
            coordinates: { lat: ul.lat, lng: ul.lng },
            category: ul.category,
            region: ul.region,
            images: ul.images || [],
            actions: ["book", "navigate", "call", "whatsapp"].filter(
              (a) => ul.actions[a as keyof typeof ul.actions],
            ),
            price: ul.priceLevel ? ul.priceLevel * 25 : undefined,
            currency: "USD",
            phone: ul.phone,
            website: ul.website,
            bookingEnabled: ul.bookingEnabled,
          }) as any,
      );

      setPlaces([...placePins, ...unifiedPins]);
    } catch (err) {
      console.error("Failed to load map data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMapData(); // Load map pins independently (doesn't require auth)
    loadFeedV1(); // Load Connect Feed v1 data
    loadData(); // Load social data (may fail without auth)
  }, [user]);

  // Reload feed v1 when region changes
  useEffect(() => {
    loadFeedV1();
    // Re-fetch with region filter
  }, [selectedRegion]);

  // Filter places by region
  const filteredPlaces =
    selectedRegion === "all"
      ? places
      : places.filter((p) => (p as any).region === selectedRegion);

  // HANDLER: Get Tickets for Events
  const handleGetTickets = (event: EventItem) => {
    logger.debug("Get tickets for:", event);
  };

  // === Connect Feed v1 Handlers ===

  const handleFeedCheckIn = async (listingId: string) => {
    if (!user) {
      alert("Please sign in to check in");
      return;
    }

    try {
      await checkIn(
        user.id,
        listingId,
        "place",
        user.name || "Anonymous",
        user.avatar,
      );

      // Update local state
      setMyCheckedInIds((prev) => new Set([, listingId]));
      // Reload feed to show updated counts
      loadFeedV1();
    } catch (err) {
      console.error("Check-in failed:", err);
      alert("Check-in failed. Please try again.");
    }
  };

  const handleJoinActivity = async (activityId: string) => {
    if (!user) {
      alert("Please sign in to join");
      return;
    }

    try {
      await joinQuickActivity(
        user.id,
        activityId,
        user.name || "Anonymous",
        user.avatar,
      );

      // Reload feed
      loadFeedV1();
      alert("You joined the activity! 🎉");
    } catch (err) {
      console.error("Join failed:", err);
      alert("Failed to join. Please try again.");
    }
  };

  const handleViewOnMap = (
    itemId: string,
    coordinates?: { lat: number; lng: number },
  ) => {
    if (coordinates) {
      setViewMode("map");
      // TODO: Focus map on coordinates
    }
  };

  logger.debug("Connect Feed Data:", {
    todayItems: todayItems.length,
    weekItems: weekItems.length,
    featuredItems: featuredItems.length,
    trendingItems: trendingItems.length,
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        {/* HEADER HERO */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              {t("connect_title")}
            </h1>
            <p className="text-slate-500 text-lg max-w-2xl">
              {t("connect_subtitle")}
            </p>
          </div>

          {/* VIEW TOGGLE */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowStartActivity(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm"
            >
              <Zap size={16} /> Start Activity / Event
            </button>
            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex">
              <button
                onClick={() => setViewMode("feed")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "feed" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <List size={16} /> Feed
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === "map" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
              >
                <MapIcon size={16} /> Map
              </button>
            </div>
          </div>
        </div>

        {/* Region Selector */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {REGIONS.map((region) => (
            <button
              key={region.value}
              onClick={() => setSelectedRegion(region.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                selectedRegion === region.value
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              <span>{region.icon}</span> {region.label}
            </button>
          ))}
        </div>

        {viewMode === "map" ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 relative">
            <IslandMap
              currentUser={
                currentUserProfile || {
                  id: "guest",
                  name: "Guest",
                  avatar:
                    "https://api.dicebear.com/7.x/avataaars/svg?seed=guest",
                  rank: "Explorer",
                  vouches: 0,
                  trustScore: 0,
                  interests: [],
                  passportStamps: [],
                }
              }
              places={filteredPlaces}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in">
            {/* LEFT COLUMN: PASSPORT (Sticky) */}
            <div className="hidden lg:block lg:col-span-1">
              {currentUserProfile && (
                <PassportCard
                  user={currentUserProfile}
                  onViewStamps={() => setShowStamps(true)}
                />
              )}
            </div>

            {/* CENTER COLUMN: FEED & VIBE MAP */}
            <div className="lg:col-span-3 space-y-8">
              {/* Region Filter - More Prominent */}
              <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sticky top-20 z-30 bg-slate-50/95 backdrop-blur py-2">
                {REGIONS.map((region) => (
                  <button
                    key={region.value}
                    onClick={() => setSelectedRegion(region.value)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm ${
                      selectedRegion === region.value
                        ? "bg-slate-900 text-white shadow-md scale-105"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-base">{region.icon}</span>
                    <span>{region.label}</span>
                  </button>
                ))}
              </div>

              {/* === SECTIONS === */}
              <div className="space-y-8">
                {/* 1. LIVE NOW (Keep as feature card) */}

                {/* My Tribes - DISABLED FOR FEED V2 */}
                {/* {myTribes.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                           <h3 className="font-bold text-slate-900 text-sm mb-3">My Tribes</h3>
                           <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                              <button
                                 onClick={() => handleSelectTribe(null)}
                                 className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${!activeTribe
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                              >
                                 All Tribes
                              </button>
                              {myTribes.map(tribe => (
                                 <button
                                    key={tribe.id}
                                    onClick={() => handleSelectTribe(tribe)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTribe?.id === tribe.id
                                       ? 'bg-slate-900 text-white shadow-md'
                                       : 'bg-slate-50 border border-slate-200 text-slate-600 hover:border-slate-300'
                                       }`}
                                 >
                                    <img src={tribe.image} className="w-5 h-5 rounded-full object-cover" alt={tribe.name} />
                                    #{tribe.interest}
                                 </button>
                              ))}
                           </div>
                        </div>
                     )} */}

                {/* Interest Filters - DISABLED FOR FEED V2 */}
                {/* {!activeTribe && (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                           {INTERESTS.map(interest => (
                              <button
                                 key={interest}
                                 onClick={() => setActiveInterest(interest)}
                                 className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeInterest === interest
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                                    }`}
                              >
                                 {interest === 'All' ? 'For You' : `#${interest}`}
                              </button>
                           ))}
                        </div>
                     )} */}

                {/* Post Creator - DISABLED FOR FEED V2 (Use "Start Activity" instead) */}
                {/* {currentUserProfile && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative z-10">
                           ... Post Creator UI removed for Feed v2 ...
                        </div>
                     )} */}

                {/* === CONNECT FEED V1 === */}

                {/* Live Venues - "Where the action is" */}
                {liveVenues.length > 0 && (
                  <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                    {/* Decorative background glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -ml-32 -mb-32"></div>

                    <h3 className="relative font-bold text-white text-2xl mb-6 flex items-center gap-3">
                      <span className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
                      </span>
                      Live Now
                    </h3>
                    <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {liveVenues.map((venue) => (
                        <LiveVenueCard
                          key={venue.listingId}
                          venue={venue}
                          onCheckIn={handleFeedCheckIn}
                          onViewOnMap={handleViewOnMap}
                          isCheckedIn={myCheckedInIds.has(venue.listingId)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Activities */}
                {quickActivities.length > 0 && (
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-3">
                      Today's Activities
                    </h3>
                    <div className="space-y-3">
                      {quickActivities.map((activity) => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          onJoin={handleJoinActivity}
                          onViewOnMap={handleViewOnMap}
                          currentUserId={user?.uid}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. HAPPENING TODAY (Horizontal Scroll) */}
                {todayItems.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg">
                        📅
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xl font-display">
                          Happening Today
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">
                          Don't miss out on these events
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                      {todayItems.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-[280px] md:min-w-[320px] snap-start"
                        >
                          <FeedItemCard
                            item={item}
                            onJoin={() => setSelectedFeedItem(item)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. THIS WEEK (Horizontal Scroll) */}
                {weekItems.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                        🗓️
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xl font-display">
                          This Week
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">
                          Plan your week ahead
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                      {weekItems.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-[280px] md:min-w-[320px] snap-start"
                        >
                          <FeedItemCard
                            item={item}
                            onJoin={() => setSelectedFeedItem(item)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. FEATURED (Horizontal Scroll) */}
                {featuredItems.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center font-bold text-lg">
                        💎
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xl font-display">
                          Featured
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">
                          Curated hotspots and hidden gems
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                      {featuredItems.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-[280px] md:min-w-[320px] snap-start"
                        >
                          <FeedItemCard
                            item={item}
                            onJoin={() => setSelectedFeedItem(item)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. TRENDING NOW (Horizontal Scroll) */}
                {trendingItems.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center font-bold text-lg">
                        🔥
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-xl font-display">
                          Trending Now
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">
                          What everyone is talking about
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                      {trendingItems.map((item) => (
                        <div
                          key={item.id}
                          className="min-w-[280px] md:min-w-[320px] snap-start"
                        >
                          <FeedItemCard
                            item={item}
                            onJoin={() => setSelectedFeedItem(item)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Empty State */}
              {liveVenues.length === 0 &&
                quickActivities.length === 0 &&
                todayItems.length === 0 &&
                weekItems.length === 0 &&
                trendingItems.length === 0 &&
                featuredItems.length === 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-12">
                    <div className="text-6xl mb-6">🏝️</div>
                    <h3 className="font-bold text-slate-900 text-2xl mb-2">
                      The island is quiet...
                    </h3>
                    <p className="text-slate-500 mb-8">
                      No one has checked in or started an activity yet. Why not
                      start the wave?
                    </p>
                    <button
                      onClick={() => setShowStartActivity(true)}
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                    >
                      <Zap size={18} /> Be the first!
                    </button>
                  </div>
                )}

              {/* Legacy Feed (hidden for v1 but keeping code) */}
            </div>

            {/* RIGHT COLUMN: Tribes + RADAR (Sticky) - REMOVED FOR V2 */}
            {/* ... hidden ... */}
          </div>
        )}

        {/* MODALS */}
        {selectedFeedItem && (
          <EventDetailModal
            item={selectedFeedItem}
            onClose={() => setSelectedFeedItem(null)}
            onCheckIn={handleFeedCheckIn}
          />
        )}

        {showStamps && currentUserProfile && (
          <StampsModal
            user={currentUserProfile}
            onClose={() => setShowStamps(false)}
          />
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <CreateEventModal
          onClose={() => setShowCreateEvent(false)}
          onSuccess={(eventId) => {
            logger.debug("Event created:", eventId);
            loadData(); // Refresh feed
          }}
        />
      )}

      {/* Start Activity Modal (v1) */}
      {showStartActivity && (
        <StartActivityModal
          isOpen={showStartActivity}
          onClose={() => setShowStartActivity(false)}
          userId={user?.uid || ""}
          userDisplayName={
            currentUserProfile?.name || user?.displayName || "Anonymous"
          }
          userAvatarUrl={
            currentUserProfile?.avatar ||
            user?.photoURL ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid}`
          }
          onActivityCreated={(activityId) => {
            logger.debug("Activity created:", activityId);
            loadFeedV1();
          }}
        />
      )}
    </div>
  );
};

export default Connect;
