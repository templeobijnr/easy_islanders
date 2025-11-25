/**
 * Seed Markets and Services for City OS V1
 *
 * This script populates the database with Market and Service provider listings
 * that are required for the orderHouseholdSupplies and requestService tools to work.
 *
 * Run this script with:
 * FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" GCLOUD_PROJECT="easy-islanders" \
 * node -r esbuild-register src/scripts/seedMarketsAndServices.ts
 */

import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const TEST_VENDOR_PHONE = process.env.TEST_VENDOR_PHONE || TWILIO_WHATSAPP_NUMBER;

async function seedMarkets() {
    console.log('🛒 Seeding Markets...');

    const markets = [
        {
            title: 'Kyrenia Central Market',
            description: 'Main market in Kyrenia offering fresh produce, groceries, water, and gas cylinders. Open daily 7am-10pm.',
            domain: 'Market',
            category: 'Grocery',
            subCategory: 'supermarket',
            location: 'Kyrenia Center',
            price: 0,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Delivery', 'Water Bottles', 'Gas Cylinders', 'Fresh Produce', 'Dairy'],
            rating: 4.5,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Lapta Express Grocery',
            description: 'Quick delivery service for essentials. Specializing in water, gas, and daily necessities.',
            domain: 'Market',
            category: 'Grocery',
            subCategory: 'express',
            location: 'Lapta',
            price: 0,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Fast Delivery', 'Water Bottles', 'Gas Cylinders', 'Snacks'],
            rating: 4.3,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Bellapais Village Store',
            description: 'Local shop serving Bellapais and surrounding villages. Fresh bread daily.',
            domain: 'Market',
            category: 'Grocery',
            subCategory: 'local',
            location: 'Bellapais',
            price: 0,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Fresh Bread', 'Water', 'Local Products'],
            rating: 4.7,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }
    ];

    for (const market of markets) {
        const docRef = await db.collection('listings').add(market);
        console.log(`✅ Created market: ${market.title} (${docRef.id})`);
    }

    console.log('🛒 Markets seeded successfully!\n');
}

async function seedServices() {
    console.log('🔧 Seeding Service Providers...');

    const services = [
        {
            title: 'Fast Plumber Girne',
            description: '24/7 Emergency plumbing service. Licensed and insured. Specializing in repairs, installations, and maintenance.',
            domain: 'Services',
            category: 'Home Services',
            subCategory: 'plumber',
            location: 'Kyrenia',
            price: 150,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['24/7 Emergency', 'Licensed', 'Insured', 'Fast Response'],
            rating: 4.8,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Sparky Electric TRNC',
            description: 'Certified electrician serving all of North Cyprus. Emergency repairs, installations, and inspections.',
            domain: 'Services',
            category: 'Home Services',
            subCategory: 'electrician',
            location: 'Kyrenia',
            price: 200,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Certified', 'Emergency Service', 'Solar Panel Installation'],
            rating: 4.6,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Cool Breeze AC Services',
            description: 'Air conditioning installation, repair, and maintenance. All major brands. Summer emergency service.',
            domain: 'Services',
            category: 'Home Services',
            subCategory: 'ac_tech',
            location: 'Kyrenia',
            price: 100,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1631545806609-7ca8b6827f76?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['All Brands', 'Maintenance Plans', 'Emergency Service'],
            rating: 4.5,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Crystal Clean Cyprus',
            description: 'Professional cleaning services for homes and offices. Deep cleaning, regular maintenance, move-in/out.',
            domain: 'Services',
            category: 'Home Services',
            subCategory: 'cleaner',
            location: 'Kyrenia',
            price: 80,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Eco-Friendly Products', 'Insured', 'Flexible Scheduling'],
            rating: 4.9,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Handy Helper TRNC',
            description: 'General handyman services. Furniture assembly, minor repairs, painting, gardening, and more.',
            domain: 'Services',
            category: 'Home Services',
            subCategory: 'handyman',
            location: 'Kyrenia',
            price: 120,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1581578017093-cd30ed8c45c7?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Multi-Skilled', 'Affordable', 'Same Day Service'],
            rating: 4.4,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Paint Perfect Cyprus',
            description: 'Professional painting services for residential and commercial properties. Interior and exterior.',
            domain: 'Services',
            category: 'Home Services',
            subCategory: 'painter',
            location: 'Kyrenia',
            price: 150,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Free Estimates', 'Quality Paints', 'Clean Work'],
            rating: 4.7,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        },
        {
            title: 'Green Thumb Gardens',
            description: 'Garden maintenance, landscaping, and irrigation services. Keep your garden beautiful year-round.',
            domain: 'Services',
            category: 'Home Services',
            subCategory: 'gardener',
            location: 'Kyrenia',
            price: 100,
            currency: 'TRY',
            imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
            agentPhone: TEST_VENDOR_PHONE,
            ownerContact: TEST_VENDOR_PHONE,
            amenities: ['Landscaping', 'Irrigation', 'Tree Trimming'],
            rating: 4.6,
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        }
    ];

    for (const service of services) {
        const docRef = await db.collection('listings').add(service);
        console.log(`✅ Created service: ${service.title} (${docRef.id})`);
    }

    console.log('🔧 Services seeded successfully!\n');
}

async function main() {
    console.log('🌟 Starting City OS V1 Market & Services Seeding...');
    console.log(`📱 Using vendor phone: ${TEST_VENDOR_PHONE}\n`);

    try {
        await seedMarkets();
        await seedServices();

        console.log('✅ ✅ ✅ All done! City OS V1 is ready!');
        console.log('\n📝 Summary:');
        console.log('   - 3 Markets created (Kyrenia Central, Lapta Express, Bellapais Village)');
        console.log('   - 7 Service providers created (Plumber, Electrician, AC, Cleaner, Handyman, Painter, Gardener)');
        console.log(`   - All configured with WhatsApp: ${TEST_VENDOR_PHONE}`);
        console.log('\n🎯 Next steps:');
        console.log('   1. Test ordering: "Send me 2 bottles of water"');
        console.log('   2. Test services: "I need a plumber urgently"');
        console.log('   3. Reply as vendor via WhatsApp to test bi-directional sync');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

export { seedMarkets, seedServices };
