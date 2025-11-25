# Taxi Partner Playbook

## Overview
Welcome to the Easy Islanders Taxi Dispatch System! This document explains how the system works for taxi drivers and how to onboard new partners.

## How It Works

### For Taxi Drivers

1. **Sign Up**: Contact the Easy Islanders team to register as a taxi partner
2. **Provide Info**:
   - Full name
   - WhatsApp phone number (E.164 format, e.g., +90533XXXXXXX)
   - Vehicle type (sedan, van, or luxury)
   - Operating district (Girne, Lefkosa, Famagusta, Iskele, etc.)

3. **Receive Requests**: When a customer requests a taxi in your area, you'll receive a WhatsApp message like:
   ```
   🚕 *NEW JOB* 🚕
   From: Girne Marina
   To: Bellapais Abbey
   Est: 150 TL

   Reply *YES A123* to accept.
   ```

4. **Accept Jobs**: Reply with "YES" + the job code to accept
   - **First to reply gets the job**
   - If someone else accepts first, you'll get a message: "❌ Job already taken by another driver."

5. **Complete Ride**: Once accepted, you'll receive:
   - Customer name and phone
   - Pickup location with Google Maps navigation link
   - Destination address

### For Operations Team

#### Onboarding New Drivers

Run this script in Firebase Functions or use the admin panel:

```typescript
// Add to functions/src/scripts/addTaxiDriver.ts
import { db } from '../config/firebase';

async function addTaxiDriver() {
  await db.collection('taxi_drivers').add({
    name: "Driver Name",
    phone: "+90533XXXXXXX",  // MUST be E.164 format
    whatsappId: "+90533XXXXXXX",
    status: "available",
    currentLocation: {
      district: "Girne",
      lat: 35.33,
      lng: 33.32
    },
    rating: 5.0,
    totalRides: 0,
    vehicleType: "sedan"
  });
  console.log("✅ Driver added!");
}
```

#### Managing Driver Status

- **Available**: Driver is accepting requests
- **Busy**: Driver is on a ride
- **Offline**: Driver is not working

Update status manually in Firestore or via admin panel.

## Best Practices

### For Drivers
- Keep WhatsApp notifications ON
- Reply quickly to maximize accepted jobs
- Update your location/district when you move areas
- Communicate professionally with customers

### For Operations
- Monitor timeout rates (requests with no driver acceptance)
- Adjust broadcast radius if needed
- Review driver performance metrics
- Handle escalations for unassigned requests

## Troubleshooting

**Q: Driver not receiving requests?**
- Check `status` is set to "available"
- Verify `currentLocation.district` matches request area
- Confirm phone number is correct in Firestore

**Q: Multiple drivers claiming the same job?**
- System prevents this with atomic transactions
- Only first driver to reply "YES" gets the job

**Q: Customer not notified?**
- Check customer phone number is valid
- Verify Twilio credits are sufficient
- Check function logs for errors

## Contact

For technical issues or questions:
- Email: tech@easyislanders.com
- WhatsApp: +90 XXX XXX XXXX
