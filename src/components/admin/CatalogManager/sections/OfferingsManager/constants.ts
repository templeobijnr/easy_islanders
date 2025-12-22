/**
 * OfferingsManager Constants
 */
import type { IngestKind } from "./types";

export const CATEGORY_PRESETS: Record<IngestKind, string[]> = {
    menuItems: [
        "Starters",
        "Main Courses",
        "Kebabs",
        "Grills",
        "Seafood",
        "Salads",
        "Desserts",
        "Drinks",
        "Specials",
    ],
    services: [
        "Basic",
        "Standard",
        "Premium",
        "Emergency",
        "Installation",
        "Repair",
        "Maintenance",
    ],
    offerings: ["General"],
    tickets: ["General"],
    roomTypes: ["Standard Room", "Deluxe Room", "Suite", "Villa", "Add-ons"],
};

export function getKindLabel(kind: IngestKind): string {
    switch (kind) {
        case "menuItems":
            return "Menu Items";
        case "services":
            return "Services";
        case "offerings":
            return "Offerings";
        case "tickets":
            return "Tickets";
        case "roomTypes":
            return "Room Types";
    }
}

export function getItemLabel(kind: IngestKind): string {
    switch (kind) {
        case "menuItems":
            return "Menu Item";
        case "services":
            return "Service";
        case "offerings":
            return "Offering";
        case "tickets":
            return "Ticket";
        case "roomTypes":
            return "Room Type";
    }
}
