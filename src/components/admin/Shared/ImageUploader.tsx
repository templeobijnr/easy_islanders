import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, MoveVertical } from 'lucide-react';
import { uploadImage, deleteImage, validateImageFile, UploadProgress } from '../../../services/infrastructure/storage/image-upload.service';

interface ImageUploaderProps {
    images?: string[];
    onImagesChange: (images: string[]) => void;
    storagePath: string;
    maxImages?: number;
    disabled?: boolean;
}

interface ImageUploadState {
    id: string;
    url?: string;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    error?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    images = [],
    onImagesChange,
    storagePath,
    maxImages = 21,
    disabled = false
}) => {
    const [uploadingImages, setUploadingImages] = useState<ImageUploadState[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || disabled) return;

        const remainingSlots = maxImages - images.length - uploadingImages.length;
        const filesToUpload = Array.from(files).slice(0, remainingSlots);

        for (const file of filesToUpload) {
            const validation = validateImageFile(file);
            if (!validation.valid) {
                alert(validation.error);
                return;
            }
        }

        // Use a local accumulator to avoid stale closures when uploading multiple images
        let nextImages = [...images];

        for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            const uploadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            setUploadingImages(prev => [...prev, {
                id: uploadId,
                progress: 0,
                status: 'uploading'
            }]);

            try {
                const url = await uploadImage(file, storagePath, (progress: UploadProgress) => {
                    setUploadingImages(prev => prev.map(upload =>
                        upload.id === uploadId
                            ? { ...upload, progress: progress.progress, status: progress.status, url: progress.url, error: progress.error }
                            : upload
                    ));
                });

                nextImages = [...nextImages, url];
                onImagesChange(nextImages);
                setUploadingImages(prev => prev.filter(upload => upload.id !== uploadId));
            } catch (error: unknown) {
                console.error('Upload failed:', error);
                setUploadingImages(prev => prev.map(upload =>
                    upload.id === uploadId
                        ? { ...upload, progress: 0, status: 'error', error: error.message || 'Upload failed' }
                        : upload
                ));
            }
        }
    };

    const handleDelete = async (index: number) => {
        if (disabled) return;
        const imageUrl = images[index];
        const confirmed = window.confirm('Are you sure you want to delete this image?');
        if (!confirmed) return;

        try {
            await deleteImage(imageUrl);
            onImagesChange(images.filter((_, i) => i !== index));
        } catch (error) {
            console.error('Delete failed:', error);
            alert('Failed to delete image. Please try again.');
        }
    };

    const handleDragStart = (index: number) => setDraggedIndex(index);

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        const newImages = [...images];
        const draggedImage = newImages[draggedIndex];
        newImages.splice(draggedIndex, 1);
        newImages.splice(index, 0, draggedImage);
        onImagesChange(newImages);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => setDraggedIndex(null);

    const handleDropZone = (e: React.DragEvent) => {
        e.preventDefault();
        handleFileSelect(e.dataTransfer.files);
    };

    const dismissError = (uploadId: string) => {
        setUploadingImages(prev => prev.filter(upload => upload.id !== uploadId));
    };

    const canAddMore = images.length + uploadingImages.length < maxImages;

    return (
        <div className="space-y-4">
            {canAddMore && !disabled && (
                <div
                    onDrop={handleDropZone}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500 transition-colors bg-slate-900/30"
                >
                    <Upload className="mx-auto mb-3 text-slate-500" size={32} />
                    <p className="text-sm text-slate-400 mb-1">
                        <span className="text-cyan-400 font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-600">
                        PNG, JPG, WebP up to 20MB ({images.length + uploadingImages.length}/{maxImages})
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                    />
                </div>
            )}

            {(images.length > 0 || uploadingImages.length > 0) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((url, index) => (
                        <div
                            key={url}
                            draggable={!disabled}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`relative group rounded-xl overflow-hidden border-2 ${draggedIndex === index ? 'border-cyan-500' : 'border-slate-800'} ${!disabled ? 'cursor-move' : ''}`}
                        >
                            <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                <img src={url} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {!disabled && (
                                    <>
                                        <button onClick={() => handleDelete(index)} className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors" title="Delete">
                                            <X size={16} className="text-white" />
                                        </button>
                                        <div className="text-white text-xs flex items-center gap-1">
                                            <MoveVertical size={14} />
                                            Drag to reorder
                                        </div>
                                    </>
                                )}
                            </div>
                            {index === 0 && (
                                <div className="absolute top-2 left-2 bg-cyan-500 text-black text-xs font-bold px-2 py-1 rounded">PRIMARY</div>
                            )}
                        </div>
                    ))}

                    {uploadingImages.map((upload) => {
                        if (!upload) return null;
                        return (
                            <div key={upload.id} className="relative rounded-xl overflow-hidden border-2 border-cyan-500">
                                <div className="aspect-video bg-slate-900 flex items-center justify-center">
                                    <div className="text-center">
                                        {upload.status === 'uploading' && (
                                            <>
                                                <Loader2 className="animate-spin mx-auto mb-2 text-cyan-400" size={24} />
                                                <p className="text-xs text-slate-400">{Math.round(upload.progress)}%</p>
                                            </>
                                        )}
                                        {upload.status === 'error' && (
                                            <>
                                                <X className="mx-auto mb-2 text-red-400" size={24} />
                                                <p className="text-xs text-red-400">{upload.error}</p>
                                                <button onClick={() => dismissError(upload.id)} className="mt-2 text-xs text-slate-400 hover:text-white">Dismiss</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {upload.status === 'uploading' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                                        <div className="h-full bg-cyan-500 transition-all" style={{ width: `${upload.progress}%` }} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {images.length === 0 && uploadingImages.length === 0 && (
                <div className="text-center py-8 border border-slate-800 rounded-xl bg-slate-900/30">
                    <ImageIcon className="mx-auto mb-3 text-slate-600" size={32} />
                    <p className="text-sm text-slate-500">No images uploaded yet</p>
                </div>
            )}
        </div>
    );
};

export default ImageUploader;
