/**
 * MapView Component (Native)
 * 
 * Full-featured map using react-native-maps.
 * Shows markers, user location, and handles region changes.
 * 
 * @platform ios, android
 */
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import RNMapView, { Marker, Callout, Region } from 'react-native-maps';
import { useRef } from 'react';
import type { MapViewProps } from './types';

export default function MapView({
    initialRegion,
    region,
    onRegionChange,
    markers = [],
    onMarkerPress,
    loading,
}: MapViewProps) {
    const mapRef = useRef<RNMapView>(null);

    return (
        <View style={styles.container}>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            )}

            <RNMapView
                ref={mapRef}
                style={styles.map}
                initialRegion={initialRegion as Region}
                region={region as Region}
                onRegionChangeComplete={onRegionChange}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass
            >
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        coordinate={marker.coordinate}
                        pinColor={marker.category === 'Beach' ? '#00BCD4' : '#FF5722'}
                        onCalloutPress={() => onMarkerPress?.(marker.id)}
                    >
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={styles.calloutTitle}>{marker.title}</Text>
                                <Text style={styles.calloutCategory}>{marker.category}</Text>
                                <Text style={styles.calloutAction}>Tap to view →</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </RNMapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    callout: {
        padding: 8,
        minWidth: 120,
    },
    calloutTitle: {
        fontSize: 14,
        fontWeight: 'bold',
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
});
