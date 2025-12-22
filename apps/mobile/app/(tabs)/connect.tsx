/**
 * Connect Screen - Map & Feed View
 * 
 * Interactive map showing nearby listings and community feed.
 */
import { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { getCurrentLocation, Coordinates } from '../../services/locationService';
import { logger } from '../../utils/logger';
// Import platform-specific MapView (uses .web.tsx on web, .native.tsx on native)
import MapView from '../../components/Map/MapView';
import type { MapRegion } from '../../components/Map';

// North Cyprus default region
const NORTH_CYPRUS_REGION: MapRegion = {
    latitude: 35.1856,
    longitude: 33.3823,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
};

// Mock markers - Replace with API data
const MOCK_MARKERS = [
    {
        id: '1',
        title: 'Kyrenia Castle',
        category: 'Tourism',
        coordinate: { latitude: 35.3413, longitude: 33.3192 },
    },
    {
        id: '2',
        title: 'Bellapais Abbey',
        category: 'History',
        coordinate: { latitude: 35.3, longitude: 33.35 },
    },
    {
        id: '3',
        title: 'St. Hilarion Castle',
        category: 'Tourism',
        coordinate: { latitude: 35.31, longitude: 33.28 },
    },
    {
        id: '4',
        title: 'Palm Beach',
        category: 'Beach',
        coordinate: { latitude: 35.19, longitude: 33.83 },
    },
    {
        id: '5',
        title: 'Salamis Ruins',
        category: 'History',
        coordinate: { latitude: 35.18, longitude: 33.9 },
    },
];

// Mock feed items
const MOCK_FEED = [
    { id: '1', type: 'event', title: 'Beach Cleanup', location: 'Palm Beach', time: 'Today, 3 PM' },
    { id: '2', type: 'activity', title: 'Hiking Group', location: 'St. Hilarion', time: 'Tomorrow, 9 AM' },
    { id: '3', type: 'event', title: 'Food Festival', location: 'Kyrenia Harbor', time: 'This Weekend' },
];

type ViewMode = 'map' | 'feed';

export default function ConnectScreen() {
    const [viewMode, setViewMode] = useState<ViewMode>('map');
    const [region, setRegion] = useState<MapRegion>(NORTH_CYPRUS_REGION);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<any>(null);

    const isMapView = viewMode === 'map';
    const isFeedView = viewMode === 'feed';

    useEffect(() => {
        loadUserLocation();
    }, []);

    async function loadUserLocation() {
        setLoading(true);
        try {
            const location = await getCurrentLocation();
            if (location) {
                setUserLocation(location);
                logger.log('User location loaded for map:', location);
            }
        } catch (error) {
            logger.error('Failed to load user location', error);
        } finally {
            setLoading(false);
        }
    }

    function centerOnUser() {
        if (userLocation && mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 500);
        }
    }

    function handleMarkerPress(markerId: string) {
        router.push(`/listing/${markerId}`);
    }

    // Map View - uses MapView (Metro resolves to .web.tsx or .native.tsx based on platform)
    if (viewMode === 'map') {
        return (
            <View style={styles.container}>
                <MapView
                    initialRegion={NORTH_CYPRUS_REGION}
                    region={region}
                    onRegionChange={setRegion}
                    markers={MOCK_MARKERS}
                    onMarkerPress={handleMarkerPress}
                    loading={loading}
                    onSwitchToFeed={() => setViewMode('feed')}
                />

                {/* Map Controls */}
                <View style={styles.mapControls}>
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={centerOnUser}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.controlIcon}>📍</Text>
                    </TouchableOpacity>
                </View>

                {/* View Toggle */}
                <View style={styles.viewToggle}>
                    <TouchableOpacity
                        style={[styles.toggleButton, isMapView && styles.toggleActive]}
                        onPress={() => setViewMode('map')}
                    >
                        <Text style={[styles.toggleText, isMapView && styles.toggleTextActive]}>
                            Map
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, isFeedView && styles.toggleActive]}
                        onPress={() => setViewMode('feed')}
                    >
                        <Text style={[styles.toggleText, isFeedView && styles.toggleTextActive]}>
                            Feed
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Feed View
    return (
        <View style={styles.container}>
            <View style={styles.feedHeader}>
                <Text style={styles.feedTitle}>Community</Text>
            </View>

            <ScrollView style={styles.feedList} contentContainerStyle={styles.feedContent}>
                {MOCK_FEED.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.feedCard} activeOpacity={0.7}>
                        <View style={styles.feedCardBadge}>
                            <Text style={styles.feedCardBadgeText}>
                                {item.type === 'event' ? '📅' : '🏃'}
                            </Text>
                        </View>
                        <View style={styles.feedCardContent}>
                            <Text style={styles.feedCardTitle}>{item.title}</Text>
                            <Text style={styles.feedCardLocation}>📍 {item.location}</Text>
                            <Text style={styles.feedCardTime}>{item.time}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* View Toggle */}
            <View style={styles.viewToggle}>
                <TouchableOpacity
                    style={[styles.toggleButton, isMapView && styles.toggleActive]}
                    onPress={() => setViewMode('map')}
                >
                    <Text style={[styles.toggleText, isMapView && styles.toggleTextActive]}>
                        Map
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, isFeedView && styles.toggleActive]}
                    onPress={() => setViewMode('feed')}
                >
                    <Text style={[styles.toggleText, isFeedView && styles.toggleTextActive]}>
                        Feed
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    map: {
        width,
        height: height - 100,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    mapControls: {
        position: 'absolute',
        right: 16,
        bottom: 100,
    },
    controlButton: {
        width: 48,
        height: 48,
        backgroundColor: '#fff',
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    controlIcon: {
        fontSize: 20,
    },
    viewToggle: {
        position: 'absolute',
        bottom: 30,
        left: 16,
        right: 16,
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: '#007AFF',
    },
    toggleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    toggleTextActive: {
        color: '#fff',
    },
    callout: {
        width: 150,
        padding: 8,
    },
    calloutTitle: {
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 4,
    },
    calloutCategory: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    calloutAction: {
        fontSize: 12,
        color: '#007AFF',
    },
    feedHeader: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    feedTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    feedList: {
        flex: 1,
    },
    feedContent: {
        padding: 16,
        paddingBottom: 80,
    },
    feedCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    feedCardBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    feedCardBadgeText: {
        fontSize: 24,
    },
    feedCardContent: {
        flex: 1,
    },
    feedCardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    feedCardLocation: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    feedCardTime: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    // Web fallback styles
    webMapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 40,
    },
    webMapTitle: {
        fontSize: 48,
        marginBottom: 16,
    },
    webMapText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    switchButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    switchButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
