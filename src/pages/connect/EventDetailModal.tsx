import { logger } from "@/utils/logger";
import React, { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  Navigation,
  Share2,
  Ticket,
  Check,
  Heart,
  UserPlus,
  CreditCard,
  CalendarDays,
  Link,
  PartyPopper,
  Music,
  Utensils,
  Dumbbell,
  Briefcase,
  Loader2,
  ExternalLink,
  Copy,
  MessageCircle,
} from "lucide-react";
import { FeedItem } from "../../types/connect";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/formatters";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

interface EventDetailModalProps {
  item: FeedItem & {
    participantCount?: number;
    goingCount?: number;
    interestedCount?: number;
    actions?: {
      book?: boolean;
      tickets?: boolean;
      reserve?: boolean;
      rsvp?: boolean;
      share?: boolean;
      link?: boolean;
      urls?: Record<string, string>;
    };
    eventCategory?: string;
    locationName?: string;
    locationAddress?: string;
    hostVenueName?: string;
  };
  onClose: () => void;
  onCheckIn?: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  party: PartyPopper,
  music: Music,
  food: Utensils,
  fitness: Dumbbell,
  business: Briefcase,
  community: Users,
  wellness: Heart,
  other: Calendar,
};

const EventDetailModal: React.FC<EventDetailModalProps> = ({
  item,
  onClose,
  onCheckIn,
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [goingCount, setGoingCount] = useState(item.goingCount || 0);
  const [interestedCount, setInterestedCount] = useState(
    item.interestedCount || 0,
  );
  const [isGoing, setIsGoing] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const image =
    item.images?.[0] || "https://source.unsplash.com/random/800x600/?event";
  const isLive = (item as any)._status === "live";
  const CategoryIcon =
    CATEGORY_ICONS[(item as any).eventCategory || "other"] || Calendar;

  // Date and time formatting
  const startTime = (item as any).startTime || (item as any).eventTime;
  const endTime = (item as any).endTime;

  let dateStr = "Date TBA";
  let timeStr = "";
  let formattedDate = "";
  let timeRange = "";

  if (startTime) {
    formattedDate = formatDate(startTime, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    dateStr = formattedDate === "—" ? "Date TBA" : formattedDate;
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "2-digit",
    };
    timeStr = formatDate(startTime, timeOptions);

    if (endTime) {
      const endTimeStr = formatDate(endTime, timeOptions);
      timeRange = `${timeStr} - ${endTimeStr}`;
    } else {
      timeRange = timeStr;
    }
  }

  // Load user's current status and counts
  useEffect(() => {
    if (!user || !userId) return;

    // Check user's status
    const checkStatus = async () => {
      try {
        // Check if user is going
        const goingQuery = query(
          collection(db, "eventAttendees"),
          where("eventId", "==", item.id),
          where("userId", "==", userId),
          where("status", "==", "going"),
        );
        const goingSnap = await getDocs(goingQuery);
        setIsGoing(!goingSnap.empty);

        // Check if user is interested
        const interestedQuery = query(
          collection(db, "eventAttendees"),
          where("eventId", "==", item.id),
          where("userId", "==", userId),
          where("status", "==", "interested"),
        );
        const interestedSnap = await getDocs(interestedQuery);
        setIsInterested(!interestedSnap.empty);
      } catch (err) {
        console.error("Failed to load user status:", err);
      }
    };

    checkStatus();

    // Check if user is already checked in
    const checkCheckInStatus = async () => {
      if (!userId) return;

      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() - 3);

      const checkInQuery = query(
        collection(db, "checkins"),
        where("pinId", "==", item.id),
        where("userId", "==", userId),
        where("checkedInAt", ">", Timestamp.fromDate(expiryTime)),
      );
      const snap = await getDocs(checkInQuery);
      setIsCheckedIn(!snap.empty);
    };

    checkCheckInStatus();

    // Real-time listener for attendee counts
    const unsubscribe = onSnapshot(
      query(collection(db, "eventAttendees"), where("eventId", "==", item.id)),
      (snapshot) => {
        let going = 0;
        let interested = 0;
        snapshot.docs.forEach((doc) => {
          if (doc.data().status === "going") going++;
          if (doc.data().status === "interested") interested++;
        });
        setGoingCount(going);
        setInterestedCount(interested);
      },
    );

    return () => unsubscribe();
  }, [user, userId, item.id]);

  // Generate invite link
  useEffect(() => {
    const baseUrl = window.location.origin;
    setInviteLink(`${baseUrl}/connect?event=${item.id}`);
  }, [item.id]);

  const handleGoing = async () => {
    if (!user || !userId) {
      alert("Please sign in to RSVP");
      return;
    }

    setIsLoading(true);
    try {
      if (isGoing) {
        // Remove going
        const q = query(
          collection(db, "eventAttendees"),
          where("eventId", "==", item.id),
          where("userId", "==", userId),
          where("status", "==", "going"),
        );
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
        setIsGoing(false);
      } else {
        // Remove any existing interested status first
        if (isInterested) {
          const intQ = query(
            collection(db, "eventAttendees"),
            where("eventId", "==", item.id),
            where("userId", "==", userId),
            where("status", "==", "interested"),
          );
          const intSnap = await getDocs(intQ);
          await Promise.all(intSnap.docs.map((d) => deleteDoc(d.ref)));
          setIsInterested(false);
        }

        // Add going
        await addDoc(collection(db, "eventAttendees"), {
          eventId: item.id,
          userId: userId!,
          userDisplayName: user.name || "Anonymous",
          userAvatarUrl: user.avatar || null,
          status: "going",
          createdAt: Timestamp.now(),
        });
        setIsGoing(true);
      }
    } catch (err) {
      console.error("Failed to update going status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterested = async () => {
    if (!user || !userId) {
      alert("Please sign in to show interest");
      return;
    }

    setIsLoading(true);
    try {
      if (isInterested) {
        // Remove interested
        const q = query(
          collection(db, "eventAttendees"),
          where("eventId", "==", item.id),
          where("userId", "==", userId),
          where("status", "==", "interested"),
        );
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          await deleteDoc(doc(db, "eventAttendees", docSnap.id));
        }
        setIsInterested(false);
      } else {
        // Add interested
        await addDoc(collection(db, "eventAttendees"), {
          eventId: item.id,
          userId: userId!,
          userDisplayName: user.name || "Anonymous",
          userAvatarUrl: user.avatar || null,
          status: "interested",
          createdAt: Timestamp.now(),
        });
        setIsInterested(true);
      }
    } catch (err) {
      console.error("Failed to update interested status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !userId) {
      alert("Please sign in to check in");
      return;
    }

    setIsLoading(true);
    try {
      // Check if already checked in recently (last 3 hours)
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() - 3);

      const checkInQuery = query(
        collection(db, "checkins"),
        where("pinId", "==", item.id),
        where("userId", "==", userId),
        where("checkedInAt", ">", Timestamp.fromDate(expiryTime)),
      );
      const existingCheckIns = await getDocs(checkInQuery);

      if (!existingCheckIns.empty) {
        alert("You've already checked in here recently!");
        setIsCheckedIn(true);
        return;
      }

      // Create new check-in
      const checkInExpiry = new Date();
      checkInExpiry.setHours(checkInExpiry.getHours() + 3);

      const checkInRef = await addDoc(collection(db, "checkins"), {
        userId: userId,
        userDisplayName: user.name || "Anonymous",
        userAvatarUrl: user.avatar || null,
        pinId: item.id,
        pinType: item.type || "event",
        checkedInAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(checkInExpiry),
      });

      // Award stamp (if first time at this venue)
      const { awardStamp } = await import("../../services/stampsService");
      const stampId = await awardStamp(
        userId,
        item.id,
        (item.type as "place" | "event" | "activity" | "experience") || "event",
        item.title,
        {
          locationAddress:
            (item as any).locationAddress || (item as any).address,
          category: (item as any).eventCategory || (item as any).category,
          region: (item as any).region,
          checkInId: checkInRef.id,
        },
      );

      setIsCheckedIn(true);

      if (stampId) {
        alert("✅ Checked in! 🏆 You earned a new stamp!");
      } else {
        alert("✅ Checked in successfully!");
      }
    } catch (err) {
      console.error("Failed to check in:", err);
      alert("Check-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const eventUrl = `${window.location.origin}/connect?event=${item.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out ${item.title}!${item.description ? "\n\n" + item.description.slice(0, 150) + "..." : ""}`,
          url: eventUrl,
        });
        logger.debug("Shared successfully");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          logger.debug("Share cancelled");
          // Fallback to copy link
          await navigator.clipboard.writeText(eventUrl);
          alert("Link copied to clipboard!");
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(eventUrl);
      alert("🔗 Event link copied to clipboard!");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleGetDirections = () => {
    if (item.coordinates) {
      const { lat, lng } = item.coordinates;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      window.open(url, "_blank");
    } else {
      alert("Location not available for this event");
    }
  };

  const handleNavigate = () => {
    const coords = (item as any).coordinates;
    if (coords?.lat && coords?.lng) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`,
        "_blank",
      );
    } else {
      alert("Location coordinates not available");
    }
  };

  const handleActionClick = (actionId: string) => {
    const url = item.actions?.urls?.[actionId];
    if (url) {
      window.open(url, "_blank");
    } else {
      // Default behaviors
      switch (actionId) {
        case "share":
          handleShare();
          break;
        default:
          alert(`No URL configured for ${actionId}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <X size={20} />
        </button>

        {/* HERO IMAGE */}
        <div className="relative h-64 sm:h-80 shrink-0">
          <img
            src={image}
            className="w-full h-full object-cover"
            alt={item.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1">
                <CategoryIcon size={12} />
                {(item as any).eventCategory ||
                  item.type?.replace("_", " ") ||
                  "Event"}
              </span>
              {isLive && (
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold animate-pulse flex items-center gap-1">
                  <span className="w-2 h-2 bg-white rounded-full" /> LIVE NOW
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">
              {item.title}
            </h2>

            {/* Attendee Stats */}
            <div className="flex items-center gap-4 text-white/90 text-sm">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-cyan-400" />
                <span className="font-bold">{goingCount}</span> going
              </div>
              <div className="flex items-center gap-2">
                <Heart size={16} className="text-pink-400" />
                <span className="font-bold">{interestedCount}</span> interested
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT SCROLL */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-6 space-y-6">
            {/* Primary Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                {/* Event Details */}
                <div className="space-y-4">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="text-slate-400 mt-0.5" size={20} />
                    <div>
                      <div className="font-bold text-slate-900">
                        {formattedDate}
                      </div>
                      {timeRange && (
                        <div className="text-sm text-slate-500">
                          {timeRange}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  {(item.coordinates ||
                    item.locationName ||
                    item.locationAddress) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="text-slate-400 mt-0.5" size={20} />
                      <div className="flex-1">
                        {item.locationName && (
                          <div className="font-bold text-slate-900">
                            {item.locationName}
                          </div>
                        )}
                        {item.locationAddress && (
                          <div className="text-sm text-slate-500">
                            {item.locationAddress}
                          </div>
                        )}
                        {item.coordinates && (
                          <button
                            onClick={handleGetDirections}
                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                          >
                            <Navigation size={14} />
                            Get Directions
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* People Going */}
                  {(goingCount > 0 || interestedCount > 0) && (
                    <div className="flex items-start gap-3">
                      <Users className="text-slate-400 mt-0.5" size={20} />
                      <div>
                        <div className="text-sm text-slate-600">
                          {goingCount > 0 && (
                            <span className="font-bold text-slate-900">
                              {goingCount}
                            </span>
                          )}
                          {goingCount > 0 && <span> going</span>}
                          {goingCount > 0 && interestedCount > 0 && (
                            <span> • </span>
                          )}
                          {interestedCount > 0 && (
                            <span className="font-bold text-slate-900">
                              {interestedCount}
                            </span>
                          )}
                          {interestedCount > 0 && <span> interested</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* I'm Going Button */}
              <button
                onClick={handleGoing}
                disabled={isLoading}
                className={`p-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${
                  isGoing
                    ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isLoading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : isGoing ? (
                  <Check size={24} />
                ) : (
                  <UserPlus size={24} />
                )}
                {isGoing ? "You're Going!" : "I'm Going"}
              </button>

              {/* Interested Button */}
              <button
                onClick={handleInterested}
                disabled={isLoading || isGoing}
                className={`p-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${
                  isInterested
                    ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                } ${isGoing ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Heart
                  size={24}
                  className={isInterested ? "fill-current" : ""}
                />
                {isInterested ? "Interested" : "Maybe"}
              </button>

              {/* Check In Button - Only show if event is live or happening today */}
              {isLive && (
                <button
                  onClick={handleCheckIn}
                  disabled={isLoading || isCheckedIn}
                  className={`p-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${
                    isCheckedIn
                      ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  } ${isCheckedIn ? "cursor-not-allowed" : ""}`}
                >
                  <MapPin
                    size={24}
                    className={isCheckedIn ? "fill-current" : ""}
                  />
                  {isCheckedIn ? "Checked In" : "Check In"}
                </button>
              )}
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  About this Event
                </h3>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                  {item.description}
                </p>
              </div>
            )}

            {/* Dynamic Action Buttons */}
            {item.actions &&
              Object.keys(item.actions).some(
                (k) =>
                  k !== "urls" &&
                  item.actions?.[k as keyof typeof item.actions],
              ) && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase">
                    Actions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {item.actions.tickets && (
                      <button
                        onClick={() => handleActionClick("tickets")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors"
                      >
                        <Ticket size={18} /> Get Tickets
                      </button>
                    )}
                    {item.actions.book && (
                      <button
                        onClick={() => handleActionClick("book")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors"
                      >
                        <CreditCard size={18} /> Book Now
                      </button>
                    )}
                    {item.actions.reserve && (
                      <button
                        onClick={() => handleActionClick("reserve")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 transition-colors"
                      >
                        <CalendarDays size={18} /> Reserve
                      </button>
                    )}
                    {item.actions.link && (
                      <button
                        onClick={() => handleActionClick("link")}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-slate-900 rounded-xl font-bold text-sm hover:bg-cyan-400 transition-colors"
                      >
                        <ExternalLink size={18} /> More Info
                      </button>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* ACTION BAR (Sticky Bottom) */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
          {/* Check In (if Live) */}
          {isLive && onCheckIn && (
            <button
              onClick={() => onCheckIn(item.id)}
              className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <MapPin size={18} /> Check In
            </button>
          )}

          {/* Invite Friends */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex-1 py-3.5 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={18} /> Invite Friends
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
          >
            <Share2 size={20} />
          </button>

          {/* Navigate */}
          <button
            onClick={handleNavigate}
            className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
          >
            <Navigation size={20} />
          </button>
        </div>
      </div>

      {/* INVITE MODAL */}
      {showInviteModal && (
        <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowInviteModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus size={24} className="text-purple-500" />
              Invite Friends
            </h3>

            <p className="text-slate-600 text-sm mb-4">
              Share this event with your friends!
            </p>

            {/* Link Copy */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-sm text-slate-700 truncate"
              />
              <button
                onClick={copyLink}
                className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  copiedLink
                    ? "bg-green-500 text-white"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {copiedLink ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            {/* Share Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() =>
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(`Check out this event: ${item.title} ${inviteLink}`)}`,
                    "_blank",
                  )
                }
                className="p-4 bg-green-500 text-white rounded-xl flex flex-col items-center gap-2 hover:bg-green-600 transition-colors"
              >
                <MessageCircle size={24} />
                <span className="text-xs font-bold">WhatsApp</span>
              </button>
              <button
                onClick={() =>
                  window.open(
                    `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(item.title)}`,
                    "_blank",
                  )
                }
                className="p-4 bg-blue-500 text-white rounded-xl flex flex-col items-center gap-2 hover:bg-blue-600 transition-colors"
              >
                <MessageCircle size={24} />
                <span className="text-xs font-bold">Telegram</span>
              </button>
              <button
                onClick={handleShare}
                className="p-4 bg-slate-900 text-white rounded-xl flex flex-col items-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <Share2 size={24} />
                <span className="text-xs font-bold">More</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetailModal;
