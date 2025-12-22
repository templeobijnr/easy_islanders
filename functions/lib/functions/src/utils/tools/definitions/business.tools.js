"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondToLeadTool = exports.listBusinessLeadsTool = exports.uploadBusinessMediaTool = exports.updateBusinessHoursTool = exports.updateBusinessAvailabilityTool = exports.updateBusinessInfoTool = void 0;
const generative_ai_1 = require("@google/generative-ai");
exports.updateBusinessInfoTool = {
    name: "updateBusinessInfo",
    description: "Update business profile info.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            name: { type: generative_ai_1.SchemaType.STRING },
            description: { type: generative_ai_1.SchemaType.STRING },
            phone: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["businessId"],
    },
};
exports.updateBusinessAvailabilityTool = {
    name: "updateBusinessAvailability",
    description: "Update availability/slots for a business.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            availability: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["businessId"],
    },
};
exports.updateBusinessHoursTool = {
    name: "updateBusinessHours",
    description: "Update opening hours.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            hours: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["businessId"],
    },
};
exports.uploadBusinessMediaTool = {
    name: "uploadBusinessMedia",
    description: "Save media references for a business.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            mediaUrl: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["businessId", "mediaUrl"],
    },
};
exports.listBusinessLeadsTool = {
    name: "listBusinessLeads",
    description: "List recent leads for a business.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["businessId"],
    },
};
exports.respondToLeadTool = {
    name: "respondToLead",
    description: "Respond to a lead for a business.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            businessId: { type: generative_ai_1.SchemaType.STRING },
            leadId: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["businessId", "leadId", "message"],
    },
};
//# sourceMappingURL=business.tools.js.map