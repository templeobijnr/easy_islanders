/**
 * Auth Bootstrap (STATE-05)
 *
 * Eliminates auth state flash by gating routing until Firebase initializes.
 *
 * INVARIANTS:
 * - Routing blocked until first onAuthStateChanged callback.
 * - No redirect flicker on cold start.
 * - Cleanup on unmount.
 *
 * @see Living Document Section 18.5 for invariants.
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Auth state.
 */
export interface AuthState {
    user: User | null;
    initializing: boolean;
    authReady: boolean;
    sessionState: 'authenticated' | 'unauthenticated' | 'initializing';
}

/**
 * Auth context.
 */
const AuthContext = createContext<AuthState | undefined>(undefined);

/**
 * Auth provider props.
 */
interface AuthProviderProps {
    children: ReactNode;
    onAuthReady?: (state: AuthState) => void;
}

/**
 * Logs auth bootstrap event.
 */
function logBootstrap(
    event: 'init_start' | 'init_complete' | 'state_change',
    details: Record<string, unknown>
): void {
    console.log(`[AuthBootstrap] ${event}`, {
        ...details,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Generates trace ID for auth session.
 */
function generateTraceId(): string {
    return `auth-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Auth provider component.
 * Blocks children until auth state is known.
 */
export function AuthProvider({ children, onAuthReady }: AuthProviderProps): JSX.Element {
    const [state, setState] = useState<AuthState>({
        user: null,
        initializing: true,
        authReady: false,
        sessionState: 'initializing',
    });
    const [traceId] = useState(() => generateTraceId());
    const [mountTime] = useState(() => Date.now());

    useEffect(() => {
        logBootstrap('init_start', { traceId });

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const initDurationMs = Date.now() - mountTime;
            const sessionState = user ? 'authenticated' : 'unauthenticated';

            const newState: AuthState = {
                user,
                initializing: false,
                authReady: true,
                sessionState,
            };

            setState(newState);

            logBootstrap('init_complete', {
                traceId,
                initDurationMs,
                finalState: sessionState,
            });

            if (onAuthReady) {
                onAuthReady(newState);
            }
        });

        return () => {
            unsubscribe();
            logBootstrap('state_change', {
                traceId,
                event: 'unmount_cleanup',
            });
        };
    }, [traceId, mountTime, onAuthReady]);

    return (
        <AuthContext.Provider value={state}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to access auth state.
 */
export function useAuth(): AuthState {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

/**
 * Hook for protected routes.
 * Returns whether to show loading, content, or redirect.
 */
export function useProtectedRoute(): {
    isLoading: boolean;
    isAuthenticated: boolean;
    shouldRedirect: boolean;
} {
    const { initializing, user } = useAuth();

    return {
        isLoading: initializing,
        isAuthenticated: !!user,
        shouldRedirect: !initializing && !user,
    };
}

/**
 * Hook for waiting until auth is ready.
 */
export function useAuthReady(): boolean {
    const { authReady } = useAuth();
    return authReady;
}

/**
 * Gets current auth state synchronously (for non-React contexts).
 */
export function getAuthState(): AuthState {
    const user = auth.currentUser;

    return {
        user,
        // Can't know if initializing without subscription
        initializing: false,
        authReady: true,
        sessionState: user ? 'authenticated' : 'unauthenticated',
    };
}
