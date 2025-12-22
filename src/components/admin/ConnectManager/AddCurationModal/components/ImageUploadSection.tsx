/**
 * ImageUploadSection - Image upload grid with progress
 */
import React, { RefObject } from "react";
import { Upload, Trash2, Loader2 } from "lucide-react";

interface UploadingImage {
    file: File;
    progress: number;
}

interface ImageUploadSectionProps {
    uploadedImages: string[];
    uploadingImages: UploadingImage[];
    fileInputRef: RefObject<HTMLInputElement>;
    onImageUpload: (files: FileList) => void;
    onRemoveImage: (index: number) => void;
}

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
    uploadedImages,
    uploadingImages,
    fileInputRef,
    onImageUpload,
    onRemoveImage,
}) => {
    return (
        <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                Event Images
            </label>
            <div className="flex flex-wrap gap-3">
                {/* Uploaded Images */}
                {uploadedImages.map((url, i) => (
                    <div
                        key={i}
                        className="relative w-24 h-24 rounded-xl overflow-hidden group"
                    >
                        <img src={url} className="w-full h-full object-cover" />
                        <button
                            onClick={() => onRemoveImage(i)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                        >
                            <Trash2 size={20} className="text-red-400" />
                        </button>
                    </div>
                ))}

                {/* Uploading Images */}
                {uploadingImages.map((item, i) => (
                    <div
                        key={i}
                        className="w-24 h-24 rounded-xl bg-slate-800 flex items-center justify-center"
                    >
                        <div className="text-center">
                            <Loader2
                                size={20}
                                className="animate-spin text-purple-400 mx-auto"
                            />
                            <div className="text-xs text-slate-400 mt-1">
                                {Math.round(item.progress)}%
                            </div>
                        </div>
                    </div>
                ))}

                {/* Upload Button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center hover:border-purple-500 hover:bg-purple-500/10 transition-all"
                >
                    <Upload size={24} className="text-slate-400" />
                    <span className="text-xs text-slate-400 mt-1">Upload</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && onImageUpload(e.target.files)}
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default ImageUploadSection;
