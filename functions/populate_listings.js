const admin = require('firebase-admin');

// Initialize with application default credentials
// This will use your local Firebase credentials
admin.initializeApp();

const db = admin.firestore(admin.app(), 'easy-db');

const LISTINGS = [
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
        imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
        status: "active",
        tags: ["luxury", "villa", "pool"],
        rating: 4.8,
        reviews: 24
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
        imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        status: "active",
        tags: ["penthouse", "harbour", "jacuzzi"],
        rating: 4.6,
        reviews: 18
    },
    {
        id: "prop_3",
        title: "Kyrenia Center Studio",
        domain: "Real Estate",
        category: "Apartment",
        subCategory: "long-term",
        location: "Kyrenia",
        price: 350,
        currency: "GBP",
        amenities: ["Furnished", "Wifi"],
        description: "Modern studio in the center.",
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
        status: "active",
        tags: ["studio", "furnished"],
        rating: 4.3,
        reviews: 12
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
        description: "Economical compact car perfect for city driving.",
        imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800",
        status: "active",
        tags: ["economy", "compact"],
        rating: 4.5,
        reviews: 31
    },
    {
        id: "car_7",
        title: "Ford Fiesta Economy",
        domain: "Cars",
        category: "Economy",
        subCategory: "rental",
        location: "Ercan Airport",
        price: 25,
        currency: "GBP",
        amenities: ["AC", "Bluetooth"],
        description: "Reliable economy car with modern features.",
        imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800",
        status: "active",
        tags: ["economy", "airport"],
        rating: 4.4,
        reviews: 28
    }
];

async function populateListings() {
    console.log("🔄 Starting to populate listings...");

    try {
        for (const listing of LISTINGS) {
            const { id, ...data } = listing;
            await db.collection('listings').doc(id).set(data, { merge: true });
            console.log(`✅ Added/Updated: ${listing.title} (${id})`);
        }

        console.log("\n🎉 Successfully populated all listings!");
        console.log(`📊 Total listings: ${LISTINGS.length}`);

        // Verify
        const snapshot = await db.collection('listings').get();
        console.log(`📋 Total documents in 'listings' collection: ${snapshot.size}`);

    } catch (error) {
        console.error("❌ Error populating listings:", error);
    }

    process.exit(0);
}

populateListings();
