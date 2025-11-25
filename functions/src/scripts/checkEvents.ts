import { db } from '../config/firebase';


async function checkEvents() {
    console.log('🔍 Checking for Events in Firestore...');
    try {
        const snapshot = await db.collection('listings')
            .where('domain', '==', 'Events')
            .get();

        if (snapshot.empty) {
            console.log('⚠️ No Events found in Firestore.');
            return;
        }

        console.log(`✅ Found ${snapshot.size} Events:`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\n📄 Event ID: ${doc.id}`);
            console.log(`   Title: ${data.title}`);
            console.log(`   Location: ${data.location}`);
            console.log(`   Date: ${data.date}`);
            console.log(`   Venue: ${data.venue}`);
            console.log(`   SubCategory: ${data.subCategory}`);
            console.log(`   EventType: ${data.eventType}`);
        });

    } catch (error) {
        console.error('❌ Error querying Events:', error);
    }
}

if (require.main === module) {
    checkEvents()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
