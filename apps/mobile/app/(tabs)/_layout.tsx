import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getUnreadCount } from '../../services/api/notificationsApi';
import { logger } from '../../utils/logger';

export default function TabLayout() {
    const { user, loading } = useAuth();
    const [unread, setUnread] = useState<number>(0);

    if (!loading && !user) {
        return <Redirect href="/(auth)/phone" />;
    }

    useEffect(() => {
        let cancelled = false;
        async function loadUnread() {
            if (!user) return;
            try {
                const count = await getUnreadCount();
                if (!cancelled) setUnread(count);
            } catch (e) {
                logger.error('Failed to load unread count', e);
            }
        }
        loadUnread();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    return (
        <Tabs
            screenOptions={{
                headerShown: true,
                tabBarActiveTintColor: '#007AFF',
            }}>
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbubble-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="connect"
                options={{
                    title: 'Connect',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list-outline" size={size} color={color} />
                    ),
                    tabBarBadge: unread > 0 ? unread : undefined,
                }}
            />
        </Tabs>
    );
}
