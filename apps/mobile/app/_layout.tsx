import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';
import { registerForPushNotifications } from '../services/notificationService';
import { registerPushToken } from '../services/api/notificationsApi';

const InitialLayout = () => {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();
    const didRegisterKey = user?.id ? `push-registered:${user.id}` : null;

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

    useEffect(() => {
        let cancelled = false;
        async function register() {
            if (!user) return;
            if (!didRegisterKey) return;

            // Prevent repeated registration within the same session
            // (Fast, minimal; persistent dedupe can be added later if needed).
            if ((globalThis as any)[didRegisterKey]) return;
            (globalThis as any)[didRegisterKey] = true;

            try {
                const token = await registerForPushNotifications();
                if (!token) return;
                const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
                await registerPushToken(token, platform);
            } catch {
                // Fail-closed: push is optional; do not block app usage.
            }
        }
        register();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

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
