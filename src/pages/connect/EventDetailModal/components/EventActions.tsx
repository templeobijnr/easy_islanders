/**
 * EventActions - Action buttons for going, interested, check-in
 */
import React from "react";
import { MapPin, UserPlus, Check, Heart, Loader2 } from "lucide-react";

interface EventActionsProps {
    isLive: boolean;
    isLoading: boolean;
    isGoing: boolean;
    isInterested: boolean;
    isCheckedIn: boolean;
    onGoing: () => void;
    onInterested: () => void;
    onCheckIn: () => void;
}

const EventActions: React.FC<EventActionsProps> = ({
    isLive,
    isLoading,
    isGoing,
    isInterested,
    isCheckedIn,
    onGoing,
    onInterested,
    onCheckIn,
}) => {
    return (
        <div className="grid grid-cols-2 gap-3">
            {/* I'm Going Button */}
            <button
                onClick={onGoing}
                disabled={isLoading}
                className={`p-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${isGoing
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
            >
                {isLoading ? <Loader2 size={24} className="animate-spin" /> : isGoing ? <Check size={24} /> : <UserPlus size={24} />}
                {isGoing ? "You're Going!" : "I'm Going"}
            </button>

            {/* Interested Button */}
            <button
                onClick={onInterested}
                disabled={isLoading || isGoing}
                className={`p-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${isInterested
                        ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    } ${isGoing ? "opacity-50 cursor-not-allowed" : ""}`}
            >
                <Heart size={24} className={isInterested ? "fill-current" : ""} />
                {isInterested ? "Interested" : "Maybe"}
            </button>

            {/* Check In Button - Only show if event is live */}
            {isLive && (
                <button
                    onClick={onCheckIn}
                    disabled={isLoading || isCheckedIn}
                    className={`p-4 rounded-2xl font-bold text-sm transition-all flex flex-col items-center gap-2 ${isCheckedIn
                            ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        } ${isCheckedIn ? "cursor-not-allowed" : ""}`}
                >
                    <MapPin size={24} className={isCheckedIn ? "fill-current" : ""} />
                    {isCheckedIn ? "Checked In" : "Check In"}
                </button>
            )}
        </div>
    );
};

export default EventActions;
