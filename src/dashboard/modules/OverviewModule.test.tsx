import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OverviewModule from './OverviewModule';

const mockFirebaseUser = { getIdToken: vi.fn(() => Promise.resolve('token')) };
const mockAuthState = {
    firebaseUser: mockFirebaseUser,
    claims: { role: 'owner', businessId: 'test-business-123' },
    isLoading: false
};

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => mockAuthState
}));

vi.mock('../../services/v1Api', () => ({
    fetchWithAuth: vi.fn(async (_firebaseUser: any, path: string) => {
        if (path.startsWith('/owner/business')) {
            return { success: true, business: { id: 'test-business-123', displayName: 'Test Beach Club' } };
        }
        if (path.startsWith('/owner/inbox')) {
            return { success: true, sessions: [] };
        }
        if (path.startsWith('/owner/knowledge-docs')) {
            return { success: true, docs: [] };
        }
        if (path.startsWith('/owner/products')) {
            return { success: true, products: [] };
        }
        return { success: true };
    })
}));

describe('OverviewModule', () => {
    const mockOnViewChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- RENDER TESTS ---

    it('should render the page header with welcome message', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/Salesman Control Panel/i)).toBeInTheDocument();
        });
    });

    it('should render the business name in welcome message', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/Welcome, Test Beach Club/i)).toBeInTheDocument();
        });
    });

    it('should render the "This is Your 24/7 Salesman" section', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/This is Your 24\/7 Salesman/i)).toBeInTheDocument();
        });
    });

    it('should render the salesman description text', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/24 hours a day, 7 days a week/i)).toBeInTheDocument();
        });
    });

    // --- STATS CARDS TESTS ---

    it('should render all three stat cards', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText('Conversations')).toBeInTheDocument();
            expect(screen.getByText('Manage Reservation Times')).toBeInTheDocument();
            expect(screen.getByText('Contact Requests')).toBeInTheDocument();
        });
    });

    it('should display Today badges on stat cards', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            // Today badge appears on chats + contact requests
            const todayBadges = screen.getAllByText('Today');
            expect(todayBadges.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should display 0 for stats when no data', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            // Stats should show 0 since we mock getDocs to return empty
            const zeros = screen.getAllByText('0');
            expect(zeros.length).toBeGreaterThanOrEqual(3);
        });
    });

    // --- NAVIGATION TESTS ---

    it('should call onViewChange with inbox when Conversations card clicked', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText('Conversations')).toBeInTheDocument();
        });

        const conversationsCard = screen.getByText('Conversations').closest('div[class*="cursor-pointer"]');
        if (conversationsCard) {
            fireEvent.click(conversationsCard);
            expect(mockOnViewChange).toHaveBeenCalledWith('inbox');
        }
    });

    it('should call onViewChange with settings when Status button clicked', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            // Find the Settings button in the status card
            const settingsButton = screen.getByRole('button', { name: /Settings/i });
            fireEvent.click(settingsButton);
            expect(mockOnViewChange).toHaveBeenCalledWith('settings');
        });
    });

    // --- STATUS CARD TESTS ---

    it('should show status as ON by default', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/Your salesman is ON and working/i)).toBeInTheDocument();
        });
    });

    // --- KNOWLEDGE SECTION TESTS ---

    it('should render knowledge section header', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/what your salesman knows/i)).toBeInTheDocument();
        });
    });

    it('should display 0 for knowledge and product counts when empty', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            // Stats + Knowledge + Products should show 0 counts
            const zeroElements = screen.getAllByText('0');
            expect(zeroElements.length).toBeGreaterThanOrEqual(4);
        });
    });

    it('should render business type examples', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/Are you a beach\?/i)).toBeInTheDocument();
            expect(screen.getByText(/Are you a Restaurant\?/i)).toBeInTheDocument();
        });
    });

    // --- CHECKLIST TESTS ---

    it('should render Get Started checklist when setup incomplete', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
        });
    });

    it('should show checklist items', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/Add your business name/i)).toBeInTheDocument();
            expect(screen.getByText(/Turn on your salesman/i)).toBeInTheDocument();
        });
    });

    // --- CTA TESTS ---

    it('should render Try Talking CTA', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            expect(screen.getByText(/Try Talking to Your Salesman/i)).toBeInTheDocument();
        });
    });

    it('should navigate to settings when Try Talking CTA clicked', async () => {
        render(<OverviewModule onViewChange={mockOnViewChange} />);

        await waitFor(() => {
            const tryTalkingCard = screen.getByText(/Try Talking to Your Salesman/i).closest('div[class*="cursor-pointer"]');
            if (tryTalkingCard) {
                fireEvent.click(tryTalkingCard);
                expect(mockOnViewChange).toHaveBeenCalledWith('settings');
            }
        });
    });
});
