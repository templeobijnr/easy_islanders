import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { SecureStoreAdapter } from '../utils/storage';
import { HttpClient, LocalStorageAdapter } from '@askmerve/api-client';

// Define User type matching web context (or shared if available, but web defined it locally)
export interface User {
    id: string;
    name: string;
    email: string;
    type: 'personal' | 'business';
    phoneNumber?: string;
}

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseAuthTypes.User | null;
    loading: boolean;
    signInWithPhone: (phoneNumber: string) => Promise<FirebaseAuthTypes.ConfirmationResult>;
    confirmCode: (code: string) => Promise<void>;
    signOutData: () => Promise<void>;
    getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [loading, setLoading] = useState(true);

    // Handle user state changes
    function onAuthStateChanged(authUser: FirebaseAuthTypes.User | null) {
        setFirebaseUser(authUser);

        if (authUser) {
            // Construct basic user profile 
            // Note: In a real app we might fetch more profile data from backend
            setUser({
                id: authUser.uid,
                name: authUser.displayName || 'User',
                email: authUser.email || '',
                phoneNumber: authUser.phoneNumber || '',
                type: 'personal', // Default
            });
        } else {
            setUser(null);
        }

        if (loading) setLoading(false);
    }

    const [confirmationResult, setConfirmationResult] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

    useEffect(() => {
        const subscriber = auth().onAuthStateChanged((user) => {
            onAuthStateChanged(user);
            if (user) setConfirmationResult(null);
        });
        return subscriber; // unsubscribe on unmount
    }, []);

    const signInWithPhone = async (phoneNumber: string): Promise<FirebaseAuthTypes.ConfirmationResult> => {
        const result = await auth().signInWithPhoneNumber(phoneNumber);
        setConfirmationResult(result);
        return result;
    };

    const confirmCode = async (code: string): Promise<void> => {
        if (!confirmationResult) throw new Error('No confirmation result found');
        await confirmationResult.confirm(code);
    };

    const signOutData = async () => {
        await auth().signOut();
    };

    const getToken = async (): Promise<string | null> => {
        if (!firebaseUser) return null;
        return firebaseUser.getIdToken();
    };

    return (
        <AuthContext.Provider value={{
            user,
            firebaseUser,
            loading,
            signInWithPhone,
            confirmCode,
            signOutData,
            getToken,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
