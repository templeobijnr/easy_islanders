import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const updateBusinessInfoTool: FunctionDeclaration = {
  name: "updateBusinessInfo",
  description: "Update business profile info.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      businessId: { type: SchemaType.STRING },
      name: { type: SchemaType.STRING },
      description: { type: SchemaType.STRING },
      phone: { type: SchemaType.STRING },
    },
    required: ["businessId"],
  },
};

export const updateBusinessAvailabilityTool: FunctionDeclaration = {
  name: "updateBusinessAvailability",
  description: "Update availability/slots for a business.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      businessId: { type: SchemaType.STRING },
      availability: { type: SchemaType.STRING },
    },
    required: ["businessId"],
  },
};

export const updateBusinessHoursTool: FunctionDeclaration = {
  name: "updateBusinessHours",
  description: "Update opening hours.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      businessId: { type: SchemaType.STRING },
      hours: { type: SchemaType.STRING },
    },
    required: ["businessId"],
  },
};

export const uploadBusinessMediaTool: FunctionDeclaration = {
  name: "uploadBusinessMedia",
  description: "Save media references for a business.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      businessId: { type: SchemaType.STRING },
      mediaUrl: { type: SchemaType.STRING },
    },
    required: ["businessId", "mediaUrl"],
  },
};

export const listBusinessLeadsTool: FunctionDeclaration = {
  name: "listBusinessLeads",
  description: "List recent leads for a business.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      businessId: { type: SchemaType.STRING },
    },
    required: ["businessId"],
  },
};

export const respondToLeadTool: FunctionDeclaration = {
  name: "respondToLead",
  description: "Respond to a lead for a business.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      businessId: { type: SchemaType.STRING },
      leadId: { type: SchemaType.STRING },
      message: { type: SchemaType.STRING },
    },
    required: ["businessId", "leadId", "message"],
  },
};
