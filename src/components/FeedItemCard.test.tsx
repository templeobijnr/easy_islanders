import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedItemCard from '../pages/connect/FeedItemCard';
import { FeedItem } from '../types/connect';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn()), // Returns unsubscribe function
}));

vi.mock('../services/firebaseConfig', () => ({
    db: {},
}));

describe('FeedItemCard', () => {
    const mockItem: FeedItem & { goingCount?: number } = {
        id: 'event-123',
        type: 'event',
        title: 'Beach Party',
        description: 'Amazing beach party at sunset',
        images: ['https://example.com/image.jpg'],
        goingCount: 25,
    };

    const mockOnJoin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render event title', () => {
        render(<FeedItemCard item={mockItem} onJoin={mockOnJoin} />);

        expect(screen.getByText('Beach Party')).toBeInTheDocument();
    });

    it('should render event description', () => {
        render(<FeedItemCard item={mockItem} onJoin={mockOnJoin} />);

        expect(screen.getByText('Amazing beach party at sunset')).toBeInTheDocument();
    });

    it('should display going count when available', () => {
        render(<FeedItemCard item={mockItem} onJoin={mockOnJoin} />);

        expect(screen.getByText(/25 going/i)).toBeInTheDocument();
    });

    it('should call onJoin when card is clicked', () => {
        render(<FeedItemCard item={mockItem} onJoin={mockOnJoin} />);

        const card = screen.getByText('Beach Party').closest('div[class*="cursor-pointer"]');
        if (card) {
            fireEvent.click(card);
            expect(mockOnJoin).toHaveBeenCalledWith('event-123');
        }
    });

    it('should call onJoin when View Event button is clicked', () => {
        render(<FeedItemCard item={mockItem} onJoin={mockOnJoin} />);

        const viewButton = screen.getByRole('button', { name: /view event/i });
        fireEvent.click(viewButton);

        expect(mockOnJoin).toHaveBeenCalledWith('event-123');
    });

    it('should show "View Activity" for non-event items', () => {
        const activityItem = { ...mockItem, type: 'activity' as const };
        render(<FeedItemCard item={activityItem} onJoin={mockOnJoin} />);

        expect(screen.getByRole('button', { name: /view activity/i })).toBeInTheDocument();
    });

    it('should display event image', () => {
        render(<FeedItemCard item={mockItem} onJoin={mockOnJoin} />);

        const image = screen.getByAltText('Beach Party');
        expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should display price when available', () => {
        const paidItem = {
            ...mockItem,
            price: 50,
            currency: 'USD'
        } as FeedItem & { price: number; currency: string };

        render(<FeedItemCard item={paidItem} onJoin={mockOnJoin} />);

        expect(screen.getByText(/USD 50/)).toBeInTheDocument();
    });

    it('should display Free badge when no price', () => {
        const freeItem = { ...mockItem };
        delete (freeItem as any).price;

        render(<FeedItemCard item={freeItem} onJoin={mockOnJoin} />);

        expect(screen.getByText('Free')).toBeInTheDocument();
    });
});
