/**
 * Infrastructure Service: Image Upload
 *
 * Responsibility:
 * - Client-side image compression
 * - Upload images to Firebase Storage
 * - Progress tracking for uploads
 * - Image validation and deletion
 *
 * Firestore Collections:
 * - None (writes to Firebase Storage only)
 *
 * Layer: Infrastructure Service
 *
 * Dependencies:
 * - firebaseConfig (for storage)
 *
 * Notes:
 * - Used by forms for image uploads
 * - Safe to modify in isolation
 *
 * Stability: Core
 */

import { storage } from '../../firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

export interface UploadProgress {
    progress: number; // 0-100
    status: 'uploading' | 'completed' | 'error';
    url?: string;
    error?: string;
}

/**
 * Compress image on client-side before upload
 * @param file - Original image file
 * @param maxWidth - Maximum width (default 1920)
 * @param maxHeight - Maximum height (default 1080)
 * @param quality - JPEG quality 0-1 (default 0.8)
 */
export const compressImage = (
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to compress image'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
    });
};

/**
 * Upload image to Firebase Storage
 * @param file - Image file to upload
 * @param path - Storage path (e.g., 'pins/places/pin-id')
 * @param onProgress - Progress callback
 */
export const uploadImage = (
    file: File,
    path: string,
    onProgress?: (progress: UploadProgress) => void
): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        try {
            // Compress image before upload
            const compressedBlob = await compressImage(file);

            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${timestamp}_${sanitizedName}`;
            const storageRef = ref(storage, `${path}/${fileName}`);

            // Upload with progress tracking
            const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress?.({
                        progress,
                        status: 'uploading'
                    });
                },
                (error) => {
                    console.error('Upload error:', error);
                    onProgress?.({
                        progress: 0,
                        status: 'error',
                        error: error.message
                    });
                    reject(error);
                },
                async () => {
                    // Upload completed successfully, get download URL
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        onProgress?.({
                            progress: 100,
                            status: 'completed',
                            url: downloadURL
                        });
                        resolve(downloadURL);
                    } catch (error: unknown) {
                        reject(error);
                    }
                }
            );
        } catch (error: unknown) {
            reject(error);
        }
    });
};

/**
 * Upload multiple images
 * @param files - Array of image files
 * @param path - Storage path
 * @param onProgress - Progress callback for each file
 */
export const uploadMultipleImages = async (
    files: File[],
    path: string,
    onProgress?: (index: number, progress: UploadProgress) => void
): Promise<string[]> => {
    const uploadPromises = files.map((file, index) =>
        uploadImage(file, path, (progress) => onProgress?.(index, progress))
    );

    return Promise.all(uploadPromises);
};

/**
 * Delete image from Firebase Storage
 * @param imageUrl - Full download URL of the image
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
    try {
        // Extract storage path from download URL
        const url = new URL(imageUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

        if (!pathMatch) {
            throw new Error('Invalid image URL');
        }

        const path = decodeURIComponent(pathMatch[1]);
        const imageRef = ref(storage, path);

        await deleteObject(imageRef);
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
};

/**
 * Validate image file
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 20)
 */
export const validateImageFile = (file: File, maxSizeMB: number = 20): { valid: boolean; error?: string } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: 'Invalid file type. Please upload JPEG, PNG, or WebP images.'
        };
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `File size exceeds ${maxSizeMB}MB limit.`
        };
    }

    return { valid: true };
};

/**
 * Generate thumbnail URL from storage URL
 * (Future: Can be integrated with Cloud Functions for automatic thumbnail generation)
 */
export const getThumbnailUrl = (imageUrl: string): string => {
    // For now, return the same URL
    // TODO: Integrate with Cloud Function that generates thumbnails
    return imageUrl;
};
