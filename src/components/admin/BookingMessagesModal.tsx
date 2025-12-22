import React, { useEffect, useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebaseConfig';
import { Booking } from '../../types/connect';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/formatters';

interface BookingMessagesModalProps {
  booking: Booking & {
    catalogType?: 'stay' | 'activity' | 'event' | 'place' | 'experience';
    itemTitle?: string;
    stayTitle?: string;
    hostName?: string;
  };
  onClose: () => void;
}

interface BookingMessage {
  id: string;
  body: string;
  senderRole?: string;
  direction?: 'inbound' | 'outbound';
  channel?: string;
  from?: string;
  createdAt?: Date | null;
}

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const BookingMessagesModal: React.FC<BookingMessagesModalProps> = ({
  booking,
  onClose,
}) => {
  const { user: adminUser } = useAuth();
  const [messages, setMessages] = useState<BookingMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const typeLabel = booking.catalogType
    ? booking.catalogType.charAt(0).toUpperCase() + booking.catalogType.slice(1)
    : booking.stayId
      ? 'Stay'
      : 'Listing';

  const title = booking.itemTitle || booking.stayTitle || 'Booking';

  useEffect(() => {
    if (!adminUser) return;

    const q = query(
      collection(db, 'bookingCommunications'),
      where('bookingId', '==', booking.id)
    );

    const unsub = onSnapshot(q, snapshot => {
      const rows: BookingMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          body: data.body || '',
          senderRole: data.senderRole,
          direction: data.direction,
          channel: data.channel,
          from: data.from,
          createdAt: parseDate(data.createdAt),
        };
      });
      rows.sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return aTime - bTime;
      });
      setMessages(rows);
    }, (error) => {
      console.error("Error fetching booking messages:", error);
    });

    return () => unsub();
  }, [booking.id, adminUser]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    if (!adminUser) {
      console.error("Cannot send message: User not authenticated");
      alert("You must be logged in to send messages.");
      return;
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'bookingCommunications'), {
        bookingId: booking.id,
        userId: booking.userId, // The guest's user ID
        senderRole: 'admin',
        channel: 'admin',
        direction: 'outbound',
        from: adminUser.id, // The admin's user ID
        body: draft.trim(),
        createdAt: serverTimestamp(),
      });
      setDraft('');
    } catch (err) {
      console.error('Failed to send admin booking message', err);
      alert('Could not send message. Check console for details.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-cyan-400" />
            <div>
              <div className="text-xs font-mono text-slate-500 uppercase tracking-wide">
                Booking Messages
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {title} — {booking.id}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-slate-900/80 border border-slate-800 p-4 text-sm text-slate-300">
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Guest</div>
              <div className="font-semibold text-slate-100">
                {(booking as any).guestDetails?.firstName} {(booking as any).guestDetails?.lastName}
              </div>
              <div className="text-xs text-slate-400">{(booking as any).guestDetails?.email}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-1">Booking Details</div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-200 border border-slate-700">
                  {typeLabel.toUpperCase()}
                </span>
                <span className="text-slate-100">{title}</span>
                {booking.status && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${booking.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                    booking.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                    {booking.status}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                ID: <span className="font-mono">{booking.id}</span>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-800 text-xs text-slate-500">
            Messages sent here will appear in the guest's inbox.
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
          {messages.length === 0 && (
            <div className="text-xs text-slate-500 text-center mt-6">
              No messages yet. Start the conversation below.
            </div>
          )}
          {messages.map(msg => {
            const isAdmin = msg.senderRole === 'admin';
            const label =
              msg.senderRole === 'guest'
                ? 'Guest'
                : msg.senderRole === 'host'
                  ? 'Host (WhatsApp)'
                  : msg.senderRole === 'admin'
                    ? 'Admin'
                    : msg.channel || 'System';

            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${isAdmin
                    ? 'bg-cyan-500 text-slate-950 rounded-br-sm'
                    : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                    }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold opacity-80">{label}</span>
                    {msg.createdAt && (
                      <span className="text-[10px] opacity-70">
                        {formatDate(msg.createdAt, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-800 pt-3 mt-auto">
          <div className="flex items-end gap-3">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Write a message to the guest about this booking..."
              className="flex-1 min-h-[60px] max-h-[120px] resize-y bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/60"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="h-9 px-4 rounded-xl bg-cyan-500 text-slate-950 text-xs font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-colors"
            >
              <Send size={14} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingMessagesModal;
