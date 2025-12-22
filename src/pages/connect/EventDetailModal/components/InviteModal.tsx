/**
 * InviteModal - Share event with friends
 */
import React, { useState } from "react";
import { X, UserPlus, Copy, Check, MessageCircle, Share2 } from "lucide-react";

interface InviteModalProps {
    eventId: string;
    eventTitle: string;
    onClose: () => void;
    onShare: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ eventId, eventTitle, onClose, onShare }) => {
    const [copiedLink, setCopiedLink] = useState(false);
    const inviteLink = `${window.location.origin}/connect/${eventId}`;

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="absolute inset-0 flex items-center justify-center z-20 p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <UserPlus size={24} className="text-purple-500" />
                    Invite Friends
                </h3>

                <p className="text-slate-600 text-sm mb-4">Share this event with your friends!</p>

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
                        className={`px-4 py-3 rounded-xl font-bold text-sm transition-all ${copiedLink ? "bg-green-500 text-white" : "bg-slate-900 text-white hover:bg-slate-800"
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
                                `https://wa.me/?text=${encodeURIComponent(`Check out this event: ${eventTitle} ${inviteLink}`)}`,
                                "_blank"
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
                                `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(eventTitle)}`,
                                "_blank"
                            )
                        }
                        className="p-4 bg-blue-500 text-white rounded-xl flex flex-col items-center gap-2 hover:bg-blue-600 transition-colors"
                    >
                        <MessageCircle size={24} />
                        <span className="text-xs font-bold">Telegram</span>
                    </button>
                    <button
                        onClick={onShare}
                        className="p-4 bg-slate-900 text-white rounded-xl flex flex-col items-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        <Share2 size={24} />
                        <span className="text-xs font-bold">More</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InviteModal;
