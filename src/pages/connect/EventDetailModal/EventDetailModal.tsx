/**
 * EventDetailModal - Main Composer
 *
 * Event detail modal with RSVP, check-in, and sharing capabilities.
 * Uses extracted components for header, actions, and invite modal.
 */
import React, { useState, useEffect } from "react";
import {
    X,
    MapPin,
    Calendar,
    Navigation,
    Share2,
    Ticket,
    CreditCard,
    CalendarDays,
    ExternalLink,
    UserPlus,
    Users,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { formatDate } from "../../../utils/formatters";
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
} from "firebase/firestore";
import { db } from "../../../services/firebaseConfig";
import { EventHeader, EventActions, InviteModal } from "./components";
import { CATEGORY_ICONS } from "./constants";
import type { EventDetailModalProps } from "./types";

const EventDetailModal: React.FC<EventDetailModalProps> = ({ item, onClose, onCheckIn }) => {
    const { user } = useAuth();
    const userId = user?.id;
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [goingCount, setGoingCount] = useState(item.goingCount || 0);
    const [interestedCount, setInterestedCount] = useState(item.interestedCount || 0);
    const [isGoing, setIsGoing] = useState(false);
    const [isInterested, setIsInterested] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const isLive = (item as any)._status === "live";

    // Date formatting
    const startTime = (item as any).startTime || (item as any).eventTime;
    const endTime = (item as any).endTime;
    let formattedDate = "Date TBA";
    let timeRange = "";

    if (startTime) {
        formattedDate = formatDate(startTime, { weekday: "long", month: "long", day: "numeric" }) || "Date TBA";
        const timeStr = formatDate(startTime, { hour: "numeric", minute: "2-digit" });
        timeRange = endTime ? `${timeStr} - ${formatDate(endTime, { hour: "numeric", minute: "2-digit" })}` : timeStr || "";
    }

    // Load user status and counts
    useEffect(() => {
        if (!user || !userId) return;

        const checkStatus = async () => {
            const [goingSnap, interestedSnap] = await Promise.all([
                getDocs(query(collection(db, "eventAttendees"), where("eventId", "==", item.id), where("userId", "==", userId), where("status", "==", "going"))),
                getDocs(query(collection(db, "eventAttendees"), where("eventId", "==", item.id), where("userId", "==", userId), where("status", "==", "interested"))),
            ]);
            setIsGoing(!goingSnap.empty);
            setIsInterested(!interestedSnap.empty);
        };
        checkStatus();

        // Real-time counts
        const unsub = onSnapshot(
            query(collection(db, "eventAttendees"), where("eventId", "==", item.id)),
            (snap) => {
                let going = 0, interested = 0;
                snap.docs.forEach((d) => { if (d.data().status === "going") going++; if (d.data().status === "interested") interested++; });
                setGoingCount(going); setInterestedCount(interested);
            }
        );
        return () => unsub();
    }, [user, userId, item.id]);

    // Handlers
    const handleGoing = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            if (isGoing) {
                const snap = await getDocs(query(collection(db, "eventAttendees"), where("eventId", "==", item.id), where("userId", "==", userId), where("status", "==", "going")));
                for (const d of snap.docs) await deleteDoc(doc(db, "eventAttendees", d.id));
                setIsGoing(false);
            } else {
                if (isInterested) {
                    const snap = await getDocs(query(collection(db, "eventAttendees"), where("eventId", "==", item.id), where("userId", "==", userId), where("status", "==", "interested")));
                    for (const d of snap.docs) await deleteDoc(doc(db, "eventAttendees", d.id));
                    setIsInterested(false);
                }
                await addDoc(collection(db, "eventAttendees"), { eventId: item.id, userId, status: "going", timestamp: Timestamp.now() });
                setIsGoing(true);
            }
        } finally { setIsLoading(false); }
    };

    const handleInterested = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            if (isInterested) {
                const snap = await getDocs(query(collection(db, "eventAttendees"), where("eventId", "==", item.id), where("userId", "==", userId), where("status", "==", "interested")));
                for (const d of snap.docs) await deleteDoc(doc(db, "eventAttendees", d.id));
                setIsInterested(false);
            } else {
                await addDoc(collection(db, "eventAttendees"), { eventId: item.id, userId, status: "interested", timestamp: Timestamp.now() });
                setIsInterested(true);
            }
        } finally { setIsLoading(false); }
    };

    const handleCheckIn = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            await addDoc(collection(db, "checkins"), { pinId: item.id, pinType: item.type || "event", userId, timestamp: Timestamp.now(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 4 * 60 * 60 * 1000)) });
            setIsCheckedIn(true);
            onCheckIn?.(item.id);
        } finally { setIsLoading(false); }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/connect/${item.id}`;
        if (navigator.share) { try { await navigator.share({ title: item.title, url }); } catch { } }
        else navigator.clipboard.writeText(url);
    };

    const handleGetDirections = () => {
        const { lat, lng } = item.coordinates || { lat: item.lat, lng: item.lng };
        if (lat && lng) window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    };

    const handleNavigate = () => {
        const { lat, lng } = item.coordinates || { lat: item.lat, lng: item.lng };
        if (lat && lng) window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
    };

    const handleActionClick = (actionId: string) => {
        const url = item.actions?.urls?.[actionId];
        if (url) window.open(url, "_blank");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md">
                    <X size={20} />
                </button>

                <EventHeader item={item} isLive={isLive} formattedDate={formattedDate} timeRange={timeRange} goingCount={goingCount} interestedCount={interestedCount} />

                <div className="flex-1 overflow-y-auto bg-white p-6 space-y-6">
                    {/* Location */}
                    {(item.coordinates || item.locationName || item.locationAddress) && (
                        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
                            <MapPin className="text-slate-400 mt-0.5" size={20} />
                            <div className="flex-1">
                                {item.locationName && <div className="font-bold text-slate-900">{item.locationName}</div>}
                                {item.locationAddress && <div className="text-sm text-slate-500">{item.locationAddress}</div>}
                                {item.coordinates && (
                                    <button onClick={handleGetDirections} className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                                        <Navigation size={14} /> Get Directions
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <EventActions isLive={isLive} isLoading={isLoading} isGoing={isGoing} isInterested={isInterested} isCheckedIn={isCheckedIn} onGoing={handleGoing} onInterested={handleInterested} onCheckIn={handleCheckIn} />

                    {item.description && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">About this Event</h3>
                            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">{item.description}</p>
                        </div>
                    )}

                    {/* Dynamic Actions */}
                    {item.actions && Object.keys(item.actions).some((k) => k !== "urls" && item.actions?.[k as keyof typeof item.actions]) && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-slate-400 uppercase">Actions</h3>
                            <div className="flex flex-wrap gap-2">
                                {item.actions.tickets && <button onClick={() => handleActionClick("tickets")} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600"><Ticket size={18} /> Get Tickets</button>}
                                {item.actions.book && <button onClick={() => handleActionClick("book")} className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600"><CreditCard size={18} /> Book Now</button>}
                                {item.actions.reserve && <button onClick={() => handleActionClick("reserve")} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600"><CalendarDays size={18} /> Reserve</button>}
                                {item.actions.link && <button onClick={() => handleActionClick("link")} className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500 text-slate-900 rounded-xl font-bold text-sm hover:bg-cyan-400"><ExternalLink size={18} /> More Info</button>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                    {isLive && onCheckIn && <button onClick={() => onCheckIn(item.id)} className="flex-1 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><MapPin size={18} /> Check In</button>}
                    <button onClick={() => setShowInviteModal(true)} className="flex-1 py-3.5 bg-purple-500 hover:bg-purple-400 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"><UserPlus size={18} /> Invite Friends</button>
                    <button onClick={handleShare} className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200"><Share2 size={20} /></button>
                    <button onClick={handleNavigate} className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200"><Navigation size={20} /></button>
                </div>
            </div>

            {showInviteModal && <InviteModal eventId={item.id} eventTitle={item.title || "Event"} onClose={() => setShowInviteModal(false)} onShare={handleShare} />}
        </div>
    );
};

export default EventDetailModal;
