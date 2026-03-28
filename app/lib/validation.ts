import { z } from 'zod';
import { normalizeWhatsAppIdentity, isLikelyPhoneIdentity, isLikelyBusinessScopedUserId } from './whatsappIdentity';

// Phone number validation - WhatsApp format
export const phoneNumberSchema = z
  .string()
  .regex(/^(\+?[1-9]\d{1,14})$/, 'Phone number must be in international format (e.g., +1234567890 or 1234567890)')
  .min(10, 'Phone number too short')
  .max(15, 'Phone number too long')
  .transform((val) => {
    const cleaned = val.trim();
    // Ensure it starts with + for WhatsApp API
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  });

export const whatsappRecipientSchema = z
  .string()
  .min(1, 'Recipient is required')
  .max(128, 'Recipient is too long')
  .transform((val) => normalizeWhatsAppIdentity(val))
  .refine(
    (val) => isLikelyPhoneIdentity(val) || isLikelyBusinessScopedUserId(val),
    'Recipient must be a phone number or a WhatsApp business-scoped user ID'
  );

// Message validation
export const messageSchema = z.object({
  text: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message too long (max 1000 characters)')
    .transform((val) => val.trim()),
  to: whatsappRecipientSchema,
});

// Template validation
export const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  language: z.string().min(2, 'Language code is required'),
  status: z.string().optional(),
  category: z.string().optional(),
  components: z.array(z.any()).optional(),
});

// Template variables validation
export const templateVariablesSchema = z.record(
  z.string(),
  z.string().min(1, 'Variable value cannot be empty')
);

// API request validation
export const sendMessageSchema = z.object({
  to: whatsappRecipientSchema,
  text: z.string().min(1, 'Message text is required').max(1000),
  numberId: z.string().min(1, 'Number ID is required'),
});

export const sendTemplateSchema = z.object({
  to: whatsappRecipientSchema,
  templateName: z.string().min(1, 'Template name is required'),
  language: z.string().min(2, 'Language code is required'),
  components: z.array(z.object({
    type: z.string(),
    parameters: z.array(z.any()),
  })).optional(),
  numberId: z.string().min(1, 'Number ID is required'),
});

export const fetchTemplatesSchema = z.object({
  wabaId: z.string().min(1, 'WABA ID is required'),
});

// Business number validation
export const businessNumberCreateSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100, 'Label too long'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  numberId: z.string().min(1, 'Number ID is required'),
  wabaId: z.string().min(1, 'WABA ID is required'),
  isActive: z.boolean().optional().default(true),
});

export const businessNumberUpdateSchema = businessNumberCreateSchema.partial();

// Form validation helpers
export const validatePhoneNumber = (phone: string): { success: true; data: string } | { success: false; error: string } => {
  try {
    return { success: true, data: phoneNumberSchema.parse(phone) };
  } catch (error) {
    return { success: false, error: 'Invalid phone number format' };
  }
};

export const validateMessage = (data: any): { success: true; data: any } | { success: false; error: string } => {
  try {
    return { success: true, data: messageSchema.parse(data) };
  } catch (error) {
    return { success: false, error: 'Invalid message data' };
  }
};

export const validateWhatsAppRecipient = (recipient: string): { success: true; data: string } | { success: false; error: string } => {
  try {
    return { success: true, data: whatsappRecipientSchema.parse(recipient) };
  } catch (error) {
    return { success: false, error: 'Invalid WhatsApp recipient identifier' };
  }
};

// Type exports for TypeScript
export type PhoneNumber = z.infer<typeof phoneNumberSchema>;
export type WhatsAppRecipient = z.infer<typeof whatsappRecipientSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Template = z.infer<typeof templateSchema>;
export type SendMessageRequest = z.infer<typeof sendMessageSchema>;
export type SendTemplateRequest = z.infer<typeof sendTemplateSchema>;
export type BusinessNumberCreate = z.infer<typeof businessNumberCreateSchema>;
export type BusinessNumberUpdate = z.infer<typeof businessNumberUpdateSchema>; 
