"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultAddressTool = exports.createOrUpdateAddressTool = exports.listUserAddressesTool = void 0;
var generative_ai_1 = require("@google/generative-ai");
exports.listUserAddressesTool = {
    name: "listUserAddresses",
    description: "List the user's saved addresses (address book). Use before any delivery dispatch.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {},
    },
};
exports.createOrUpdateAddressTool = {
    name: "createOrUpdateAddress",
    description: "Create or update an address in the user's address book. Returns addressId. Requires confirmation before dispatching any delivery.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            addressId: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Optional existing address ID to update",
            },
            label: { type: generative_ai_1.SchemaType.STRING, description: "e.g., Home, Office" },
            line1: { type: generative_ai_1.SchemaType.STRING, description: "Street / building / area" },
            line2: { type: generative_ai_1.SchemaType.STRING, description: "Apartment / floor / extra details" },
            city: { type: generative_ai_1.SchemaType.STRING },
            region: { type: generative_ai_1.SchemaType.STRING, description: "State/region/province" },
            country: { type: generative_ai_1.SchemaType.STRING },
            accessNotes: {
                type: generative_ai_1.SchemaType.STRING,
                description: "Gate code, floor, delivery instructions",
            },
            coordinates: {
                type: generative_ai_1.SchemaType.OBJECT,
                properties: {
                    lat: { type: generative_ai_1.SchemaType.NUMBER },
                    lng: { type: generative_ai_1.SchemaType.NUMBER },
                },
            },
        },
        required: ["label", "line1", "city", "region", "country"],
    },
};
exports.setDefaultAddressTool = {
    name: "setDefaultAddress",
    description: "Set the user's default addressId for deliveries.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            addressId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["addressId"],
    },
};
