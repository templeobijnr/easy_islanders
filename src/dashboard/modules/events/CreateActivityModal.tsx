import React, { useState, useRef } from 'react';
import { X, Upload, Calendar, Clock, MapPin, Tag, DollarSign, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface CreateActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ActivityFormData) => Promise<void>;
    businessName: string;
    businessLocation?: { lat: number; lng: number };
    initialData?: Partial<ActivityFormData>;
}

export interface ActivityFormData {
    title: string;
    description: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    images: string[];
    price: number;
    currency: string;
}

const CATEGORIES = [
    { value: 'nightlife', label: 'Nightlife', emoji: '🌙' },
    { value: 'live_music', label: 'Live Music', emoji: '🎵' },
    { value: 'food_drink', label: 'Food & Drink', emoji: '🍽️' },
    { value: 'wellness', label: 'Wellness', emoji: '🧘' },
    { value: 'adventure', label: 'Adventure', emoji: '🏄' },
    { value: 'cultural', label: 'Cultural', emoji: '🎭' },
    { value: 'sports', label: 'Sports', emoji: '⚽' },
    { value: 'workshop', label: 'Workshop', emoji: '🎨' },
];

const CURRENCIES = ['EUR', 'USD', 'GBP', 'TRY'];

const CreateActivityModal: React.FC<CreateActivityModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    businessName,
    initialData
}) => {
    const [formData, setFormData] = useState<ActivityFormData>({
        title: initialData?.title || '',
        description: initialData?.description || '',
        category: initialData?.category || '',
        date: initialData?.date || '',
        startTime: initialData?.startTime || '',
        endTime: initialData?.endTime || '',
        venue: initialData?.venue || businessName,
        images: initialData?.images || [],
        price: initialData?.price || 0,
        currency: initialData?.currency || 'EUR',
    });

    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) newErrors.title = 'Title is required';
        if (!formData.category) newErrors.category = 'Please select a category';
        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.startTime) newErrors.startTime = 'Start time is required';
        if (formData.images.length === 0) newErrors.images = 'At least one image is required';

        // Date cannot be in the past
        const selectedDate = new Date(formData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            newErrors.date = 'Date cannot be in the past';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (formData.images.length >= 3) {
            setErrors({ ...errors, images: 'Maximum 3 images allowed' });
            return;
        }

        setIsUploading(true);
        try {
            const storage = getStorage();
            const uploadPromises = Array.from(files).slice(0, 3 - formData.images.length).map(async (file) => {
                const fileRef = ref(storage, `events/${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                return getDownloadURL(fileRef);
            });
            const urls = await Promise.all(uploadPromises);
            setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
            setErrors(prev => ({ ...prev, images: '' }));
        } catch (error) {
            console.error('Upload failed:', error);
            setErrors({ ...errors, images: 'Failed to upload image' });
        } finally {
            setIsUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error('Submit failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create Activity</h2>
                        <p className="text-sm text-slate-500">This will be sent to admin for approval</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Event Title *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Sunset DJ Session"
                            className={`w-full px-4 py-3 rounded-xl border ${errors.title ? 'border-red-300 bg-red-50' : 'border-slate-200'} focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none`}
                        />
                        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            <Tag size={14} className="inline mr-1" /> Category *
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: cat.value })}
                                    className={`p-3 rounded-xl border text-center transition-all ${formData.category === cat.value
                                        ? 'border-slate-900 bg-slate-900 text-white'
                                        : 'border-slate-200 hover:border-slate-400'
                                        }`}
                                >
                                    <div className="text-xl mb-1">{cat.emoji}</div>
                                    <div className="text-xs font-medium">{cat.label}</div>
                                </button>
                            ))}
                        </div>
                        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Tell people what to expect..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <Calendar size={14} className="inline mr-1" /> Date *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.date ? 'border-red-300' : 'border-slate-200'} focus:ring-2 focus:ring-slate-900 outline-none`}
                            />
                            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <Clock size={14} className="inline mr-1" /> Start *
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.startTime ? 'border-red-300' : 'border-slate-200'} focus:ring-2 focus:ring-slate-900 outline-none`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <Clock size={14} className="inline mr-1" /> End
                            </label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                        </div>
                    </div>

                    {/* Venue */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            <MapPin size={14} className="inline mr-1" /> Venue
                        </label>
                        <input
                            type="text"
                            value={formData.venue}
                            onChange={e => setFormData({ ...formData, venue: e.target.value })}
                            placeholder="Location name"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                        />
                    </div>

                    {/* Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                <DollarSign size={14} className="inline mr-1" /> Price (0 = Free)
                            </label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                min={0}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Currency
                            </label>
                            <select
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none"
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            <ImageIcon size={14} className="inline mr-1" /> Event Images * (Max 3)
                        </label>
                        <div className="flex gap-3 flex-wrap">
                            {formData.images.map((url, idx) => (
                                <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden group">
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            ))}
                            {formData.images.length < 3 && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-colors"
                                >
                                    {isUploading ? (
                                        <Loader2 size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Upload size={20} />
                                            <span className="text-xs mt-1">Upload</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        📋 Your event will be reviewed by our team before going live.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : null}
                            Submit for Review
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateActivityModal;
