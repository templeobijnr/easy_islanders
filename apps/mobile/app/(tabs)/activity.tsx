import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { getNotifications, markAsRead, type Notification } from '../../services/api/notificationsApi';
import { logger } from '../../utils/logger';

export default function ActivityScreen() {
    const [items, setItems] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        try {
            const resp = await getNotifications({ limit: 50 });
            setItems(resp.notifications);
        } catch (e) {
            logger.error('Failed to load notifications', e);
            setError('Failed to load notifications');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <View style={styles.container}>
            {error && <Text style={styles.errorBanner}>{error}</Text>}
            {items.length > 0 ? (
                <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => load(true)}
                        />
                    }
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={async () => {
                                try {
                                    await markAsRead(item.id);
                                    // Optimistic UI update: remove readAt null
                                    setItems((prev) =>
                                        prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n))
                                    );
                                } catch (e) {
                                    logger.error('Failed to mark notification as read', e);
                                }
                            }}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>
                                    {item.title || item.type}
                                </Text>
                                <View style={[styles.badge, item.readAt ? styles.badgeSuccess : styles.badgePending]}>
                                    <Text style={styles.badgeText}>{item.readAt ? 'READ' : 'UNREAD'}</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDate}>
                                {new Date(item.createdAt).toLocaleString()}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                        {loading ? 'Loading…' : 'No notifications'}
                    </Text>
                    <Text style={styles.emptySubText}>
                        {loading ? 'Fetching updates…' : 'You’re all caught up.'}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    errorBanner: {
        fontSize: 12,
        color: '#d32f2f',
        margin: 16,
        backgroundColor: '#ffebee',
        padding: 8,
        borderRadius: 4,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    cardDate: {
        fontSize: 14,
        color: '#666',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeSuccess: {
        backgroundColor: '#E8F5E9',
    },
    badgePending: {
        backgroundColor: '#FFF3E0',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#333',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
    },
});
