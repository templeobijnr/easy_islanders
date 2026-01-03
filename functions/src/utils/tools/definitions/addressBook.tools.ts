import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const listUserAddressesTool: FunctionDeclaration = {
  name: "listUserAddresses",
  description:
    "List the user's saved addresses (address book). Use before any delivery dispatch.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
  },
};

export const createOrUpdateAddressTool: FunctionDeclaration = {
  name: "createOrUpdateAddress",
  description:
    "Create or update an address in the user's address book. Returns addressId. Requires confirmation before dispatching any delivery.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      addressId: {
        type: SchemaType.STRING,
        description: "Optional existing address ID to update",
      },
      label: { type: SchemaType.STRING, description: "e.g., Home, Office" },
      line1: { type: SchemaType.STRING, description: "Street / building / area" },
      line2: { type: SchemaType.STRING, description: "Apartment / floor / extra details" },
      city: { type: SchemaType.STRING },
      region: { type: SchemaType.STRING, description: "State/region/province" },
      country: { type: SchemaType.STRING },
      accessNotes: {
        type: SchemaType.STRING,
        description: "Gate code, floor, delivery instructions",
      },
      coordinates: {
        type: SchemaType.OBJECT,
        properties: {
          lat: { type: SchemaType.NUMBER },
          lng: { type: SchemaType.NUMBER },
        },
      },
    },
    required: ["label", "line1", "city", "region", "country"],
  },
};

export const setDefaultAddressTool: FunctionDeclaration = {
  name: "setDefaultAddress",
  description: "Set the user's default addressId for deliveries.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      addressId: { type: SchemaType.STRING },
    },
    required: ["addressId"],
  },
};




