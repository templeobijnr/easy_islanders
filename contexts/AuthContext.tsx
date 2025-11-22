
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { auth } from '../services/firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Load custom user data from localStorage
        const stored = localStorage.getItem('islander_auth_user');
        if (stored) {
          const customUser = JSON.parse(stored);
          setUser(customUser);
        } else {
          // If no custom data, create basic user
          const basicUser: User = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            type: 'personal' // default
          };
          setUser(basicUser);
          localStorage.setItem('islander_auth_user', JSON.stringify(basicUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem('islander_auth_user');
      }
    });

    return unsubscribe;
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('islander_auth_user', JSON.stringify(userData));
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('islander_auth_user');
    window.location.href = '/'; // Force reset view
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
