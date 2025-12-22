/**
 * MediaTab - Image upload and gallery
 */
import React, { useRef } from 'react';
import { UploadCloud, Trash2, Star, Download, Loader2 } from 'lucide-react';
import type { PropertyFormData } from '../types';

interface MediaTabProps {
    form: PropertyFormData;
    setForm: React.Dispatch<React.SetStateAction<PropertyFormData>>;
    isUploading: boolean;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDownloadImage: (e: React.MouseEvent, url: string) => void;
}

const MediaTab: React.FC<MediaTabProps> = ({
    form,
    setForm,
    isUploading,
    onImageUpload,
    onDownloadImage,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const removeImage = (index: number) => {
        const newImages = [...(form.images || [])];
        newImages.splice(index, 1);
        setForm({ ...form, images: newImages });
    };

    const setCoverImage = (url: string) => {
        setForm({ ...form, imageUrl: url });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Upload Zone */}
            <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all"
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onImageUpload}
                    className="hidden"
                />
                {isUploading ? (
                    <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-2" />
                ) : (
                    <UploadCloud size={32} className="text-slate-400 mx-auto mb-2" />
                )}
                <p className="text-slate-600 font-medium">Click to upload images</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 10MB each</p>
            </div>

            {/* Image Gallery */}
            {form.images && form.images.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm">Gallery ({form.images.length})</h4>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {form.images.map((url, index) => (
                            <div
                                key={index}
                                className={`relative group rounded-xl overflow-hidden border-2 ${form.imageUrl === url ? 'border-teal-500' : 'border-transparent'
                                    }`}
                            >
                                <img src={url} alt="" className="w-full h-24 object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => setCoverImage(url)}
                                        className="p-2 bg-white rounded-full hover:bg-teal-50"
                                        title="Set as cover"
                                    >
                                        <Star size={14} className={form.imageUrl === url ? 'text-teal-500' : 'text-slate-600'} />
                                    </button>
                                    <button
                                        onClick={(e) => onDownloadImage(e, url)}
                                        className="p-2 bg-white rounded-full hover:bg-blue-50"
                                        title="Download"
                                    >
                                        <Download size={14} className="text-slate-600" />
                                    </button>
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="p-2 bg-white rounded-full hover:bg-red-50"
                                        title="Remove"
                                    >
                                        <Trash2 size={14} className="text-red-500" />
                                    </button>
                                </div>
                                {form.imageUrl === url && (
                                    <div className="absolute top-1 left-1 px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded">
                                        Cover
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaTab;
