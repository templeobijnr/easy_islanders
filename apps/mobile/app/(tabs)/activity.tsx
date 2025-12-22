import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

const MOCK_JOBS = [
    { id: '101', title: 'Taxi to Girne', status: 'confirmed', date: 'Today, 2:00 PM' },
    { id: '102', title: 'Dinner Reservation', status: 'pending', date: 'Tomorrow, 8:00 PM' },
];

export default function ActivityScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            {MOCK_JOBS.length > 0 ? (
                <FlatList
                    data={MOCK_JOBS}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push(`/job/${item.id}`)}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                <View style={[styles.badge, item.status === 'confirmed' ? styles.badgeSuccess : styles.badgePending]}>
                                    <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
                                </View>
                            </View>
                            <Text style={styles.cardDate}>{item.date}</Text>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No active orders</Text>
                    <Text style={styles.emptySubText}>Start a chat to create a new request</Text>
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
