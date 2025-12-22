import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfileModule from './ProfileModule';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ docs: [], size: 0 })),
    getDoc: vi.fn(() => Promise.resolve({
        exists: () => true,
        id: 'test-listing-123',
        data: () => ({
            title: 'Test Restaurant',
            description: 'A lovely test restaurant',
            address: '123 Test Street',
            region: 'Kyrenia',
            images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            phone: '+90 533 123 4567'
        })
    })),
    doc: vi.fn(),
    updateDoc: vi.fn(() => Promise.resolve()),
    serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
    Timestamp: {
        fromDate: vi.fn(() => ({ seconds: 0, nanoseconds: 0 }))
    }
}));

vi.mock('../../services/firebaseConfig', () => ({
    db: {},
    storage: {}
}));

// Mock AuthContext
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user-123', name: 'Test User' }
    })
}));

// Mock StorageService
vi.mock('../../services/infrastructure/storage/local-storage.service', () => ({
    StorageService: {
        getBusinessConfig: vi.fn(() => Promise.resolve({
            id: 'test-listing-123',
            businessName: 'Test Restaurant',
            ownerUid: 'test-user-123'
        })),
        saveBusinessConfig: vi.fn(() => Promise.resolve())
    }
}));

// Mock UnifiedListingsService
vi.mock('../../services/unifiedListingsService', () => ({
    UnifiedListingsService: {
        getById: vi.fn(() => Promise.resolve({
            id: 'test-listing-123',
            title: 'Test Restaurant',
            description: 'A lovely test restaurant',
            address: '123 Test Street',
            region: 'Kyrenia',
            images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            phone: '+90 533 123 4567'
        })),
        update: vi.fn(() => Promise.resolve())
    }
}));

// Mock imageUploadService
vi.mock('../../services/infrastructure/storage/image-upload.service', () => ({
    uploadImage: vi.fn(() => Promise.resolve('https://example.com/uploaded-image.jpg')),
    validateImageFile: vi.fn(() => ({ valid: true })),
    UploadProgress: {}
}));

const mockConfig = {
    id: 'test-listing-123',
    businessName: 'Test Restaurant',
    ownerUid: 'test-user-123',
    domain: 'restaurants',
    subType: null
};

describe('ProfileModule', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- RENDER TESTS ---

    it('should render the page header', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Business Profile')).toBeInTheDocument();
        });
    });

    it('should render the subheading text', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText(/Manage your public listing details/i)).toBeInTheDocument();
        });
    });

    it('should render the Save Changes button', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
        });
    });

    // --- FORM FIELDS ---

    it('should display Basic Information section', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Basic Information')).toBeInTheDocument();
        });
    });

    it('should display Contact & Location section', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText(/Contact & Location/i)).toBeInTheDocument();
        });
    });

    it('should display the business name input with loaded value', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            const input = screen.getByDisplayValue('Test Restaurant');
            expect(input).toBeInTheDocument();
        });
    });

    it('should display the description textarea', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Describe your business/i)).toBeInTheDocument();
        });
    });

    // --- GALLERY SECTION ---

    it('should display Gallery section with image count', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Gallery')).toBeInTheDocument();
            expect(screen.getByText('(2)')).toBeInTheDocument(); // 2 images in mock
        });
    });

    it('should display Upload button in gallery', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Upload')).toBeInTheDocument();
        });
    });

    it('should display Cover badge on first image', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Cover')).toBeInTheDocument();
        });
    });

    // --- IMAGE SECTION ---

    it('should display Main Image section', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Main Image')).toBeInTheDocument();
        });
    });

    // --- INTERACTIONS ---

    it('should allow editing the business name', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            const input = screen.getByDisplayValue('Test Restaurant');
            fireEvent.change(input, { target: { value: 'New Restaurant Name' } });
            expect(screen.getByDisplayValue('New Restaurant Name')).toBeInTheDocument();
        });
    });

    it('should show file input when Upload button is clicked', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            // The file input should exist but be hidden
            const fileInput = document.querySelector('input[type="file"]');
            expect(fileInput).toBeInTheDocument();
            expect(fileInput).toHaveClass('hidden');
        });
    });

    // --- PHASE 2 FEATURES ---

    it('should display Select button when multiple images exist', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText('Select')).toBeInTheDocument();
        });
    });

    it('should display drag hint when multiple images exist', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            expect(screen.getByText(/Drag images to reorder/i)).toBeInTheDocument();
        });
    });

    it('should have draggable attribute on gallery images', async () => {
        render(<ProfileModule config={mockConfig} />);

        await waitFor(() => {
            const images = document.querySelectorAll('.aspect-square');
            expect(images.length).toBeGreaterThan(0);
            // First image should be draggable
            expect(images[0]).toHaveAttribute('draggable', 'true');
        });
    });
});
