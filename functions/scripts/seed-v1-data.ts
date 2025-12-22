/**
 * Seed Script: Minimal V1 Data
 * 
 * Seeds 3 restaurants with menus and 3 service providers for testing.
 * Run with: npx ts-node scripts/seed-v1-data.ts
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function seedV1Data() {
    console.log('🌱 Seeding V1 data...');

    // ========================================
    // RESTAURANTS
    // ========================================
    const restaurants = [
        {
            id: 'rest-001',
            name: 'Niazi\'s Kitchen',
            whatsappE164: '+905338123456',
            phone: '0533 812 34 56',
            address: 'Kordon Boyu, Girne',
            geo: { lat: 35.3369, lng: 33.3234 },
            cuisineTags: ['Turkish', 'Kebab', 'Grill'],
            deliveryAreas: ['Girne', 'Alsancak', 'Lapta'],
            orderTemplate: '🍽️ New Order from Easy Islanders\n\nCustomer: {customer_name}\nPhone: {customer_phone}\n\nOrder:\n{items}\n\nTotal: {total}\nDeliver to: {address}\n{notes}',
            priceRange: 'mid',
            rating: 4.5,
            active: true,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        },
        {
            id: 'rest-002',
            name: 'Sunset Fish House',
            whatsappE164: '+905338765432',
            phone: '0533 876 54 32',
            address: 'Harbour Front, Girne',
            geo: { lat: 35.3380, lng: 33.3180 },
            cuisineTags: ['Seafood', 'Mediterranean'],
            deliveryAreas: ['Girne', 'Bellapais'],
            orderTemplate: null,
            priceRange: 'premium',
            rating: 4.8,
            active: true,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        },
        {
            id: 'rest-003',
            name: 'Italian Corner',
            whatsappE164: '+905339876543',
            phone: '0533 987 65 43',
            address: 'Main Street, Lefkosa',
            geo: { lat: 35.1856, lng: 33.3823 },
            cuisineTags: ['Italian', 'Pizza', 'Pasta'],
            deliveryAreas: ['Lefkosa', 'Gönyeli'],
            orderTemplate: null,
            priceRange: 'mid',
            rating: 4.3,
            active: true,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        },
    ];

    for (const r of restaurants) {
        await db.collection('restaurants').doc(r.id).set(r);
        console.log(`  ✅ Restaurant: ${r.name}`);
    }

    // Menu items
    const menuItems = [
        // Niazi's Kitchen
        { id: 'menu-001', restaurantId: 'rest-001', name: 'Adana Kebab', price: 250, currency: 'TRY', category: 'Mains', active: true },
        { id: 'menu-002', restaurantId: 'rest-001', name: 'Mixed Grill', price: 350, currency: 'TRY', category: 'Mains', active: true },
        { id: 'menu-003', restaurantId: 'rest-001', name: 'Ayran', price: 30, currency: 'TRY', category: 'Drinks', active: true },
        { id: 'menu-004', restaurantId: 'rest-001', name: 'Baklava', price: 80, currency: 'TRY', category: 'Desserts', active: true },
        // Sunset Fish House
        { id: 'menu-005', restaurantId: 'rest-002', name: 'Grilled Sea Bass', price: 450, currency: 'TRY', category: 'Mains', active: true },
        { id: 'menu-006', restaurantId: 'rest-002', name: 'Calamari', price: 200, currency: 'TRY', category: 'Starters', active: true },
        { id: 'menu-007', restaurantId: 'rest-002', name: 'Rakı', price: 150, currency: 'TRY', category: 'Drinks', active: true },
        // Italian Corner
        { id: 'menu-008', restaurantId: 'rest-003', name: 'Margherita Pizza', price: 180, currency: 'TRY', category: 'Pizza', active: true },
        { id: 'menu-009', restaurantId: 'rest-003', name: 'Spaghetti Carbonara', price: 220, currency: 'TRY', category: 'Pasta', active: true },
        { id: 'menu-010', restaurantId: 'rest-003', name: 'Tiramisu', price: 90, currency: 'TRY', category: 'Desserts', active: true },
    ];

    for (const m of menuItems) {
        await db.collection(`restaurants/${m.restaurantId}/menu`).doc(m.id).set({
            ...m,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        });
    }
    console.log(`  ✅ ${menuItems.length} menu items added`);

    // ========================================
    // SERVICE PROVIDERS
    // ========================================
    const providers = [
        {
            id: 'prov-001',
            name: 'Ahmet Plumbing',
            whatsappE164: '+905331112233',
            phone: '0533 111 22 33',
            services: ['plumber'],
            coverageAreas: ['Girne', 'Alsancak', 'Lapta', 'Lefkosa'],
            template: '🔧 New Service Request\n\nService: {service_type}\nCustomer: {customer_name}\nPhone: {customer_phone}\nAddress: {address}\nUrgency: {urgency}\n\nIssue: {description}',
            rating: 4.7,
            responseTime: 'Usually responds in 30 min',
            active: true,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        },
        {
            id: 'prov-002',
            name: 'Electric Pro',
            whatsappE164: '+905334445566',
            phone: '0533 444 55 66',
            services: ['electrician'],
            coverageAreas: ['Girne', 'Lefkosa', 'Gazimagusa'],
            template: null,
            rating: 4.5,
            responseTime: 'Usually responds in 1 hour',
            active: true,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        },
        {
            id: 'prov-003',
            name: 'AC Masters',
            whatsappE164: '+905337778899',
            phone: '0533 777 88 99',
            services: ['ac_technician', 'handyman'],
            coverageAreas: ['Girne', 'Alsancak', 'Bellapais'],
            template: null,
            rating: 4.9,
            responseTime: 'Same day service',
            active: true,
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        },
    ];

    for (const p of providers) {
        await db.collection('service_providers').doc(p.id).set(p);
        console.log(`  ✅ Provider: ${p.name}`);
    }

    // ========================================
    // PHARMACY ON DUTY (Today)
    // ========================================
    const today = new Date().toISOString().split('T')[0];
    const pharmacyDoc = {
        date: today,
        pharmacies: [
            { name: 'Girne Eczanesi', address: 'Ziya Rızkı Cad. No:15, Girne', phone: '0392 815 12 34', district: 'Girne' },
            { name: 'Merkez Eczanesi', address: 'Atatürk Cad. No:8, Lefkosa', phone: '0392 228 56 78', district: 'Lefkosa' },
        ],
        source: 'manual',
        updatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('pharmacies_on_duty').doc(today).set(pharmacyDoc);
    console.log(`  ✅ Pharmacy duty doc for ${today}`);

    // ========================================
    // NEWS CACHE
    // ========================================
    const newsDoc = {
        articles: [
            { title: 'Tourism season shows strong recovery', source: 'Cyprus Today', url: 'https://example.com/news1', publishedAt: new Date().toISOString() },
            { title: 'New road improvements announced for Girne', source: 'Havadis', url: 'https://example.com/news2', publishedAt: new Date().toISOString() },
            { title: 'Weather forecast: Sunny week ahead', source: 'KKTC Haber', url: 'https://example.com/news3', publishedAt: new Date().toISOString() },
        ],
        fetchedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('news_cache').doc('latest').set(newsDoc);
    console.log(`  ✅ News cache seeded`);

    console.log('\n✨ V1 seed complete!');
}

seedV1Data().catch(console.error);
