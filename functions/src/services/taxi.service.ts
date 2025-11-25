import * as repo from '../repositories/taxi.repository';
import { TaxiRequest, TaxiDriver } from '../types/taxi';
import { sendWhatsApp } from './twilio.service';

/**
 * Broadcast request to available drivers
 */
export const broadcastRequest = async (request: TaxiRequest): Promise<void> => {
    // Find drivers in the same district
    const drivers = await repo.findAvailableTaxis(request.pickup.location.district);

    if (drivers.length === 0) {
        console.log(`No drivers available in district: ${request.pickup.location.district}`);
        // Fallback will be handled by timeout trigger
        return;
    }

    const requestCode = request.id.slice(-4).toUpperCase();
    const messageBody = `🚕 *NEW JOB* 🚕
From: ${request.pickup.address}
To: ${request.dropoff.address}
${request.priceEstimate ? `Est: ${request.priceEstimate} TL` : ''}

Reply *YES ${requestCode}* to accept.`;

    // Send WhatsApps to all available drivers
    const promises = drivers.map(driver =>
        sendWhatsApp(driver.phone, messageBody).catch(err => {
            console.error(`Failed to send WhatsApp to ${driver.name}:`, err);
            return null;
        })
    );

    await Promise.allSettled(promises);

    // Update record of who we messaged
    await repo.updateBroadcastList(request.id, drivers.map(d => d.id));

    console.log(`Broadcast sent to ${drivers.length} drivers for request ${request.id}`);
};

/**
 * Handle incoming WhatsApp reply from driver
 */
export const handleDriverReply = async (driverPhone: string, messageBody: string): Promise<string> => {
    // Clean phone number (remove whatsapp: prefix)
    const phone = driverPhone.replace('whatsapp:', '');

    // Find the most recent pending request this driver was messaged about
    const request = await repo.findPendingRequestForDriver(phone);

    if (!request) {
        return "No active requests found.";
    }

    const messageTrimmed = messageBody.trim().toUpperCase();

    if (messageTrimmed.startsWith('YES')) {
        const driver = await repo.findDriverByPhone(phone);
        if (!driver) {
            return "Driver not found in system.";
        }

        const success = await repo.assignDriverToRequest(request.id, driver.id);

        if (success) {
            // Notify customer via WhatsApp
            await notifyCustomer(request, driver);

            // Send detailed pickup info to driver
            await sendDriverDetails(driver, request);

            return `✅ Job Accepted! 
Customer: ${request.customerName}
Pickup: ${request.pickup.address}
Destination: ${request.dropoff.address}`;
        } else {
            return "❌ Job already taken by another driver.";
        }
    }

    if (messageTrimmed.startsWith('NO')) {
        return "👍 Understood. You'll receive the next available request.";
    }

    return "Please reply *YES* to accept or *NO* to decline.";
};

/**
 * Notify customer that driver is assigned
 */
async function notifyCustomer(request: TaxiRequest, driver: TaxiDriver): Promise<void> {
    const message = `🚕 *Taxi Confirmed!*

Driver: ${driver.name}
Vehicle: ${driver.vehicleType}
Rating: ${'⭐'.repeat(Math.round(driver.rating))}

Driver will contact you shortly.
Contact: ${driver.phone}`;

    try {
        await sendWhatsApp(request.customerPhone, message);
    } catch (error) {
        console.error('Failed to notify customer:', error);
    }
}

/**
 * Send detailed pickup information to driver
 */
async function sendDriverDetails(driver: TaxiDriver, request: TaxiRequest): Promise<void> {
    let message = `📍 *PICKUP DETAILS*

Customer: ${request.customerName}
Phone: ${request.customerPhone}

📍 Pickup: ${request.pickup.address}`;

    if (request.pickup.location.lat && request.pickup.location.lng) {
        message += `\n📲 Navigate: https://www.google.com/maps/dir/?api=1&destination=${request.pickup.location.lat},${request.pickup.location.lng}`;
    }

    message += `\n\n🎯 Destination: ${request.dropoff.address}`;

    try {
        await sendWhatsApp(driver.phone, message);
    } catch (error) {
        console.error('Failed to send driver details:', error);
    }
}

/**
 * Create and broadcast a new taxi request
 */
export const createAndBroadcastRequest = async (requestData: Omit<TaxiRequest, 'id' | 'status' | 'createdAt' | 'broadcastSentTo'>): Promise<string> => {
    // Create the request
    const requestId = await repo.createTaxiRequest(requestData);

    // Get the full request object
    const request = await repo.getTaxiRequest(requestId);

    if (!request) {
        throw new Error('Failed to create taxi request');
    }

    // Broadcast to drivers
    await broadcastRequest(request);

    return requestId;
};
