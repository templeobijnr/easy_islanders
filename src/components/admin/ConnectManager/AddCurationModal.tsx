import React, { useEffect, useRef } from "react";
import {
  Search,
  X,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Image as ImageIcon,
  Ticket,
  CreditCard,
  CalendarDays,
  CheckCircle,
  Globe,
  Layout,
  Type,
  Upload,
  Trash2,
  Navigation,
  Link,
  Share2,
  Music,
  Utensils,
  PartyPopper,
  Dumbbell,
  Briefcase,
  Heart,
  Users,
  Loader2,
  UserPlus,
} from "lucide-react";
import {
  collection,
  addDoc,
  Timestamp,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";
import { UnifiedListingsService } from "../../../services/unifiedListingsService";
import {
  uploadImage,
  validateImageFile,
  UploadProgress,
} from "../../../services/imageUploadService";
import { useCurationForm } from "./hooks/useCurationForm";
import type { GeocodingResult, Venue } from "./curationTypes";

interface AddCurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string;
  onSuccess: () => void;
}

const SECTIONS = [
  { id: "trending", label: "Trending Now" },
  { id: "today", label: "Happening Today" },
  { id: "week", label: "This Week" },
  { id: "featured", label: "Featured" },
];

const EVENT_CATEGORIES = [
  { id: "party", label: "Party / Nightlife", icon: PartyPopper },
  { id: "music", label: "Music / Concert", icon: Music },
  { id: "food", label: "Food & Dining", icon: Utensils },
  { id: "fitness", label: "Fitness / Sports", icon: Dumbbell },
  { id: "business", label: "Business / Networking", icon: Briefcase },
  { id: "community", label: "Community / Social", icon: Users },
  { id: "wellness", label: "Wellness / Health", icon: Heart },
  { id: "other", label: "Other", icon: Calendar },
];

const ACTIONS_CONFIG = [
  {
    id: "going",
    label: "I'm Going",
    icon: Users,
    color: "green",
    description: "Users can mark themselves as going",
  },
  {
    id: "interested",
    label: "Interested",
    icon: Heart,
    color: "pink",
    description: "Users can show interest",
  },
  {
    id: "invite",
    label: "Invite Friends",
    icon: UserPlus,
    color: "purple",
    description: "Users can invite friends",
  },
  { id: "book", label: "Waitlist/Book", icon: CreditCard, color: "emerald" },
  { id: "tickets", label: "Tickets", icon: Ticket, color: "amber" },
  { id: "reserve", label: "Reservations", icon: CalendarDays, color: "blue" },
  { id: "rsvp", label: "RSVP", icon: CheckCircle, color: "indigo" },
  { id: "share", label: "Share Event", icon: Share2, color: "cyan" },
  { id: "link", label: "External Link", icon: Link, color: "slate" },
];

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const AddCurationModal: React.FC<AddCurationModalProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSuccess,
}) => {
  const {
    state,
    setMode,
    setIsLoading,
    setLocationMode,
    setSearchQuery,
    setVenues,
    setFilteredVenues,
    setSelectedVenue,
    setGeoSearchQuery,
    setGeoResults,
    setSelectedLocation,
    setIsGeoSearching,
    setManualAddress,
    setManualLat,
    setManualLng,
    setEventTitle,
    setEventDesc,
    setEventCategory,
    setStartDate,
    setStartTime,
    setEndDate,
    setEndTime,
    setRegion,
    setUploadedImages,
    setUploadingImages,
    setEnabledActions,
    setActionUrls,
    setSelectedSections,
    resetSelectedSections,
  } = useCurationForm(activeSection);

  const {
    mode,
    isLoading,
    locationMode,
    searchQuery,
    venues,
    filteredVenues,
    selectedVenue,
    geoSearchQuery,
    geoResults,
    selectedLocation,
    isGeoSearching,
    manualAddress,
    manualLat,
    manualLng,
    eventTitle,
    eventDesc,
    eventCategory,
    startDate,
    startTime,
    endDate,
    endTime,
    region,
    uploadedImages,
    uploadingImages,
    enabledActions,
    actionUrls,
    selectedSections,
  } = state;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOCATION MODE ---
  // (managed by useCurationForm)

  // --- VENUE SEARCH STATE ---
  // (managed by useCurationForm)

  // --- GEOCODING STATE ---
  // (managed by useCurationForm)

  // --- MANUAL LOCATION ---
  // (managed by useCurationForm)

  // --- EVENT FORM STATE ---
  // (managed by useCurationForm)

  // --- IMAGE UPLOAD STATE ---
  // (managed by useCurationForm)

  // --- ACTIONS STATE ---
  // (managed by useCurationForm)

  // --- DISTRIBUTION STATE ---
  // (managed by useCurationForm)

  // Load venues on mount
  useEffect(() => {
    if (isOpen) {
      loadVenues();
      resetSelectedSections();
    }
  }, [isOpen, activeSection]);

  // Venue search filtering
  useEffect(() => {
    if (searchQuery && locationMode === "venue") {
      setFilteredVenues(
        venues
          .filter(
            (v) =>
              v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              v.category.toLowerCase().includes(searchQuery.toLowerCase()),
          )
          .slice(0, 10),
      );
    } else {
      setFilteredVenues([]);
    }
  }, [searchQuery, venues, locationMode]);

  // Geocoding search with debounce
  useEffect(() => {
    if (geoSearchQuery.length < 3 || locationMode !== "search") {
      setGeoResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsGeoSearching(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geoSearchQuery)}.json?access_token=${MAPBOX_TOKEN}&types=poi,address,place&limit=8`,
        );
        const data = await response.json();
        setGeoResults(data.features || []);
      } catch (err) {
        console.error("Geocoding failed:", err);
      } finally {
        setIsGeoSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [geoSearchQuery, locationMode]);

  const loadVenues = async () => {
    try {
      const listings = await UnifiedListingsService.getForMap();
      setVenues(
        listings.map((l) => ({
          id: l.id,
          title: l.title,
          category: l.category,
          region: l.region,
          images: l.images || [],
          type: l.type,
          lat: l.lat,
          lng: l.lng,
        })),
      );
    } catch (err) {
      console.error("Failed to load venues:", err);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setManualLat(latitude.toString());
        setManualLng(longitude.toString());

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`,
          );
          const data = await response.json();
          if (data.features?.[0]) {
            setManualAddress(data.features[0].place_name);
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to get current location");
      },
    );
  };

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const toggleAction = (actionId: string) => {
    setEnabledActions((prev) => ({
      ...prev,
      [actionId]: !prev[actionId],
    }));
  };

  const handleImageUpload = async (files: FileList) => {
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        alert(validation.error);
      }
    }

    if (validFiles.length === 0) return;

    // Add to uploading queue
    const newUploading = validFiles.map((file) => ({ file, progress: 0 }));
    setUploadingImages((prev) => [...prev, ...newUploading]);

    // Upload each file
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const url = await uploadImage(file, "events", (progress) => {
          setUploadingImages((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, progress: progress.progress } : u,
            ),
          );
        });

        setUploadedImages((prev) => [...prev, url]);
        setUploadingImages((prev) => prev.filter((u) => u.file !== file));
      } catch (err) {
        console.error("Upload failed:", err);
        setUploadingImages((prev) => prev.filter((u) => u.file !== file));
      }
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const getLocationData = () => {
    if (locationMode === "venue" && selectedVenue) {
      return {
        locationName: selectedVenue.title,
        locationAddress: selectedVenue.region,
        lat: selectedVenue.lat || 0,
        lng: selectedVenue.lng || 0,
        venueId: selectedVenue.id,
        venueName: selectedVenue.title,
        venueImage: selectedVenue.images?.[0],
      };
    } else if (locationMode === "search" && selectedLocation) {
      return {
        locationName: selectedLocation.text,
        locationAddress: selectedLocation.place_name,
        lat: selectedLocation.center[1],
        lng: selectedLocation.center[0],
        venueId: null,
        venueName: selectedLocation.text,
        venueImage: null,
      };
    } else if (locationMode === "manual" && manualAddress) {
      return {
        locationName: manualAddress.split(",")[0],
        locationAddress: manualAddress,
        lat: parseFloat(manualLat) || 0,
        lng: parseFloat(manualLng) || 0,
        venueId: null,
        venueName: manualAddress.split(",")[0],
        venueImage: null,
      };
    }
    return null;
  };

  const canSave = () => {
    if (mode === "quick") {
      return selectedVenue !== null;
    }

    // Create mode - need title and some form of location
    const hasLocation =
      (locationMode === "venue" && selectedVenue) ||
      (locationMode === "search" && selectedLocation) ||
      (locationMode === "manual" && manualAddress);

    return eventTitle.trim() && hasLocation;
  };

  const handleSave = async () => {
    if (!canSave()) return;

    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const locationData = getLocationData();

      let targetItemId: string;
      let targetItemType: string;
      let targetItemTitle: string;
      let targetItemImage: string;

      if (mode === "quick" && selectedVenue) {
        targetItemId = selectedVenue.id;
        targetItemType = selectedVenue.type;
        targetItemTitle = selectedVenue.title;
        targetItemImage = selectedVenue.images?.[0] || "";
      } else {
        // Create Event mode
        const eventRef = doc(collection(db, "events"));
        targetItemId = eventRef.id;
        targetItemType = "event";
        targetItemTitle = eventTitle;
        targetItemImage = uploadedImages[0] || locationData?.venueImage || "";

        const startDateTime = startDate
          ? Timestamp.fromDate(new Date(`${startDate}T${startTime || "00:00"}`))
          : Timestamp.now();
        const endDateTime = endDate
          ? Timestamp.fromDate(new Date(`${endDate}T${endTime || "23:59"}`))
          : null;

        batch.set(eventRef, {
          id: eventRef.id,
          type: "event",
          title: eventTitle,
          description: eventDesc,
          category: eventCategory,
          hostVenueId: locationData?.venueId || null,
          hostVenueName: locationData?.venueName || null,
          locationName: locationData?.locationName,
          locationAddress: locationData?.locationAddress,
          region: region,
          images: uploadedImages,
          startTime: startDateTime,
          endTime: endDateTime,
          isPublic: true,
          approved: true,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          actions: {
            ...Object.fromEntries(
              Object.entries(enabledActions).map(([k, v]) => [
                `allow${k.charAt(0).toUpperCase() + k.slice(1)}`,
                v,
              ]),
            ),
            urls: actionUrls,
            allowCheckIn: true,
          },
          coordinates: {
            lat: locationData?.lat || 0,
            lng: locationData?.lng || 0,
          },
        });
      }

      // Add to Selected Feed Sections
      const now = Timestamp.now();

      selectedSections.forEach((section) => {
        const curationRef = doc(collection(db, "connectCuration"));

        let expiresAt = null;
        if (section === "today") {
          const midnight = new Date();
          midnight.setHours(23, 59, 59);
          expiresAt = Timestamp.fromDate(midnight);
        }

        batch.set(curationRef, {
          section,
          itemId: targetItemId,
          itemType: targetItemType,
          itemTitle: targetItemTitle,
          itemImage: targetItemImage,
          eventTitle: mode === "create" ? eventTitle : null,
          eventCategory: mode === "create" ? eventCategory : null,
          eventDate:
            mode === "create" && startDate
              ? Timestamp.fromDate(
                  new Date(`${startDate}T${startTime || "00:00"}`),
                )
              : null,
          locationName: locationData?.locationName,
          region: region,
          order: 0,
          isActive: true,
          createdAt: now,
          expiresAt: expiresAt,
          actions: {
            ...enabledActions,
            urls: actionUrls,
            checkIn: true,
          },
        });
      });

      await batch.commit();
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save:", err);
      alert("Failed to save. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Plus className="text-cyan-400" /> Add to Feed
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR TABS */}
          <div className="w-48 border-r border-white/5 p-4 space-y-2 bg-slate-950/30">
            <button
              onClick={() => setMode("quick")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                mode === "quick"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              <div className="font-bold text-sm">Quick Link</div>
              <div className="text-xs opacity-70">Existing Venue</div>
            </button>
            <button
              onClick={() => setMode("create")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                mode === "create"
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              <div className="font-bold text-sm">Create Event</div>
              <div className="text-xs opacity-70">Robust Builder</div>
            </button>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* LOCATION SECTION */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {mode === "create" ? "Event Location" : "Select Venue"}
                <span className="text-red-400 ml-1">*</span>
              </label>

              {/* Location Mode Tabs (only in create mode) */}
              {mode === "create" && (
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setLocationMode("venue")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      locationMode === "venue"
                        ? "bg-purple-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Our Venues
                  </button>
                  <button
                    onClick={() => setLocationMode("search")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      locationMode === "search"
                        ? "bg-purple-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Search Places
                  </button>
                  <button
                    onClick={() => setLocationMode("manual")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      locationMode === "manual"
                        ? "bg-purple-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Manual Entry
                  </button>
                </div>
              )}

              {/* Venue Search */}
              {(locationMode === "venue" || mode === "quick") &&
                !selectedVenue && (
                  <div className="relative z-10">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search our venues..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                    {filteredVenues.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-slate-800 rounded-xl border border-white/10 shadow-2xl z-20">
                        {filteredVenues.map((venue) => (
                          <button
                            key={venue.id}
                            onClick={() => {
                              setSelectedVenue(venue);
                              setSearchQuery("");
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 text-left transition-colors"
                          >
                            {venue.images?.[0] ? (
                              <img
                                src={venue.images[0]}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-slate-600 rounded-lg" />
                            )}
                            <div>
                              <div className="text-white font-medium">
                                {venue.title}
                              </div>
                              <div className="text-slate-500 text-xs">
                                {venue.category} • {venue.region}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Google/Mapbox Search */}
              {locationMode === "search" &&
                mode === "create" &&
                !selectedLocation && (
                  <div className="relative z-10">
                    <Globe
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={geoSearchQuery}
                      onChange={(e) => setGeoSearchQuery(e.target.value)}
                      placeholder="Search any place worldwide..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {isGeoSearching && (
                      <Loader2
                        size={18}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 animate-spin"
                      />
                    )}
                    {geoResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-slate-800 rounded-xl border border-white/10 shadow-2xl z-20">
                        {geoResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setSelectedLocation(result);
                              setGeoSearchQuery("");
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 text-left transition-colors"
                          >
                            <MapPin
                              size={18}
                              className="text-purple-400 flex-shrink-0"
                            />
                            <div>
                              <div className="text-white font-medium">
                                {result.text}
                              </div>
                              <div className="text-slate-500 text-xs truncate">
                                {result.place_name}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Manual Entry */}
              {locationMode === "manual" && mode === "create" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Type address or location name..."
                      className="flex-1 px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder-slate-500"
                    />
                    <button
                      onClick={handleGetCurrentLocation}
                      className="px-4 py-3 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors"
                      title="Use current location"
                    >
                      <Navigation size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder="Latitude (optional)"
                      className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500"
                    />
                    <input
                      type="text"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      placeholder="Longitude (optional)"
                      className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500"
                    />
                  </div>
                </div>
              )}

              {/* Selected Venue Display */}
              {selectedVenue && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center gap-3">
                  {selectedVenue.images?.[0] && (
                    <img
                      src={selectedVenue.images[0]}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {selectedVenue.title}
                    </div>
                    <div className="text-slate-400 text-xs flex items-center gap-2">
                      <MapPin size={12} /> {selectedVenue.region} •{" "}
                      {selectedVenue.category}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVenue(null)}
                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Selected Location Display */}
              {selectedLocation && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-3">
                  <MapPin size={24} className="text-purple-400" />
                  <div className="flex-1">
                    <div className="text-white font-medium">
                      {selectedLocation.text}
                    </div>
                    <div className="text-slate-400 text-xs truncate">
                      {selectedLocation.place_name}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* EVENT FORM (Only in 'create' mode) */}
            {mode === "create" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="h-px bg-white/10" />

                {/* Title & Desc */}
                <div className="grid gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Event Name *
                    </label>
                    <input
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Summer Sunset Session"
                      className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Description
                    </label>
                    <textarea
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      rows={3}
                      placeholder="What's happening? details, lineup, pricing info..."
                      className="w-full px-4 py-3 bg-slate-800 border-none rounded-xl text-white focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Event Category
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {EVENT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setEventCategory(cat.id)}
                        className={`p-3 rounded-xl text-center transition-all ${
                          eventCategory === cat.id
                            ? "bg-purple-500/20 border border-purple-500 text-purple-400"
                            : "bg-slate-800 border border-transparent text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        <cat.icon size={20} className="mx-auto mb-1" />
                        <div className="text-xs">{cat.label.split("/")[0]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Starts
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-24 bg-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Ends
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 bg-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-24 bg-slate-800 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Region */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Region
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800 rounded-xl text-white"
                  >
                    <option value="kyrenia">Kyrenia</option>
                    <option value="famagusta">Famagusta</option>
                    <option value="nicosia">Nicosia</option>
                    <option value="karpaz">Karpaz</option>
                    <option value="lefke">Lefke</option>
                    <option value="guzelyurt">Guzelyurt</option>
                  </select>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Event Images
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {/* Uploaded Images */}
                    {uploadedImages.map((url, i) => (
                      <div
                        key={i}
                        className="relative w-24 h-24 rounded-xl overflow-hidden group"
                      >
                        <img src={url} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                          <Trash2 size={20} className="text-red-400" />
                        </button>
                      </div>
                    ))}

                    {/* Uploading Images */}
                    {uploadingImages.map((item, i) => (
                      <div
                        key={i}
                        className="w-24 h-24 rounded-xl bg-slate-800 flex items-center justify-center"
                      >
                        <div className="text-center">
                          <Loader2
                            size={20}
                            className="animate-spin text-purple-400 mx-auto"
                          />
                          <div className="text-xs text-slate-400 mt-1">
                            {Math.round(item.progress)}%
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Upload Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                    >
                      <Upload size={24} className="text-slate-400" />
                      <span className="text-xs text-slate-400 mt-1">
                        Upload
                      </span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        e.target.files && handleImageUpload(e.target.files)
                      }
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-slate-800/50 p-4 rounded-xl space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Enable Actions
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {ACTIONS_CONFIG.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => toggleAction(action.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl transition-all ${
                          enabledActions[action.id]
                            ? `bg-${action.color}-500/20 text-${action.color}-400 border border-${action.color}-500/30`
                            : "bg-slate-700 text-slate-400 border border-transparent"
                        }`}
                      >
                        <action.icon size={16} />
                        <span className="text-sm">{action.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Action URLs */}
                  {Object.entries(enabledActions).some(([_, v]) => v) && (
                    <div className="grid gap-2 mt-3">
                      {enabledActions.book && (
                        <input
                          value={actionUrls.book || ""}
                          onChange={(e) =>
                            setActionUrls((prev) => ({
                              ...prev,
                              book: e.target.value,
                            }))
                          }
                          placeholder="Booking/Waitlist URL..."
                          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      )}
                      {enabledActions.tickets && (
                        <input
                          value={actionUrls.tickets || ""}
                          onChange={(e) =>
                            setActionUrls((prev) => ({
                              ...prev,
                              tickets: e.target.value,
                            }))
                          }
                          placeholder="Ticket URL..."
                          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      )}
                      {enabledActions.link && (
                        <input
                          value={actionUrls.link || ""}
                          onChange={(e) =>
                            setActionUrls((prev) => ({
                              ...prev,
                              link: e.target.value,
                            }))
                          }
                          placeholder="External Link URL..."
                          className="w-full bg-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DISTRIBUTION */}
            <div className="h-px bg-white/10 my-4" />

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-3">
                Distribute to Feeds
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => toggleSection(section.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      selectedSections.includes(section.id)
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-400"
                        : "bg-slate-800 border-white/5 text-slate-400 opacity-50 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedSections.includes(section.id)
                          ? "border-cyan-500 bg-cyan-500"
                          : "border-slate-500"
                      }`}
                    >
                      {selectedSections.includes(section.id) && (
                        <CheckCircle size={12} className="text-black" />
                      )}
                    </div>
                    <span className="font-medium text-sm">{section.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 backdrop-blur-md">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !canSave()}
            className="px-8 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
          >
            {isLoading
              ? "Saving..."
              : mode === "create"
                ? "Create & Publish"
                : "Add Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCurationModal;
