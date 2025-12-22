import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthContext, User } from '../context/AuthContext';

// Mock user for testing
export const mockUser: User = {
    id: 'test-user-id',
    uid: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    displayName: 'Test User',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test',
    role: 'user',
};

// Mock auth context value
const mockAuthContextValue = {
    user: null as User | null,
    loading: false,
    signIn: async () => { },
    signUp: async () => { },
    signOut: async () => { },
    resetPassword: async () => { },
};

interface AllProvidersProps {
    children: React.ReactNode;
    user?: User | null;
}

// Wrapper component that provides all necessary context providers
const AllProviders: React.FC<AllProvidersProps> = ({ children, user = null }) => {
    return (
        <BrowserRouter>
            <AuthContext.Provider value={{ ...mockAuthContextValue, user }}>
                <LanguageProvider>
                    {children}
                </LanguageProvider>
            </AuthContext.Provider>
        </BrowserRouter>
    );
};

// Custom render function that wraps components in providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    user?: User | null;
}

export function renderWithProviders(
    ui: ReactElement,
    options: CustomRenderOptions = {}
) {
    const { user = null, ...renderOptions } = options;

    return render(ui, {
        wrapper: ({ children }) => (
            <AllProviders user={user}>{children}</AllProviders>
        ),
        ...renderOptions,
    });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Helper to wait for async operations
export const waitForAsync = (ms: number = 100) =>
    new Promise(resolve => setTimeout(resolve, ms));

// Mock Firestore document
export const mockFirestoreDoc = (data: Record<string, any>, id: string = 'test-id') => ({
    id,
    data: () => data,
    exists: () => true,
});

// Mock Firestore query snapshot
export const mockFirestoreSnapshot = (docs: Array<{ id: string; data: Record<string, any> }>) => ({
    docs: docs.map(doc => mockFirestoreDoc(doc.data, doc.id)),
    empty: docs.length === 0,
    size: docs.length,
});
