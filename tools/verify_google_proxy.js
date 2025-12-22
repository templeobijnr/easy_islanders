// Native fetch is available in Node 18+

const API_URL = 'https://europe-west1-easy-islanders.cloudfunctions.net/googlePlacesProxy';

async function verify() {
    console.log('Verifying Google Places Proxy...');

    // 1. Autocomplete
    console.log('\n--- Testing Autocomplete ---');
    const query = 'Kyrenia';
    const autocompleteUrl = `${API_URL}?action=autocomplete&input=${encodeURIComponent(query)}&lat=35.33&lng=33.32&radius=50000`;
    try {
        const res = await fetch(autocompleteUrl);
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Autocomplete failed:', err);
    }

    // 2. Geocode
    console.log('\n--- Testing Geocode ---');
    const lat = 35.3417;
    const lng = 33.3198;
    const geocodeUrl = `${API_URL}?action=geocode&lat=${lat}&lng=${lng}`;
    try {
        const res = await fetch(geocodeUrl);
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Geocode failed:', err);
    }
    // 3. Rich Details
    console.log('\n--- Testing Rich Details (Business) ---');
    // Search for a real business first
    const businessQuery = 'Nima Restaurant Kyrenia';
    const searchUrl = `${API_URL}?action=autocomplete&input=${encodeURIComponent(businessQuery)}&lat=35.33&lng=33.32`;

    try {
        const searchRes = await fetch(searchUrl);
        const searchData = await searchRes.json();

        if (searchData.predictions && searchData.predictions.length > 0) {
            const placeId = searchData.predictions[0].place_id;
            console.log('Found Business:', searchData.predictions[0].description);
            console.log('Place ID:', placeId);

            const detailsUrl = `${API_URL}?action=details&place_id=${placeId}`;
            const res = await fetch(detailsUrl);
            const data = await res.json();

            console.log('Status:', res.status);
            if (data.result) {
                console.log('Name:', data.result.name);
                console.log('Phone:', data.result.international_phone_number);
                console.log('Website:', data.result.website);
                console.log('Rating:', data.result.rating);
                console.log('Photos:', data.result.photos ? data.result.photos.length : 0);

                // 4. Photo Proxy
                if (data.result.photos && data.result.photos.length > 0) {
                    console.log('\n--- Testing Photo Proxy ---');
                    const photoRef = data.result.photos[0].photo_reference;
                    const photoUrl = `${API_URL}?action=photo&photo_reference=${photoRef}&maxwidth=100`;
                    const photoRes = await fetch(photoUrl);
                    console.log('Photo Status:', photoRes.status);
                    console.log('Content-Type:', photoRes.headers.get('content-type'));
                    const buffer = await photoRes.arrayBuffer();
                    console.log('Image Size:', buffer.byteLength, 'bytes');
                }
            }
        } else {
            console.log('Could not find business to test details');
        }
    } catch (err) {
        console.error('Rich Details Test Failed:', err);
    }
}

verify();
