
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { User } from '../types';
import { auth, rtdb } from '../services/firebaseConfig';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { ref, onValue, off } from 'firebase/database';
import { logger } from '../utils/logger';

/**
 * Custom Claims structure from Firebase Auth token
 */
export interface AuthClaims {
  admin?: boolean;
  role?: string;
  businessId?: string;
  accessLevel?: number;
}

/**
 * Unified Auth Context - Single source of truth for all authentication state
 * Admin, Business, and Consumer flows all use this context.
 * Authorization is determined by Custom Claims, NOT localStorage.
 */
interface AuthContextType {
  // User data
  user: User | null;
  firebaseUser: FirebaseUser | null;
  claims: AuthClaims | null;

  // Authorization flags (derived from claims - NOT localStorage)
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBusiness: boolean;

  // Loading state (prevents premature redirects)
  isLoading: boolean;

  // Actions
  login: (userData: User) => void;
  logout: () => Promise<void>;
  forceRefreshToken: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Force refresh the ID token and update claims
   */
  const forceRefreshToken = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      const tokenResult = await auth.currentUser.getIdTokenResult(true);
      const newClaims: AuthClaims = {
        admin: tokenResult.claims.admin as boolean | undefined,
        role: tokenResult.claims.role as string | undefined,
        businessId: tokenResult.claims.businessId as string | undefined,
        accessLevel: tokenResult.claims.accessLevel as number | undefined,
      };
      setClaims(newClaims);
      logger.debug('[AuthContext] Token refreshed', {
        hasAdminClaim: newClaims.admin === true,
        hasRoleClaim: !!newClaims.role,
        hasBusinessIdClaim: !!newClaims.businessId,
      });
    } catch (error) {
      logger.error('[AuthContext] Failed to refresh token', { message: (error as any)?.message });
    }
  }, []);

  /**
   * Main auth state listener
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        try {
          // Force refresh token to get latest custom claims
          const tokenResult = await fbUser.getIdTokenResult(true);
          const newClaims: AuthClaims = {
            admin: tokenResult.claims.admin as boolean | undefined,
            role: tokenResult.claims.role as string | undefined,
            businessId: tokenResult.claims.businessId as string | undefined,
            accessLevel: tokenResult.claims.accessLevel as number | undefined,
          };
          setClaims(newClaims);
          logger.debug('[AuthContext] Auth state changed', {
            hasAdminClaim: newClaims.admin === true,
            hasRoleClaim: !!newClaims.role,
            hasBusinessIdClaim: !!newClaims.businessId,
          });

          // Build user object from Firebase + claims
          const userData: User = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            type: newClaims.role === 'business' || newClaims.role === 'owner' ? 'business' : 'personal',
          };
          setUser(userData);

          // Store in localStorage for UI convenience only (NOT for authorization)
          localStorage.setItem('islander_auth_user', JSON.stringify(userData));
        } catch (error) {
          logger.error('[AuthContext] Failed to get token on auth change', { message: (error as any)?.message });
          setClaims(null);
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        setClaims(null);
        localStorage.removeItem('islander_auth_user');
        localStorage.removeItem('islander_admin_user'); // Clean up legacy admin storage
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Listen to Realtime Database for token refresh signals
   * When the backend updates claims, it writes to metadata/{uid} to signal the client
   */
  useEffect(() => {
    if (!firebaseUser) return;
    if (!rtdb) return;

    const metadataRef = ref(rtdb, `metadata/${firebaseUser.uid}`);

    const handleMetadataChange = async (snapshot: any) => {
      if (snapshot.exists()) {
        logger.debug('[AuthContext] Metadata changed, refreshing token');
        await forceRefreshToken();
      }
    };

    onValue(metadataRef, handleMetadataChange);

    return () => {
      off(metadataRef, 'value', handleMetadataChange);
    };
  }, [firebaseUser, forceRefreshToken]);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('islander_auth_user', JSON.stringify(userData));
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setClaims(null);
    localStorage.removeItem('islander_auth_user');
    localStorage.removeItem('islander_admin_user');
  };

  // Derived authorization flags from claims (NOT localStorage)
  const isAuthenticated = !!firebaseUser && !isLoading;
  const isAdmin = claims?.admin === true;
  const isBusiness = claims?.role === 'owner' || claims?.role === 'business' || isAdmin;

  const value: AuthContextType = {
    user,
    firebaseUser,
    claims,
    isAuthenticated,
    isAdmin,
    isBusiness,
    isLoading,
    login,
    logout,
    forceRefreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
