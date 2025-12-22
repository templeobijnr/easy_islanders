import React, { useState, useEffect, useRef } from 'react';
import { Store, MapPin, Phone, Globe, Save, Loader2, Image as ImageIcon, Trash2, PlusCircle, Upload, AlertCircle, GripVertical, Check, X, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StorageService } from '../../services/infrastructure/storage/local-storage.service';
import { UnifiedListingsService } from '../../services/unifiedListingsService';
import { UnifiedItem } from '../../types/marketplace';
import { BusinessConfig } from '../../types';
import { uploadImage, validateImageFile, UploadProgress } from '../../services/infrastructure/storage/image-upload.service';

interface ProfileModuleProps {
    config: BusinessConfig;
}

const ProfileModule: React.FC<ProfileModuleProps> = ({ config }) => {
    const { user } = useAuth();
    const [listing, setListing] = useState<UnifiedItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        agentPhone: '',
        imageUrl: '',
        images: [] as string[]
    });

    // Upload State
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadListing();
    }, [config.id]);

    const loadListing = async () => {
        if (!config.id) return;
        setIsLoading(true);
        try {
            const found = await UnifiedListingsService.getById(config.id);

            if (found) {
                setListing(found as any); // Cast to UnifiedItem for now
                setFormData({
                    title: found.title,
                    description: found.description || '',
                    location: found.address || found.region || '',
                    agentPhone: (found as any).agentPhone || (found as any).phone || '',
                    imageUrl: found.images?.[0] || '',
                    images: found.images || []
                });
            }
        } catch (error) {
            console.error("Failed to load listing", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!listing) return;
        setIsSaving(true);
        try {
            const updates = {
                title: formData.title,
                description: formData.description,
                address: formData.location,
                images: formData.images.length > 0 ? formData.images : (formData.imageUrl ? [formData.imageUrl] : []),
            };

            await UnifiedListingsService.update(listing.id, updates);
            setListing({ ...listing, ...updates } as any);

            // Also update local config name if it changed
            if (formData.title !== config.businessName) {
                const newConfig = { ...config, businessName: formData.title };
                await StorageService.saveBusinessConfig(newConfig);
            }

            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to save profile", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadError(null);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Validate file
            const validation = validateImageFile(file);
            if (!validation.valid) {
                setUploadError(validation.error || 'Invalid file');
                continue;
            }

            try {
                // Upload to Firebase Storage
                const storagePath = `business_images/${config.id || 'unknown'}`;
                const url = await uploadImage(file, storagePath, (progress: UploadProgress) => {
                    setUploadProgress(Math.round(progress.progress));
                });

                // Add to images array
                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, url],
                    imageUrl: prev.imageUrl || url // Set as cover if no cover yet
                }));
            } catch (error: unknown) {
                console.error('Upload failed:', error);
                setUploadError('Failed to upload image. Please try again.');
            }
        }

        setUploadProgress(null);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
            imageUrl: index === 0 && prev.images.length > 1 ? prev.images[1] : prev.imageUrl
        }));
    };

    // Drag and Drop Reorder
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        // Reorder the images
        const newImages = [...formData.images];
        const draggedImage = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, draggedImage);

        setFormData(prev => ({
            ...prev,
            images: newImages,
            imageUrl: newImages[0] // First image is always cover
        }));
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    // Set as Cover (move to first position)
    const setAsCover = (index: number) => {
        if (index === 0) return;
        const newImages = [...formData.images];
        const [image] = newImages.splice(index, 1);
        newImages.unshift(image);
        setFormData(prev => ({
            ...prev,
            images: newImages,
            imageUrl: image
        }));
    };

    // Bulk Delete
    const [selectMode, setSelectMode] = useState(false);
    const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

    const toggleSelectImage = (index: number) => {
        setSelectedImages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const deleteSelectedImages = () => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => !selectedImages.has(i)),
            imageUrl: selectedImages.has(0) && prev.images.length > selectedImages.size
                ? prev.images.find((_, i) => !selectedImages.has(i)) || ''
                : prev.imageUrl
        }));
        setSelectedImages(new Set());
        setSelectMode(false);
    };

    const cancelSelectMode = () => {
        setSelectedImages(new Set());
        setSelectMode(false);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-400">Loading profile...</div>;

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Business Profile</h2>
                    <p className="text-slate-500 mt-1">Manage your public listing details and gallery.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <Store size={20} className="text-slate-400" /> Basic Information
                        </h3>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Business Name</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all font-bold text-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={5}
                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                                placeholder="Describe your business..."
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <MapPin size={20} className="text-slate-400" /> Contact & Location
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                                <div className="relative">
                                    <Phone size={18} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input
                                        value={formData.agentPhone}
                                        onChange={e => setFormData({ ...formData, agentPhone: e.target.value })}
                                        className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                                        placeholder="+90 533..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Location / Address</label>
                                <div className="relative">
                                    <MapPin size={18} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                                        placeholder="Kyrenia, North Cyprus"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar / Images */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                            <ImageIcon size={20} className="text-slate-400" /> Main Image
                        </h3>
                        <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden mb-4 relative group">
                            <img src={formData.imageUrl} alt="Main" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button className="text-white font-bold text-sm bg-black/50 px-3 py-2 rounded-lg backdrop-blur-sm">Change Cover</button>
                            </div>
                        </div>
                        <input
                            value={formData.imageUrl}
                            onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                            className="w-full p-2 text-xs border border-slate-200 rounded-lg text-slate-500"
                            placeholder="Image URL..."
                        />
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                Gallery <span className="text-slate-400 text-sm font-normal">({formData.images.length})</span>
                            </h3>
                            <div className="flex items-center gap-2">
                                {formData.images.length > 1 && !selectMode && (
                                    <button
                                        onClick={() => setSelectMode(true)}
                                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors text-xs font-medium"
                                    >
                                        Select
                                    </button>
                                )}
                                {selectMode && (
                                    <>
                                        <button
                                            onClick={cancelSelectMode}
                                            className="text-slate-500 hover:text-slate-700 p-2 rounded-lg transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                        <button
                                            onClick={deleteSelectedImages}
                                            disabled={selectedImages.size === 0}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 text-sm font-medium"
                                        >
                                            <Trash2 size={16} />
                                            Delete ({selectedImages.size})
                                        </button>
                                    </>
                                )}
                                {!selectMode && (
                                    <button
                                        onClick={triggerFileInput}
                                        disabled={uploadProgress !== null}
                                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-2 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <PlusCircle size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Drag hint */}
                        {formData.images.length > 1 && !selectMode && (
                            <p className="text-xs text-slate-400 mb-3">💡 Drag images to reorder. First image is the cover.</p>
                        )}

                        {/* Hidden File Input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        {/* Upload Progress */}
                        {uploadProgress !== null && (
                            <div className="mb-4">
                                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                                    <Loader2 size={14} className="animate-spin" />
                                    Uploading... {uploadProgress}%
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className="bg-teal-500 h-2 rounded-full transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Upload Error */}
                        {uploadError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                                <AlertCircle size={16} />
                                {uploadError}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            {formData.images.map((img, idx) => (
                                <div
                                    key={idx}
                                    draggable={!selectMode}
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    onClick={selectMode ? () => toggleSelectImage(idx) : undefined}
                                    className={`aspect-square rounded-lg overflow-hidden bg-slate-100 relative group cursor-grab active:cursor-grabbing transition-all ${draggedIndex === idx ? 'opacity-50 scale-95' : ''
                                        } ${selectMode && selectedImages.has(idx) ? 'ring-2 ring-teal-500' : ''
                                        } ${selectMode ? 'cursor-pointer' : ''}`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />

                                    {/* Drag Handle */}
                                    {!selectMode && (
                                        <div className="absolute top-1 left-1 bg-black/40 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            <GripVertical size={12} />
                                        </div>
                                    )}

                                    {/* Select Checkbox */}
                                    {selectMode && (
                                        <div className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center ${selectedImages.has(idx) ? 'bg-teal-500 text-white' : 'bg-white border border-slate-300'
                                            }`}>
                                            {selectedImages.has(idx) && <Check size={12} />}
                                        </div>
                                    )}

                                    {/* Actions (not in select mode) */}
                                    {!selectMode && (
                                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {idx !== 0 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setAsCover(idx); }}
                                                    className="bg-amber-500 text-white p-1 rounded-md"
                                                    title="Set as cover"
                                                >
                                                    <Star size={12} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                                className="bg-red-500 text-white p-1 rounded-md"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Cover Badge */}
                                    {idx === 0 && (
                                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                                            <Star size={10} /> Cover
                                        </span>
                                    )}
                                </div>
                            ))}
                            {!selectMode && (
                                <button
                                    onClick={triggerFileInput}
                                    disabled={uploadProgress !== null}
                                    className="aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-teal-400 hover:text-teal-600 transition-all gap-1 disabled:opacity-50"
                                >
                                    <Upload size={20} />
                                    <span className="text-xs font-bold">Upload</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModule;
