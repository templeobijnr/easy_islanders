/**
 * MessageThread - Message list and composer
 */
import React, { useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import type { BookingMessage, BookingSummary } from "../types";
import { formatMessageTime } from "../utils";

interface MessageThreadProps {
    booking: BookingSummary;
    messages: BookingMessage[];
    newMessage: string;
    isSending: boolean;
    onMessageChange: (value: string) => void;
    onSend: () => void;
    title: string;
}

const MessageThread: React.FC<MessageThreadProps> = ({
    booking,
    messages,
    newMessage,
    isSending,
    onMessageChange,
    onSend,
    title,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">{title}</h3>
                <div className="text-xs text-slate-500 capitalize">{booking.status}</div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm py-8">
                        No messages yet. Start the conversation!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${msg.direction === "outbound"
                                    ? "bg-emerald-500 text-white rounded-br-sm"
                                    : "bg-slate-100 text-slate-900 rounded-bl-sm"
                                }`}>
                                <div className="text-sm whitespace-pre-wrap">{msg.body}</div>
                                <div className={`text-xs mt-1 ${msg.direction === "outbound" ? "text-emerald-100" : "text-slate-400"}`}>
                                    {formatMessageTime(msg.createdAt || null)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Composer */}
            <div className="p-4 border-t border-slate-200">
                <div className="flex items-end gap-2">
                    <textarea
                        value={newMessage}
                        onChange={(e) => onMessageChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                        onClick={onSend}
                        disabled={!newMessage.trim() || isSending}
                        className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MessageThread;
