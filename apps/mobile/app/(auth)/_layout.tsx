import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack>
            <Stack.Screen name="phone" options={{ title: 'Sign In', headerShown: false }} />
            <Stack.Screen name="verify" options={{ title: 'Verify Code' }} />
        </Stack>
    );
}
