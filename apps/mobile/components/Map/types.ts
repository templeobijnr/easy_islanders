/**
 * Map Component Types
 * 
 * Shared types for MapView across platforms.
 * Keep types in sync between .web.tsx and .native.tsx
 */

export interface MapMarker {
    id: string;
    title: string;
    category: string;
    coordinate: {
        latitude: number;
        longitude: number;
    };
}

export interface MapRegion {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
}

export interface MapViewProps {
    /** Initial map region to display */
    initialRegion: MapRegion;
    /** Current region (controlled) */
    region?: MapRegion;
    /** Callback when region changes */
    onRegionChange?: (region: MapRegion) => void;
    /** Markers to display on map */
    markers?: MapMarker[];
    /** Callback when marker is pressed */
    onMarkerPress?: (markerId: string) => void;
    /** Show loading indicator */
    loading?: boolean;
    /** User's current location */
    userLocation?: { latitude: number; longitude: number } | null;
    /** Callback to center on user location */
    onCenterOnUser?: () => void;
    /** Callback to switch to alternative view (used on web) */
    onSwitchToFeed?: () => void;
}
