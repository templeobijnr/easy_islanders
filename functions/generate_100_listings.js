const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const locations = ["Kyrenia", "Famagusta", "Nicosia", "Iskele", "Catalkoy", "Alsancak", "Lapta", "Bellapais"];
const realEstateTypes = ["Villa", "Apartment", "Studio", "Penthouse", "Bungalow", "Land"];
const carMakes = ["BMW", "Mercedes", "Audi", "Toyota", "Hyundai", "Nissan", "Ford", "Volkswagen"];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomPrice(min, max) { return Math.floor(Math.random() * (max - min) + min); }
function randomRating() { return (Math.random() * 1.5 + 3.5).toFixed(1); }

const listings = [];

// 40 Real Estate
for (let i = 1; i <= 40; i++) {
    const type = randomItem(realEstateTypes);
    const loc = randomItem(locations);
    const subCat = i % 3 === 0 ? "long-term" : "short-term";
    listings.push({
        id: `re_${i}`,
        title: `${loc} ${type} ${i}`,
        domain: "Real Estate",
        category: type,
        subCategory: subCat,
        location: loc,
        price: randomPrice(100, 500),
        currency: "GBP",
        amenities: ["Wifi", "AC", "Pool"],
        description: `Beautiful ${type} in ${loc}`,
        imageUrl: `https://images.unsplash.com/photo-${1500000000000 + i}?w=800`,
        status: "active",
        tags: [type.toLowerCase(), loc.toLowerCase()],
        rating: parseFloat(randomRating()),
        reviews: randomPrice(5, 50)
    });
}

// 30 Cars
for (let i = 1; i <= 30; i++) {
    const make = randomItem(carMakes);
    const subCat = i % 4 === 0 ? "sale" : "rental";
    listings.push({
        id: `car_${i}`,
        title: `${make} ${i % 5 === 0 ? 'SUV' : 'Sedan'}`,
        domain: "Cars",
        category: i % 3 === 0 ? "Luxury" : "Economy",
        subCategory: subCat,
        location: randomItem(locations),
        price: subCat === "sale" ? randomPrice(15000, 80000) : randomPrice(20, 150),
        currency: "GBP",
        amenities: ["AC", "GPS"],
        description: `Reliable ${make} vehicle`,
        imageUrl: `https://images.unsplash.com/photo-${1600000000000 + i}?w=800`,
        status: "active",
        tags: [make.toLowerCase()],
        rating: parseFloat(randomRating()),
        reviews: randomPrice(10, 60)
    });
}

// 15 Hotels
for (let i = 1; i <= 15; i++) {
    listings.push({
        id: `hotel_${i}`,
        title: `${randomItem(locations)} Resort ${i}`,
        domain: "Hotels",
        category: "Resort",
        subCategory: "luxury",
        location: randomItem(locations),
        price: randomPrice(150, 400),
        currency: "GBP",
        amenities: ["Pool", "Spa", "Restaurant"],
        description: "Luxury resort experience",
        imageUrl: `https://images.unsplash.com/photo-${1700000000000 + i}?w=800`,
        status: "active",
        tags: ["resort", "luxury"],
        rating: parseFloat(randomRating()),
        reviews: randomPrice(20, 100)
    });
}

// 10 Restaurants
for (let i = 1; i <= 10; i++) {
    listings.push({
        id: `rest_${i}`,
        title: `${randomItem(['Mediterranean', 'Turkish', 'Italian'])} Cuisine ${i}`,
        domain: "Restaurants",
        category: "Fine Dining",
        location: randomItem(locations),
        price: randomPrice(15, 60),
        currency: "GBP",
        description: "Exquisite dining experience",
        imageUrl: `https://images.unsplash.com/photo-${1800000000000 + i}?w=800`,
        status: "active",
        tags: ["dining"],
        rating: parseFloat(randomRating()),
        reviews: randomPrice(30, 150)
    });
}

// 5 Services
for (let i = 1; i <= 5; i++) {
    listings.push({
        id: `svc_${i}`,
        title: `${randomItem(['Plumbing', 'Electrical', 'Cleaning'])} Service ${i}`,
        domain: "Services",
        category: "Home Services",
        location: randomItem(locations),
        price: randomPrice(30, 100),
        currency: "GBP",
        description: "Professional service",
        imageUrl: `https://images.unsplash.com/photo-${1900000000000 + i}?w=800`,
        status: "active",
        tags: ["service"],
        rating: parseFloat(randomRating()),
        reviews: randomPrice(10, 40)
    });
}

async function populate() {
    console.log(`🔄 Populating ${listings.length} listings...`);
    for (const listing of listings) {
        const { id, ...data } = listing;
        await db.collection('listings').doc(id).set(data, { merge: true });
        if (listings.indexOf(listing) % 10 === 0) console.log(`✅ ${listings.indexOf(listing)}/${listings.length}`);
    }
    console.log(`🎉 Done! Added ${listings.length} listings`);
    process.exit(0);
}

populate();
