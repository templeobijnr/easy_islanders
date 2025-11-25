export type TaxiStatus = 'available' | 'busy' | 'offline';
export type RequestStatus = 'pending' | 'assigned' | 'completed' | 'expired' | 'cancelled';

export interface GeoLocation {
    lat: number;
    lng: number;
    district: string; // e.g., 'Girne', 'Iskele' - crucial for coarse filtering
}

export interface TaxiDriver {
    id: string; // Firestore Doc ID
    name: string;
    phone: string; // E.164 format (e.g., +90533...)
    whatsappId: string; // Twilio specific ID usually same as phone
    status: TaxiStatus;
    currentLocation: GeoLocation;
    rating: number; // 1-5
    totalRides: number;
    vehicleType: 'sedan' | 'van' | 'luxury';
    pushToken?: string; // Future proofing
}

export interface TaxiRequest {
    id: string;
    userId: string; // The customer
    customerName: string;
    customerPhone: string;
    pickup: {
        address: string;
        location: GeoLocation;
    };
    dropoff: {
        address: string;
    };
    status: RequestStatus;
    createdAt: Date;
    assignedDriverId?: string | null;
    broadcastSentTo: string[]; // Array of Driver IDs who received the msg
    priceEstimate?: number; // In TL
    assignedAt?: Date;
}
