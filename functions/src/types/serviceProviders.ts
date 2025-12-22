import * as admin from 'firebase-admin';
import { RequestType } from './requests';

export type ServiceProviderType =
    | 'taxi_company'
    | 'driver'
    | 'water_vendor'
    | 'gas_vendor'
    | 'grocery_vendor'
    | 'housing_agent'
    | 'developer'
    | 'legal_consultant'
    | 'other';

export interface ServiceProvider {
    id: string;
    cityId: string;

    type: ServiceProviderType;
    name: string;
    contactName?: string;

    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;

    placeId?: string;                      // office location

    // Which requests they can handle
    supportedRequestTypes: RequestType[];  // ['ORDER', 'SERVICE']
    supportedOrderTypes?: Array<'water' | 'gas' | 'grocery'>;

    isActive: boolean;
    notes?: string;

    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}
