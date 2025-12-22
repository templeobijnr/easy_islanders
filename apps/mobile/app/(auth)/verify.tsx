import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

export default function VerifyScreen() {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const { confirmCode } = useAuth();
    const router = useRouter();

    const handleVerify = async () => {
        if (!code || code.length < 6) {
            Alert.alert('Error', 'Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await confirmCode(code);
            // Auth listener in _layout will handle redirect
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Invalid code');
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify Code</Text>
            <Text style={styles.subtitle}>Enter the code sent to your phone</Text>

            <TextInput
                style={styles.input}
                placeholder="123456"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
            />

            <TouchableOpacity
                style={styles.button}
                onPress={handleVerify}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Verify</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 16,
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 24,
        letterSpacing: 8,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
