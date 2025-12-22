import React, { useState } from 'react';
import { X, MapPin, Calendar, Clock, Tag, Users, Image as ImageIcon, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LocationPicker from '../../components/shared/LocationPicker';
import { createUserEvent } from '../../services/connectService';

interface CreateEventModalProps {
    onClose: () => void;
    onSuccess?: (eventId: string) => void;
}

const CATEGORIES = [
    { value: 'nightlife', label: 'Nightlife', icon: '🍸' },
    { value: 'beach', label: 'Beach', icon: '🏖️' },
    { value: 'nature', label: 'Nature', icon: '🌿' },
    { value: 'food', label: 'Food & Dining', icon: '🍔' },
    { value: 'culture', label: 'Culture & History', icon: '🏛️' },
    { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
    { value: 'music', label: 'Music & Arts', icon: '🎵' },
    { value: 'social', label: 'Social Gathering', icon: '👋' },
];

const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        date: '',
        time: '',
        isPublic: true,
        maxAttendees: '',
    });

    const [location, setLocation] = useState<{
        lat: number;
        lng: number;
        address: string;
        placeId?: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !location) {
            alert('Please select a location');
            return;
        }

        if (!formData.title || !formData.date || !formData.category) {
            alert('Please fill in all required fields');
            return;
        }

        setIsSubmitting(true);

        try {
            const startTime = new Date(`${formData.date}T${formData.time || '12:00'}`);

            const eventId = await createUserEvent({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                coordinates: { lat: location.lat, lng: location.lng },
                region: 'kyrenia', // TODO: Detect from coordinates
                startTime,
                isPublic: formData.isPublic,
                images: [],
                actions: {
                    allowJoin: true,
                    allowCheckIn: true,
                    allowWave: true,
                    allowBooking: false,
                    allowTaxi: true,
                }
            }, user.id);

            setSubmitted(true);
            onSuccess?.(eventId);

        } catch (error) {
            console.error('Failed to create event:', error);
            alert('Failed to create event. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Event Submitted!</h2>
                    <p className="text-slate-600 mb-6">
                        Your event is pending approval. Once approved by our team, it will appear on the map and feed.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                    >
                        Got it!
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create Event</h2>
                        <p className="text-sm text-slate-500">Share what's happening on the island</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Event Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Sunset Beach Party"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                            required
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            <Tag size={14} className="inline mr-1" /> Category *
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: cat.value })}
                                    className={`p-3 rounded-xl border-2 text-center transition-all ${formData.category === cat.value
                                        ? 'border-slate-900 bg-slate-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <span className="text-xl block mb-1">{cat.icon}</span>
                                    <span className="text-xs font-medium text-slate-700">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Tell people what this event is about..."
                            rows={3}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                <Calendar size={14} className="inline mr-1" /> Date *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                <Clock size={14} className="inline mr-1" /> Time
                            </label>
                            <input
                                type="time"
                                value={formData.time}
                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            <MapPin size={14} className="inline mr-1" /> Location *
                        </label>
                        <LocationPicker
                            value={location}
                            onChange={setLocation}
                        />
                    </div>

                    {/* Public toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                        <div>
                            <div className="font-bold text-slate-900">Public Event</div>
                            <div className="text-sm text-slate-500">Anyone can see and join this event</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                            className={`w-12 h-7 rounded-full transition-colors ${formData.isPublic ? 'bg-green-500' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || !formData.title || !formData.date || !formData.category || !location}
                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Submit for Approval
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center text-slate-500">
                        Events are reviewed by our team before appearing on the map
                    </p>
                </form>
            </div>
        </div>
    );
};

export default CreateEventModal;
