"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailNotificationTool = exports.sendAppNotificationTool = exports.sendWhatsAppMessageTool = void 0;
var generative_ai_1 = require("@google/generative-ai");
exports.sendWhatsAppMessageTool = {
    name: "sendWhatsAppMessage",
    description: "Send a WhatsApp summary to the user or agent.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            recipient: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["recipient", "message"],
    },
};
exports.sendAppNotificationTool = {
    name: "sendAppNotification",
    description: "Send an in-app notification.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            userId: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["userId", "message"],
    },
};
exports.sendEmailNotificationTool = {
    name: "sendEmailNotification",
    description: "Send an email notification.",
    parameters: {
        type: generative_ai_1.SchemaType.OBJECT,
        properties: {
            email: { type: generative_ai_1.SchemaType.STRING },
            subject: { type: generative_ai_1.SchemaType.STRING },
            message: { type: generative_ai_1.SchemaType.STRING },
        },
        required: ["email", "subject", "message"],
    },
};
