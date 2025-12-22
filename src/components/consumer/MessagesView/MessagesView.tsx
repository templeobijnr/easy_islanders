/**
 * MessagesView - Composer
 *
 * Split Plan:
 * - Extracted types: types.ts
 * - Extracted hooks: useMessagesData.ts (subscription + send)
 * - Extracted components: BookingsList, MessageThread
 * - Extracted utils: utils.ts
 * - Behavior preserved: yes (no UI change)
 */
import React from "react";
import { MessageCircle, Inbox, Loader2 } from "lucide-react";
import { useMessagesData } from "./hooks/useMessagesData";
import { BookingsList, MessageThread } from "./components";

const MessagesView: React.FC = () => {
    const vm = useMessagesData();

    if (vm.isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-slate-200">
                <div className="p-2 bg-emerald-100 rounded-xl">
                    <MessageCircle className="text-emerald-600" size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Messages</h2>
                    <p className="text-sm text-slate-500">Your booking conversations</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex h-[500px]">
                {/* Bookings Sidebar */}
                <div className="w-80 border-r border-slate-200 flex flex-col">
                    <div className="p-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Inbox size={16} /> Your Bookings ({vm.bookings.length})
                        </h3>
                    </div>
                    <BookingsList
                        bookings={vm.bookings}
                        selectedId={vm.selectedBookingId}
                        onSelect={vm.setSelectedBookingId}
                        getTitle={vm.getItemTitle}
                    />
                </div>

                {/* Message Thread */}
                {vm.selectedBooking ? (
                    <MessageThread
                        booking={vm.selectedBooking}
                        messages={vm.messages}
                        newMessage={vm.newMessage}
                        isSending={vm.isSending}
                        onMessageChange={vm.setNewMessage}
                        onSend={vm.sendMessage}
                        title={vm.getItemTitle(vm.selectedBooking)}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <div className="text-center">
                            <MessageCircle size={48} className="mx-auto mb-3 text-slate-300" />
                            <p>Select a booking to view messages</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessagesView;
