import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function ListingDetailScreen() {
    const { id } = useLocalSearchParams();

    return (
        <View style={styles.container}>
            <Text style={styles.text}>Listing Details for {id}</Text>
            <Text style={styles.subText}>Coming in Phase 2</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subText: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
});
