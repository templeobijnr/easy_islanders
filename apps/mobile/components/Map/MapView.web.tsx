/**
 * MapView Component (Web)
 * 
 * Web placeholder - react-native-maps doesn't work on web.
 * Shows a friendly message and option to switch to feed view.
 * 
 * @platform web
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { MapViewProps } from './types';

export default function MapView({ onSwitchToFeed }: MapViewProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.emoji}>🗺️</Text>
            <Text style={styles.title}>Map View</Text>
            <Text style={styles.text}>
                Interactive map is available in the native mobile app.
            </Text>
            {onSwitchToFeed && (
                <TouchableOpacity style={styles.button} onPress={onSwitchToFeed}>
                    <Text style={styles.buttonText}>Switch to Feed View</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 40,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    text: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: 300,
    },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
});
