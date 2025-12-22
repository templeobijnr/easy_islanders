import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function JobDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    // Mock data fetching based on ID
    const job = {
        id: id,
        title: 'Taxi to Girne',
        status: 'confirmed',
        details: 'Pickup from Ercan Airport',
        price: '850 TRY',
        driver: 'Mehmet Y.',
        plate: 'TR 123',
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{job.title}</Text>
                <Text style={styles.status}>Status: {job.status}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>
                <Text style={styles.text}>{job.details}</Text>
                <Text style={styles.text}>Price: {job.price}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Driver Info</Text>
                <Text style={styles.text}>{job.driver}</Text>
                <Text style={styles.text}>{job.plate}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        padding: 24,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    status: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#333',
    },
    text: {
        fontSize: 16,
        marginBottom: 8,
        color: '#444',
    },
});
