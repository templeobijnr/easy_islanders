/**
 * Discover Screen - "Near Me" Location-Based Discovery
 * 
 * Shows listings sorted by distance from user's current location.
 */
import { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
    getCurrentLocation,
    calculateDistance,
    formatDistance,
    Coordinates,
} from '../../services/locationService';
import { logger } from '../../utils/logger';

// Mock data - Replace with API call when backend ready
const MOCK_LISTINGS = [
    {
        id: '1',
        title: 'Bellapais Abbey',
        category: 'Tourism',
        lat: 35.3,
        lng: 33.35,
        description: 'Historic 12th-century monastery with stunning views',
        image: 'https://via.placeholder.com/300x200',
    },
    {
        id: '2',
        title: 'Kyrenia Harbor',
        category: 'Tourism',
        lat: 35.34,
        lng: 33.32,
        description: 'Scenic Mediterranean harbor with restaurants',
        image: 'https://via.placeholder.com/300x200',
    },
    {
        id: '3',
        title: 'St. Hilarion Castle',
        category: 'Tourism',
        lat: 35.31,
        lng: 33.28,
        description: 'Medieval castle perched on mountain peaks',
        image: 'https://via.placeholder.com/300x200',
    },
    {
        id: '4',
        title: 'Palm Beach',
        category: 'Beach',
        lat: 35.19,
        lng: 33.83,
        description: 'Beautiful sandy beach in Famagusta',
        image: 'https://via.placeholder.com/300x200',
    },
    {
        id: '5',
        title: 'Salamis Ruins',
        category: 'History',
        lat: 35.18,
        lng: 33.9,
        description: 'Ancient Greco-Roman ruins near Famagusta',
        image: 'https://via.placeholder.com/300x200',
    },
];

interface ListingWithDistance {
    id: string;
    title: string;
    category: string;
    lat: number;
    lng: number;
    description: string;
    image: string;
    distance?: number;
}

export default function DiscoverScreen() {
    const [location, setLocation] = useState<Coordinates | null>(null);
    const [listings, setListings] = useState<ListingWithDistance[]>(MOCK_LISTINGS);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadNearbyListings = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const coords = await getCurrentLocation();

            if (!coords) {
                setError('Location permission required for "Near Me"');
                // Still show listings, just without distances
                setListings(MOCK_LISTINGS);
                return;
            }

            setLocation(coords);
            logger.log('User location:', coords);

            // Calculate distances and sort
            const listingsWithDistance = MOCK_LISTINGS.map((listing) => ({
                ...listing,
                distance: calculateDistance(coords, {
                    latitude: listing.lat,
                    longitude: listing.lng,
                }),
            })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

            setListings(listingsWithDistance);

            // TODO: Replace with actual API call
            // const response = await fetch(
            //   `${API_URL}/v1/listings/nearby?lat=${coords.latitude}&lng=${coords.longitude}&radius=50`
            // );
            // const data = await response.json();
            // setListings(data.listings);
        } catch (err) {
            logger.error('Failed to load nearby listings', err);
            setError('Failed to load nearby places');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadNearbyListings();
    }, [loadNearbyListings]);

    const handleListingPress = (listingId: string) => {
        router.push(`/listing/${listingId}`);
    };

    const renderListingCard = ({ item }: { item: ListingWithDistance }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => handleListingPress(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                </View>
                <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                </Text>
                {item.distance !== undefined && (
                    <View style={styles.distanceRow}>
                        <Text style={styles.distanceIcon}>📍</Text>
                        <Text style={styles.distanceText}>
                            {formatDistance(item.distance)} away
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    if (loading && !location) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Finding your location...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Near You</Text>
                {location && (
                    <Text style={styles.subtitle}>
                        📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Text>
                )}
                {error && <Text style={styles.errorBanner}>{error}</Text>}
            </View>

            <FlatList
                data={listings}
                keyExtractor={(item) => item.id}
                renderItem={renderListingCard}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadNearbyListings(true)}
                        colors={['#007AFF']}
                        tintColor="#007AFF"
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No places found nearby</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => loadNearbyListings()}
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    subtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    errorBanner: {
        fontSize: 12,
        color: '#d32f2f',
        marginTop: 8,
        backgroundColor: '#ffebee',
        padding: 8,
        borderRadius: 4,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        flex: 1,
    },
    categoryBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    categoryText: {
        fontSize: 12,
        color: '#1976d2',
        fontWeight: '500',
    },
    cardDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 8,
    },
    distanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    distanceIcon: {
        fontSize: 14,
        marginRight: 4,
    },
    distanceText: {
        fontSize: 13,
        color: '#888',
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
