import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LiveVenueCard from '../pages/connect/LiveVenueCard';
import { LiveVenue } from '../types/connect';

describe('LiveVenueCard', () => {
    const mockVenue: LiveVenue = {
        listingId: 'venue-123',
        title: 'Beach Bar',
        category: 'bars',
        region: 'kyrenia',
        address: '123 Beach Road',
        checkInCount: 12,
        recentAvatars: [
            'https://example.com/avatar1.jpg',
            'https://example.com/avatar2.jpg',
            'https://example.com/avatar3.jpg',
        ],
        recentNames: ['John', 'Jane', 'Bob'],
        images: ['https://example.com/venue.jpg'],
        coordinates: { lat: 35.35, lng: 33.95 },
    };

    const mockOnCheckIn = vi.fn();
    const mockOnViewOnMap = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render venue title', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        expect(screen.getByText('Beach Bar')).toBeInTheDocument();
    });

    it('should display LIVE badge', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('should display check-in count', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display address', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        expect(screen.getByText('123 Beach Road')).toBeInTheDocument();
    });

    it('should call onCheckIn when Check In button is clicked', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        const checkInButton = screen.getByRole('button', { name: /check in/i });
        fireEvent.click(checkInButton);

        expect(mockOnCheckIn).toHaveBeenCalledWith('venue-123');
    });

    it('should show "Checked In" when isCheckedIn is true', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
                isCheckedIn={true}
            />
        );

        expect(screen.getByText('Checked In')).toBeInTheDocument();
    });

    it('should disable check-in button when already checked in', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
                isCheckedIn={true}
            />
        );

        const checkInButton = screen.getByRole('button', { name: /checked in/i });
        expect(checkInButton).toBeDisabled();
    });

    it('should render avatar stack', () => {
        const { container } = render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        // Avatars are in a flex container with -space-x-2 class
        const avatarImages = container.querySelectorAll('img.rounded-full');
        expect(avatarImages.length).toBeGreaterThanOrEqual(3);
    });

    it('should display "+N more" for extra check-ins', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        // 12 check-ins, showing 3 avatars, so +9 more
        expect(screen.getByText('+9')).toBeInTheDocument();
    });

    it('should call onViewOnMap with coordinates when navigation clicked', () => {
        render(
            <LiveVenueCard
                venue={mockVenue}
                onCheckIn={mockOnCheckIn}
                onViewOnMap={mockOnViewOnMap}
            />
        );

        // Get the navigation button (second button)
        const buttons = screen.getAllByRole('button');
        const navButton = buttons[1]; // Navigation is second button
        fireEvent.click(navButton);

        expect(mockOnViewOnMap).toHaveBeenCalledWith('venue-123', { lat: 35.35, lng: 33.95 });
    });
});
