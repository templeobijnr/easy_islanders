import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

const InitialLayout = () => {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            // Redirect to the sign-in page.
            router.replace('/(auth)/phone');
        } else if (user && inAuthGroup) {
            // Redirect away from the sign-in page.
            router.replace('/(tabs)/discover');
        }
    }, [user, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return <Slot />;
};

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <InitialLayout />
            </AuthProvider>
        </ErrorBoundary>
    );
}
