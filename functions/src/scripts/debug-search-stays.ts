/**
 * Debug script for searchStays tool
 * Run with: npx ts-node --project tsconfig.json src/scripts/debug-search-stays.ts
 */

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp();
}

// CRITICAL: Use the named database 'easy-db', not the default!
const db = getFirestore(admin.app(), 'easy-db');

async function debugSearchStays() {
    console.log('\n🔍 DEBUG: searchStays Tool (using easy-db)\n');
    console.log('='.repeat(50));

    // 1. Check what listings exist with type='stay'
    console.log('\n1. Checking listings with type="stay"...');
    const staysSnapshot = await db.collection('listings')
        .where('type', '==', 'stay')
        .limit(20)
        .get();

    console.log(`   Found: ${staysSnapshot.size} document(s)`);

    if (staysSnapshot.size > 0) {
        staysSnapshot.docs.forEach((doc, i) => {
            const data = doc.data();
            console.log(`\n   [${i + 1}] ${doc.id}`);
            console.log(`       Title: ${data.title || data.name || 'N/A'}`);
            console.log(`       Type: ${data.type}`);
            console.log(`       Category: ${data.category}`);
            console.log(`       Region: ${data.region}`);
            console.log(`       Images: ${data.images?.length || 0}`);
        });
    }

    // 2. Check ALL listings to see what types exist
    console.log('\n2. Checking ALL listing types...');
    const allListings = await db.collection('listings').limit(50).get();
    const typeCounts: Record<string, number> = {};

    allListings.docs.forEach(doc => {
        const data = doc.data();
        const type = data.type || 'NO_TYPE';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    console.log(`   Total listings: ${allListings.size}`);
    console.log('   By type:');
    Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count}`);
    });

    // 3. Sample the first stay listing structure
    if (staysSnapshot.size > 0) {
        console.log('\n3. Sample stay listing structure:');
        const sample = staysSnapshot.docs[0].data();
        console.log(JSON.stringify({
            id: staysSnapshot.docs[0].id,
            type: sample.type,
            title: sample.title,
            category: sample.category,
            region: sample.region,
            images: sample.images?.length,
            hasBookingEnabled: sample.bookingEnabled,
        }, null, 2));
    }

    console.log('\n' + '='.repeat(50));
    console.log('DEBUG COMPLETE\n');
}

debugSearchStays()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
