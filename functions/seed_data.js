const admin = require('firebase-admin');

// Point to the emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp({
    projectId: "easy-islanders"
});

const db = admin.firestore();

const MOCK_LISTINGS = [
    {
        id: "prop_1",
        title: "Bellapais Abbey View Villa",
        domain: "Real Estate",
        category: "Villa",
        subCategory: "short-term",
        location: "Kyrenia",
        price: 250,
        currency: "GBP",
        amenities: ["Infinity Pool", "Mountain View", "BBQ", "Wifi", "AC"],
        description: "A serene and luxurious villa with breathtaking views.",
        status: "active"
    },
    {
        id: "prop_2",
        title: "Kyrenia Harbour Penthouse",
        domain: "Real Estate",
        category: "Apartment",
        subCategory: "short-term",
        location: "Kyrenia",
        price: 150,
        currency: "GBP",
        amenities: ["Terrace", "Jacuzzi", "Walk to Harbour", "Wifi"],
        description: "Charming penthouse right in the heart of the city.",
        status: "active"
    },
    {
        id: "prop_3",
        title: "Kyrenia Center Studio",
        domain: "Real Estate",
        category: "Apartment",
        subCategory: "short-term",
        location: "Kyrenia",
        price: 350, // Monthly? Or weekly? Assuming per stay for now based on context
        currency: "GBP",
        amenities: ["Furnished", "Wifi"],
        description: "Modern studio in the center.",
        status: "active"
    },
    {
        id: "car_6",
        title: "Hyundai i10",
        domain: "Cars",
        category: "Compact",
        subCategory: "rental",
        location: "Kyrenia",
        price: 20,
        currency: "GBP",
        amenities: ["AC", "Compact"],
        status: "active"
    }
];

async function seed() {
    console.log("Seeding database...");
    for (const item of MOCK_LISTINGS) {
        await db.collection('listings').doc(item.id).set(item);
        console.log(`Added ${item.title}`);
    }
    console.log("Done!");
}

seed();
