import { logger } from "@/utils/logger";
import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  MapPin,
  Navigation,
  Search,
  Zap,
  Music,
  Utensils,
  Coffee,
  Camera,
  Hand,
} from "lucide-react";
import { SocialUser } from "../../types";
import PassportCard from "./PassportCard";
import { FeedItem, Stay, PinType, CheckIn } from "../../types/connect";
import MapBottomSheet from "./MapBottomSheet";
import StayBookingModule from "./StayBookingModule";
import { BookingsService } from "../../services/bookingsService";
import { formatDate } from "../../utils/formatters";
import {
  checkIn,
  joinEvent,
  wave,
  subscribeToAllActiveCheckIns,
} from "../../services/connectService";

// Ensure tokens are available
const MAPBOX_TOKEN = (import.meta as any).env.VITE_MAPBOX_TOKEN;
const API_URL =
  (import.meta as any).env.VITE_API_URL ||
  "http://localhost:5001/easy-islanders/europe-west1/api/v1";

interface MapboxIslandMapProps {
  currentUser: SocialUser;
  places?: FeedItem[];
}

const MapboxIslandMap: React.FC<MapboxIslandMapProps> = ({
  currentUser,
  places: propPlaces,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(33.32); // Cyprus Center Longitude
  const [lat, setLat] = useState(35.33); // Cyprus Center Latitude
  const [zoom, setZoom] = useState(9);
  const [places, setPlaces] = useState<FeedItem[]>(propPlaces || []);
  const [users, setUsers] = useState<SocialUser[]>([]);
  const [filter, setFilter] = useState<
    "all" | "stay" | "activity" | "event" | "food" | "nightlife"
  >("all");
  const [selectedPlace, setSelectedPlace] = useState<FeedItem | null>(null);
  const [selectedUser, setSelectedUser] = useState<SocialUser | null>(null);
  const [bookingStay, setBookingStay] = useState<Stay | null>(null);
  const [checkInCounts, setCheckInCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [activeCheckIns, setActiveCheckIns] = useState<CheckIn[]>([]);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialize Map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    logger.debug("🗺️ [Mapbox] Initializing...");
    if (!MAPBOX_TOKEN) {
      console.error("Missing Mapbox Token");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11", // Premium Dark Mode
        center: [lng, lat],
        zoom: zoom,
        pitch: 45, // 3D effect
        bearing: -17.6,
        projection: "globe",
      });

      map.current.on("load", () => {
        logger.debug("🗺️ [Mapbox] Map LOADED successfully");
        map.current?.setFog({
          color: "rgb(186, 210, 235)", // Lower atmosphere
          "high-color": "rgb(36, 92, 223)", // Upper atmosphere
          "horizon-blend": 0.02, // Atmosphere thickness (default 0.2 at low zooms)
          "space-color": "rgb(11, 11, 25)", // Background color
          "star-intensity": 0.6, // Background star brightness (default 0.35 at low zoooms )
        } as any);
      });

      map.current.on("moveend", () => {
        if (!map.current) return;
        const center = map.current.getCenter();
        setLng(Math.round(center.lng * 1e4) / 1e4);
        setLat(Math.round(center.lat * 1e4) / 1e4);
        setZoom(Math.round(map.current.getZoom() * 1e2) / 1e2);

        // Refetch users on move
        fetchUsers();
      });
    } catch (err) {
      console.error("🔴 [Mapbox] Initialization Error:", err);
    }

    // Load initial data
    if (!propPlaces) {
      fetchPlaces();
    } else {
      setPlaces(propPlaces);
    }
    fetchUsers();

    // Subscribe to real-time check-ins
    const unsubscribeCheckIns = subscribeToAllActiveCheckIns((checkIns) => {
      setActiveCheckIns(checkIns);
      // Calculate counts per pin
      const counts = new Map<string, number>();
      checkIns.forEach((ci) => {
        counts.set(ci.pinId, (counts.get(ci.pinId) || 0) + 1);
      });
      setCheckInCounts(counts);
    });

    // Cleanup
    return () => {
      map.current?.remove();
      map.current = null;
      unsubscribeCheckIns();
    };
  }, []);

  // Fetch Places from Backend API
  const fetchPlaces = async () => {
    try {
      logger.debug("📍 [Map] Fetching places from backend API...");
      const res = await fetch(`${API_URL}/places?cityId=north-cyprus`);
      const data = await res.json();

      if (data.success && data.places) {
        logger.debug(
          `✅ [Map] Loaded ${data.places.length} places from database`,
        );
        setPlaces(data.places);
      } else {
        console.warn("⚠️ [Map] No places returned from API");
        setPlaces([]);
      }
    } catch (err) {
      console.error("🔴 [Map] Error fetching places:", err);
      setPlaces([]);
    }
  };

  // Fetch Users from Backend
  const fetchUsers = async () => {
    if (!map.current) return;
    try {
      const center = map.current.getCenter();
      const res = await fetch(
        `${API_URL}/users/nearby?lat=${center.lat}&lng=${center.lng}&radius=5000`,
        {
          headers: {
            // 'Authorization': `Bearer ${token}` // In real app
          },
        },
      );
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("🔴 [Connect] Error fetching users:", err);
    }
  };

  const handleWaveAtUser = async (targetUserId: string) => {
    try {
      await fetch(`${API_URL}/users/wave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      alert(`Waved at user! 👋`);
    } catch (err) {
      console.error("Failed to wave:", err);
    }
  };

  // Update Place Markers
  useEffect(() => {
    if (!map.current) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    logger.debug(
      "🗺️ [MapboxIslandMap] Rendering pins for",
      places.length,
      "places",
    );
    logger.debug("🗺️ [MapboxIslandMap] Sample place:", places[0]);

    places.forEach((place) => {
      if (!place.coordinates) {
        console.warn(
          "⚠️ [MapboxIslandMap] Place missing coordinates:",
          place.id,
          place.title,
        );
        return;
      }

      const el = document.createElement("div");
      el.className = "marker";

      // Icon Logic based on type/category
      let icon = "📍";
      let color = "bg-teal-500";

      if (place.type === "stay") {
        icon = "🏠";
        color = "bg-indigo-500";
      } else if (place.type === "activity") {
        icon = "🏄‍♂️";
        color = "bg-orange-500";
      } else if (place.type === "event") {
        icon = "📅";
        color = "bg-pink-500";
      } else if (place.category === "food") {
        icon = "🍔";
        color = "bg-red-500";
      } else if (place.category === "nightlife") {
        icon = "🍸";
        color = "bg-purple-500";
      }

      // Get check-in count for this pin
      const checkInCount = checkInCounts.get(place.id) || 0;
      const checkInsForPin = activeCheckIns.filter(
        (ci) => ci.pinId === place.id,
      );

      // Build avatar bubbles HTML (max 3)
      const avatarBubbles = checkInsForPin
        .slice(0, 3)
        .map(
          (ci, idx) =>
            `<img src="${ci.userAvatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + ci.userId}" 
                      class="w-5 h-5 rounded-full border-2 border-white object-cover" 
                      style="margin-left: ${idx > 0 ? "-6px" : "0"}" />`,
        )
        .join("");

      el.innerHTML = `
                <div class="relative flex flex-col items-center">
                    <div class="relative flex items-center justify-center w-8 h-8 ${color} rounded-full border-2 border-white shadow-lg cursor-pointer transform transition-transform hover:scale-110">
                        <span class="text-xs">${icon}</span>
                        ${
                          checkInCount > 0
                            ? `
                            <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border border-white rounded-full flex items-center justify-center">
                                <span class="text-[8px] font-bold text-white">${checkInCount > 9 ? "9+" : checkInCount}</span>
                            </div>
                        `
                            : ""
                        }
                    </div>
                    ${
                      checkInCount > 0
                        ? `
                        <div class="flex mt-1" style="margin-left: 6px;">
                            ${avatarBubbles}
                            ${checkInCount > 3 ? `<div class="w-5 h-5 rounded-full bg-slate-600 border-2 border-white flex items-center justify-center" style="margin-left: -6px"><span class="text-[8px] text-white font-bold">+${checkInCount - 3}</span></div>` : ""}
                        </div>
                    `
                        : ""
                    }
                </div>
            `;
      el.addEventListener("click", () => {
        setSelectedPlace(place);
        setSelectedUser(null);
        map.current?.flyTo({
          center: [place.coordinates.lng, place.coordinates.lat],
          zoom: 15,
        });
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([place.coordinates.lng, place.coordinates.lat])
        .addTo(map.current!);
      markersRef.current.push(marker);
    });
  }, [places, checkInCounts, activeCheckIns]);

  // Update User Markers
  useEffect(() => {
    if (!map.current) return;
    userMarkersRef.current.forEach((marker) => marker.remove());
    userMarkersRef.current = [];

    users.forEach((user) => {
      if (!user.coordinates) return;

      const el = document.createElement("div");
      el.className = "user-marker";
      el.innerHTML = `
                <div class="relative flex items-center justify-center w-10 h-10 bg-white rounded-full border-2 border-indigo-500 shadow-xl cursor-pointer transform transition-transform hover:scale-110">
                    <img src="${user.avatar}" class="w-full h-full rounded-full object-cover" />
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
            `;
      el.addEventListener("click", () => {
        setSelectedUser(user);
        setSelectedPlace(null);
        map.current?.flyTo({
          center: [user.coordinates!.lng, user.coordinates!.lat],
          zoom: 16,
        });
      });

      const marker = new mapboxgl.Marker(el)
        .setLngLat([user.coordinates.lng, user.coordinates.lat])
        .addTo(map.current!);
      userMarkersRef.current.push(marker);
    });
  }, [users]);

  // Filter places when prop changes or filter changes
  useEffect(() => {
    if (propPlaces) {
      if (filter === "all") {
        setPlaces(propPlaces);
      } else {
        setPlaces(
          propPlaces.filter(
            (p) => p.category?.toLowerCase() === filter || p.type === filter,
          ),
        );
      }
    } else {
      fetchPlaces();
    }
  }, [propPlaces, filter]);

  // Action Handlers
  const handleCheckIn = async (id: string) => {
    if (!currentUser) {
      alert("Please sign in to check in");
      return;
    }
    const place = places.find((p) => p.id === id);
    if (!place) return;

    try {
      await checkIn(
        currentUser.id,
        id,
        place.type as PinType,
        currentUser.name,
        currentUser.avatar,
      );
      alert(`✅ Checked in to ${place.title}!`);
    } catch (err) {
      console.error("Check-in failed:", err);
      alert("Check-in failed. Please try again.");
    }
  };

  const handleJoin = async (id: string) => {
    if (!currentUser) {
      alert("Please sign in to join");
      return;
    }
    const place = places.find((p) => p.id === id);
    if (!place) return;

    try {
      await joinEvent(currentUser.id, id, place.type as PinType);
      alert(`🎉 You've joined ${place.title}!`);
    } catch (err) {
      console.error("Join failed:", err);
      alert("Join failed. Please try again.");
    }
  };

  const handleWave = async (id: string) => {
    if (!currentUser) {
      alert("Please sign in to wave");
      return;
    }
    const place = places.find((p) => p.id === id);
    if (!place) return;

    try {
      await wave(currentUser.id, id, currentUser.name);
      alert(`👋 You waved at everyone at ${place.title}!`);
    } catch (err) {
      console.error("Wave failed:", err);
    }
  };

  const handleBook = (id: string) => {
    const stay = places.find((p) => p.id === id && p.type === "stay") as
      | Stay
      | undefined;
    if (stay) {
      setBookingStay(stay);
      setSelectedPlace(null); // Close bottom sheet
    } else {
      alert(`Booking ${id}...`);
    }
  };

  const handleNavigate = (id: string) => {
    const place = places.find((p) => p.id === id);
    if (!place?.coordinates) return;

    const { lat, lng } = place.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const handleTaxi = (id: string) => {
    const place = places.find((p) => p.id === id);
    if (!place?.coordinates) {
      alert("Location not available");
      return;
    }

    // Open chat with pre-filled taxi message
    const destination = place.title;
    const destinationAddress =
      (place as any).address ||
      `${place.coordinates.lat}, ${place.coordinates.lng}`;

    // Navigate to chat with taxi context
    window.location.href = `/chat?action=taxi&destination=${encodeURIComponent(destination)}&address=${encodeURIComponent(destinationAddress)}&lat=${place.coordinates.lat}&lng=${place.coordinates.lng}`;
  };

  const handleConfirmBooking = async (
    range: any,
    guests: number,
    total: number,
    guestDetails?: any,
  ) => {
    if (!bookingStay || !currentUser) return;

    try {
      await BookingsService.createBooking({
        userId: currentUser.id,
        stayId: bookingStay.id,
        startDate: range.from,
        endDate: range.to,
        guests,
        totalPrice: total,
        currency: bookingStay.currency || "GBP",
        guestDetails,
      });
      const fromLabel = formatDate(range?.from, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const toLabel = formatDate(range?.to, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      alert(
        `Booking Confirmed!\nStay: ${bookingStay.title}\nDates: ${fromLabel} - ${toLabel}\nGuests: ${guests}\nTotal: ${bookingStay.currency} ${total}`,
      );
      setBookingStay(null);
    } catch (error) {
      console.error("Booking failed", error);
      alert("Booking failed. Please try again.");
    }
  };

  return (
    <div className="relative w-full h-[75vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 group">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* UI Overlays */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-full border border-slate-700 shadow-xl overflow-x-auto max-w-[90vw] scrollbar-hide">
        {["all", "stay", "activity", "event", "food", "nightlife"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap ${filter === f ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Selected User Card */}
      {selectedUser && (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-80 z-30 animate-in slide-in-from-bottom-4 duration-300">
          <div className="relative">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute -top-2 -right-2 z-40 bg-white text-slate-700 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-slate-100"
            >
              ✕
            </button>
            <PassportCard user={selectedUser} />
            <button
              onClick={() => handleWaveAtUser(selectedUser.id)}
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Hand size={18} /> Wave at {selectedUser.name.split(" ")[0]}
            </button>
          </div>
        </div>
      )}

      {/* Selected Place Bottom Sheet */}
      {selectedPlace && (
        <MapBottomSheet
          item={selectedPlace}
          currentUser={currentUser}
          onClose={() => setSelectedPlace(null)}
          onCheckIn={handleCheckIn}
          onJoin={handleJoin}
          onBook={handleBook}
          onTaxi={handleTaxi}
          onWave={handleWave}
          onNavigate={handleNavigate}
        />
      )}

      {/* Stay Booking Module */}
      {bookingStay && (
        <StayBookingModule
          stay={bookingStay}
          onClose={() => setBookingStay(null)}
          onBook={handleConfirmBooking}
        />
      )}
    </div>
  );
};

export default MapboxIslandMap;
