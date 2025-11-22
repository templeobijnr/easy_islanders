#!/usr/bin/env node

/**
 * Integration Test: Authentication Flow
 * 
 * This script tests:
 * 1. Unauthenticated request (should fail)
 * 2. Creating a test user via Firebase Auth
 * 3. Getting an ID token
 * 4. Making authenticated request (should succeed)
 * 
 * Prerequisites:
 * - Firebase emulators running (auth, functions, firestore)
 * - Backend built and deployed to emulator
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, connectAuthEmulator } = require('firebase/auth');

// Firebase config (emulator)
const firebaseConfig = {
    apiKey: "test-api-key",
    authDomain: "localhost",
    projectId: "easy-islanders"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Point to emulator
connectAuthEmulator(auth, 'http://127.0.0.1:9099');

const API_BASE = 'http://127.0.0.1:5001/easy-islanders/europe-west1/api/v1';

// Test credentials
const TEST_USER = {
    email: 'test@easyislanders.com',
    password: 'TestPassword123!'
};

async function runTests() {
    console.log('🧪 Starting Authentication Flow Tests\n');

    // Test 1: Unauthenticated Request
    console.log('Test 1: Calling /chat/message WITHOUT auth token...');
    try {
        const response = await fetch(`${API_BASE}/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hello',
                agentId: 'property-agent',
                language: 'en'
            })
        });

        const data = await response.json();

        if (response.status === 401 && data.error) {
            console.log('✅ Test 1 PASSED: Unauthenticated request rejected');
            console.log(`   Response: ${data.error}\n`);
        } else {
            console.log('❌ Test 1 FAILED: Expected 401, got', response.status);
            console.log('   Response:', data, '\n');
        }
    } catch (error) {
        console.log('❌ Test 1 FAILED:', error.message, '\n');
    }

    // Test 2: Create Test User
    console.log('Test 2: Creating test user...');
    let userCredential;
    try {
        // Try to sign in first (user might already exist)
        try {
            userCredential = await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
            console.log('✅ Test user already exists, signed in successfully');
        } catch (signInError) {
            // User doesn't exist, create them
            userCredential = await createUserWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
            console.log('✅ Test user created successfully');
        }

        console.log(`   UID: ${userCredential.user.uid}`);
        console.log(`   Email: ${userCredential.user.email}\n`);
    } catch (error) {
        console.log('❌ Test 2 FAILED:', error.message, '\n');
        return;
    }

    // Test 3: Get ID Token
    console.log('Test 3: Getting ID token...');
    let token;
    try {
        token = await userCredential.user.getIdToken();
        console.log('✅ ID token retrieved');
        console.log(`   Token preview: ${token.substring(0, 50)}...\n`);
    } catch (error) {
        console.log('❌ Test 3 FAILED:', error.message, '\n');
        return;
    }

    // Test 4: Authenticated Request
    console.log('Test 4: Calling /chat/message WITH auth token...');
    try {
        const response = await fetch(`${API_BASE}/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                message: 'Show me villas in Kyrenia',
                agentId: 'property-agent',
                language: 'en'
            })
        });

        const data = await response.json();

        if (response.status === 200) {
            console.log('✅ Test 4 PASSED: Authenticated request successful');
            console.log(`   Response text: ${data.text?.substring(0, 100) || 'No text'}...`);
            console.log(`   Listings count: ${data.listings?.length || 0}`);
            console.log(`   Session ID: ${data.sessionId || 'none'}\n`);
        } else {
            console.log('❌ Test 4 FAILED: Expected 200, got', response.status);
            console.log('   Response:', data, '\n');
        }
    } catch (error) {
        console.log('❌ Test 4 FAILED:', error.message, '\n');
    }

    // Test 5: Health Check (public endpoint)
    console.log('Test 5: Testing public /health endpoint...');
    try {
        const response = await fetch('http://127.0.0.1:5001/easy-islanders/europe-west1/api/health');
        const data = await response.json();

        if (response.status === 200 && data.status === 'online') {
            console.log('✅ Test 5 PASSED: Health check successful');
            console.log(`   Status: ${data.status}`);
            console.log(`   Timestamp: ${data.timestamp}\n`);
        } else {
            console.log('❌ Test 5 FAILED');
            console.log('   Response:', data, '\n');
        }
    } catch (error) {
        console.log('❌ Test 5 FAILED:', error.message, '\n');
    }

    console.log('🎉 All tests completed!\n');
    process.exit(0);
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
