/**
 * MerveIntegrationSection - Constants
 */
import type { MervePlaceType, MerveActionType, IngestKind } from "./types";

export interface ActionMeta {
    emoji: string;
    label: string;
    desc: string;
}

export const ACTION_METADATA: Record<MerveActionType, ActionMeta> = {
    order_food: { emoji: "🍕", label: "Order Food", desc: "Menu ordering with WhatsApp dispatch" },
    reserve_table: { emoji: "📅", label: "Reserve Table", desc: "Table reservation with confirmation" },
    book_stay: { emoji: "🏨", label: "Book Stay", desc: "Accommodation booking" },
    book_activity: { emoji: "🎯", label: "Book Activity", desc: "Activity/experience booking" },
    request_service: { emoji: "🔧", label: "Request Service", desc: "Service request dispatch" },
    order_supplies: { emoji: "🛒", label: "Order Supplies", desc: "Supply ordering (groceries, water, etc.)" },
    register_event: { emoji: "🎟️", label: "Register Event", desc: "Event registration/RSVP" },
    inquire: { emoji: "💬", label: "Inquire", desc: "General inquiry messages" },
};

export const DEFAULT_ACTIONS_BY_TYPE: Record<MervePlaceType, MerveActionType[]> = {
    restaurant: ["order_food", "reserve_table"],
    cafe: ["order_food", "reserve_table"],
    bar: ["order_food", "reserve_table"],
    hotel: ["book_stay", "inquire"],
    villa: ["book_stay", "inquire"],
    apartment: ["book_stay", "inquire"],
    spa: ["book_activity", "inquire"],
    gym: ["book_activity", "inquire"],
    activity: ["book_activity", "inquire"],
    tour: ["book_activity", "inquire"],
    experience: ["book_activity", "inquire"],
    event: ["register_event", "inquire"],
    service: ["request_service", "inquire"],
    grocery: ["order_supplies"],
    pharmacy: ["order_supplies"],
    gas_station: ["order_supplies"],
    atm: ["inquire"],
    other: ["inquire"],
};

export const DEFAULT_TEMPLATES: Partial<Record<MerveActionType, string>> = {
    order_food: `🍕 New Order\n\nFrom: {customerName}\nPhone: {customerPhone}\n\nItems:\n{orderItems}\n\nTotal: {total}\nDelivery: {deliveryAddress}`,
    reserve_table: `📅 Table Reservation\n\nCustomer: {customerName}\nPhone: {customerPhone}\nDate: {date}\nTime: {time}\n{notes}`,
    request_service: `🔧 Service Request\n\nService: {serviceType}\nCustomer: {customerName}\nPhone: {customerPhone}\nAddress: {address}\n\nDetails: {description}`,
    book_activity: `🎯 Activity Booking\n\nActivity: {activityName}\nCustomer: {customerName}\nDate: {date}\nGuests: {guests}\n\nNotes: {notes}`,
    book_stay: `🏨 Stay Booking\n\nProperty: {propertyName}\nGuest: {customerName}\nPhone: {customerPhone}\nDates: {checkIn} → {checkOut}\nGuests: {guests}\n\nTotal: {total}`,
    register_event: `🎟️ Event Registration\n\nEvent: {eventName}\nDate: {eventDate}\n\nAttendee: {customerName}\nPhone: {customerPhone}\nTickets: {ticketCount}`,
    inquire: `💬 General Inquiry\n\nFrom: {customerName}\nPhone: {customerPhone}\n\nMessage: {message}`,
};

export const INGEST_KIND_OPTIONS: { value: IngestKind | ""; label: string }[] = [
    { value: "", label: "None" },
    { value: "offerings", label: "Offerings" },
    { value: "menu", label: "Menu" },
    { value: "rooms", label: "Rooms" },
    { value: "services", label: "Services" },
    { value: "schedule", label: "Schedule" },
];
