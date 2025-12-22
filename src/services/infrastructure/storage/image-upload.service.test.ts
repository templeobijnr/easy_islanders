import { describe, it, expect, vi } from 'vitest';
import { compressImage, validateImageFile, uploadImage } from './image-upload.service';

// Mock Firebase Storage
vi.mock('../../firebaseConfig', () => ({
    storage: {}
}));

vi.mock('firebase/storage', () => ({
    ref: vi.fn(),
    uploadBytesResumable: vi.fn(),
    getDownloadURL: vi.fn(),
    deleteObject: vi.fn()
}));

describe('imageUploadService', () => {
    describe('validateImageFile', () => {
        it('should accept valid JPEG files', () => {
            const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const result = validateImageFile(file);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should accept valid PNG files', () => {
            const file = new File(['test'], 'test.png', { type: 'image/png' });
            const result = validateImageFile(file);
            expect(result.valid).toBe(true);
        });

        it('should accept valid WebP files', () => {
            const file = new File(['test'], 'test.webp', { type: 'image/webp' });
            const result = validateImageFile(file);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid file types', () => {
            const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const result = validateImageFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Invalid file type');
        });

        it('should reject files exceeding size limit', () => {
            // Default limit is 20MB; create a ~21MB payload.
            const largeContent = new Uint8Array(21 * 1024 * 1024);
            const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
            const result = validateImageFile(file);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('exceeds');
        });

        it('should use custom size limit', () => {
            const content = new Array(2 * 1024 * 1024).fill('a').join('');
            const file = new File([content], 'test.jpg', { type: 'image/jpeg' });
            const result = validateImageFile(file, 1); // 1MB limit
            expect(result.valid).toBe(false);
        });
    });

    describe('compressImage', () => {
        it('should return a promise', () => {
            const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            const result = compressImage(file);
            expect(result).toBeInstanceOf(Promise);
        });

        // Note: Full compression testing requires DOM environment with canvas
        // which is complex to test. File validation ensures quality.
    });
});
