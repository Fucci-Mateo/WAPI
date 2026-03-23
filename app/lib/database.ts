import { PrismaClient, Prisma } from '@prisma/client';

// Global prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database service for messages
export class MessageDatabaseService {
  async addMessage(message: {
    from: string;
    to: string;
    text: string;
    type: 'SENT' | 'RECEIVED';
    status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    contactName?: string;
    whatsappMessageId?: string;
    conversationId?: string;
    userId?: string;
    templateParameters?: Record<string, any>;
  }) {
    try {
      const result = await prisma.message.create({
        data: {
          from: message.from,
          to: message.to,
          text: message.text,
          type: message.type,
          status: message.status || 'SENDING',
          contactName: message.contactName,
          whatsappMessageId: message.whatsappMessageId,
          conversationId: message.conversationId,
          userId: message.userId,
          templateParameters: message.templateParameters,
        },
      });
      
      console.log(`📝 Message stored in database: ${message.from} -> ${message.text}`);
      return result;
    } catch (error) {
      console.error('❌ Error storing message:', error);
      throw error;
    }
  }

  async updateMessageStatus(messageId: string, status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED') {
    try {
      const result = await prisma.message.update({
        where: { id: messageId },
        data: { status },
      });
      
      console.log(`📊 Message status updated in database: ${messageId} -> ${status}`);
      return result;
    } catch (error) {
      console.error('❌ Error updating message status:', error);
      throw error;
    }
  }

  async updateMessageStatusByWhatsAppId(whatsappMessageId: string, status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED') {
    try {
      const result = await prisma.message.updateMany({
        where: { whatsappMessageId },
        data: { status },
      });
      
      console.log(`📊 Message status updated by WhatsApp ID: ${whatsappMessageId} -> ${status}`);
      return result;
    } catch (error) {
      console.error('❌ Error updating message status by WhatsApp ID:', error);
      throw error;
    }
  }

  async getMessages(limit = 100, offset = 0) {
    try {
      return await prisma.message.findMany({
        orderBy: { timestamp: 'desc' as Prisma.SortOrder },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }
  }

  async getMessagesByPhoneNumber(phoneNumber: string, limit = 50, offset = 0) {
    try {
      return await prisma.message.findMany({
        where: {
          OR: [
            { from: phoneNumber },
            { to: phoneNumber },
          ],
        },
        orderBy: { timestamp: 'desc' as Prisma.SortOrder },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('❌ Error fetching messages by phone number:', error);
      throw error;
    }
  }

  async getMessagesByBusinessNumber(businessNumberId: string, limit = 100, offset = 0) {
    try {
      // Get business number from database to get the phone number
      const businessNumber = await prisma.businessNumber.findUnique({
        where: { numberId: businessNumberId },
      });

      if (!businessNumber) {
        console.warn(`⚠️ Business number not found: ${businessNumberId}`);
        return [];
      }

      const normalizedPhone = (phone: string) => {
        if (!phone) return '';
        let p = phone.startsWith('+') ? phone.substring(1) : phone;
        // Remove all spaces, parentheses, hyphens, and URL encoding
        return p.replace(/\s+/g, '').replace(/%20/g, '').replace(/[()-\s]/g, '');
      };

      // Normalize the phone number from database
      const toPhone = businessNumber.phoneNumber ? normalizedPhone(businessNumber.phoneNumber) : undefined;

      console.log('🔍 getMessagesByBusinessNumber query params:', {
        businessNumberId,
        businessPhoneNumber: businessNumber.phoneNumber,
        toPhone,
        limit,
        offset
      });

      const query = {
        where: {
          OR: [
            // Outbound messages sent from this business number (stored as numberId)
            { from: businessNumberId },
            // Inbound messages to this business' display phone number
            ...(toPhone ? [{ to: toPhone }] : []),
          ],
        },
        orderBy: { timestamp: 'desc' as Prisma.SortOrder },
        take: limit,
        skip: offset,
      };

      console.log('🔍 Prisma query:', JSON.stringify(query, null, 2));

      const result = await prisma.message.findMany(query);
      
      console.log(`🔍 Query returned ${result.length} messages`);
      if (result.length > 0) {
        console.log('🔍 Sample message:', {
          id: result[0].id,
          from: result[0].from,
          to: result[0].to,
          text: result[0].text?.substring(0, 50) + '...',
          type: result[0].type
        });
      }

      return result;
    } catch (error) {
      console.error('❌ Error fetching messages by business number:', error);
      throw error;
    }
  }

  async getContactName(phoneNumber: string) {
    try {
      const message = await prisma.message.findFirst({
        where: { from: phoneNumber },
        select: { contactName: true },
      });
      
      return message?.contactName || null;
    } catch (error) {
      console.error('❌ Error fetching contact name:', error);
      return null;
    }
  }

  async clearAllMessages() {
    try {
      const result = await prisma.message.deleteMany({});
      console.log(`🗑️ Cleared ${result.count} messages from database`);
      return result;
    } catch (error) {
      console.error('❌ Error clearing messages:', error);
      throw error;
    }
  }

  async getActiveContacts(businessNumberId: string) {
    try {
      // Get business number from database to get the phone number
      const businessNumber = await prisma.businessNumber.findUnique({
        where: { numberId: businessNumberId },
      });

      if (!businessNumber) {
        console.warn(`⚠️ Business number not found: ${businessNumberId}`);
        return [];
      }

      const normalizedPhone = (phone: string) => {
        if (!phone) return '';
        let p = phone.startsWith('+') ? phone.substring(1) : phone;
        // Remove all spaces, parentheses, hyphens, and URL encoding
        return p.replace(/\s+/g, '').replace(/%20/g, '').replace(/[()-\s]/g, '');
      };

      // Normalize the phone number from database
      const toPhone = businessNumber.phoneNumber ? normalizedPhone(businessNumber.phoneNumber) : undefined;

      // Get all messages for this business number
      const allMessages = await prisma.message.findMany({
        where: {
          OR: [
            // Outbound messages sent from this business number (stored as numberId)
            { from: businessNumberId },
            // Inbound messages to this business' display phone number
            ...(toPhone ? [{ to: toPhone }] : []),
          ],
        },
        orderBy: { timestamp: 'desc' as Prisma.SortOrder },
        select: {
          id: true,
          from: true,
          to: true,
          text: true,
          timestamp: true,
          type: true,
          status: true,
          templateParameters: true,
        },
      });

      // Group messages by contact phone number and get latest message for each
      const contactMap = new Map<string, {
        phoneNumber: string;
        lastMessage: string | null;
        lastMessageTimestamp: string | null;
        lastMessageType: 'sent' | 'received' | null;
        unreadCount: number;
        templateParameters: any;
      }>();

      // Helper to normalize phone numbers
      const normalize = (phone: string) => {
        if (!phone) return '';
        let p = phone.startsWith('+') ? phone.substring(1) : phone;
        return p.replace(/\s+/g, '').replace(/%20/g, '').replace(/[()-\s]/g, '');
      };

      const normalizedBusinessId = normalize(businessNumberId);
      const normalizedToPhone = toPhone ? normalize(toPhone) : null;

      for (const msg of allMessages) {
        // Determine the contact phone number (the one that's NOT the business number)
        let contactPhone: string | null = null;
        
        const normalizedFrom = normalize(msg.from);
        const normalizedTo = normalize(msg.to);

        if (normalizedFrom === normalizedBusinessId || normalizedFrom === normalizedToPhone) {
          // Message sent from business, so contact is the 'to'
          contactPhone = msg.to;
        } else if (normalizedTo === normalizedBusinessId || normalizedTo === normalizedToPhone) {
          // Message received by business, so contact is the 'from'
          contactPhone = msg.from;
        }

        if (!contactPhone) continue;

        const normalizedContactPhone = normalize(contactPhone);
        
        // Skip if this is the business number itself
        if (normalizedContactPhone === normalizedBusinessId || normalizedContactPhone === normalizedToPhone) {
          continue;
        }

        if (!contactMap.has(normalizedContactPhone)) {
          contactMap.set(normalizedContactPhone, {
            phoneNumber: contactPhone, // Keep original format
            lastMessage: null,
            lastMessageTimestamp: null,
            lastMessageType: null,
            unreadCount: 0,
            templateParameters: null,
          });
        }

        const contact = contactMap.get(normalizedContactPhone)!;
        
        // Update with latest message if this is the first one we've seen for this contact
        if (!contact.lastMessageTimestamp) {
          contact.lastMessage = msg.text;
          contact.lastMessageTimestamp = msg.timestamp.toISOString();
          contact.lastMessageType = msg.type.toLowerCase() as 'sent' | 'received';
          contact.templateParameters = msg.templateParameters;
        }

        // Count unread messages (received messages that are not READ)
        if (msg.type === 'RECEIVED' && msg.status !== 'READ') {
          contact.unreadCount++;
        }
      }

      // Convert map to array and sort by last message timestamp (newest first)
      const contacts = Array.from(contactMap.values()).sort((a, b) => {
        if (!a.lastMessageTimestamp) return 1;
        if (!b.lastMessageTimestamp) return -1;
        return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
      });

      return contacts;
    } catch (error) {
      console.error('❌ Error fetching active contacts:', error);
      throw error;
    }
  }
}

// Database service for customer service windows
export class CustomerServiceWindowDatabaseService {
  async openWindow(phoneNumber: string) {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      const result = await prisma.customerServiceWindow.upsert({
        where: { phoneNumber },
        update: {
          isOpen: true,
          openedAt: now,
          expiresAt,
          lastUserMessageAt: now,
          messageCount: {
            increment: 1,
          },
        },
        create: {
          phoneNumber,
          isOpen: true,
          openedAt: now,
          expiresAt,
          lastUserMessageAt: now,
          messageCount: 1,
        },
      });

      console.log(`🕐 Customer service window opened/refreshed for ${phoneNumber}`);
      return result;
    } catch (error) {
      console.error('❌ Error opening customer service window:', error);
      throw error;
    }
  }

  async getWindowStatus(phoneNumber: string) {
    try {
      const window = await prisma.customerServiceWindow.findUnique({
        where: { phoneNumber },
      });

      const now = new Date();
      
      if (!window) {
        return {
          isOpen: false,
          canSendFreeForm: false,
          canSendTemplate: true,
          timeRemaining: 0,
          expiresAt: now.toISOString(),
        };
      }

      const expiresAt = new Date(window.expiresAt);
      const timeRemaining = Math.max(0, expiresAt.getTime() - now.getTime());
      const isOpen = now < expiresAt;

      return {
        isOpen,
        canSendFreeForm: isOpen,
        canSendTemplate: true,
        timeRemaining,
        expiresAt: window.expiresAt.toISOString(),
      };
    } catch (error) {
      console.error('❌ Error getting window status:', error);
      return {
        isOpen: false,
        canSendFreeForm: false,
        canSendTemplate: true,
        timeRemaining: 0,
        expiresAt: new Date().toISOString(),
      };
    }
  }

  async cleanupExpiredWindows() {
    try {
      const result = await prisma.customerServiceWindow.updateMany({
        where: {
          expiresAt: {
            lte: new Date(),
          },
        },
        data: {
          isOpen: false,
        },
      });

      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired customer service windows`);
      }

      return result;
    } catch (error) {
      console.error('❌ Error cleaning up expired windows:', error);
      throw error;
    }
  }

  async getActiveWindows() {
    try {
      return await prisma.customerServiceWindow.findMany({
        where: {
          isOpen: true,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: { lastUserMessageAt: 'desc' as Prisma.SortOrder },
      });
    } catch (error) {
      console.error('❌ Error fetching active windows:', error);
      return [];
    }
  }
}

// Database service for contacts
export class ContactDatabaseService {
  async upsertContact(phoneNumber: string, name?: string, email?: string, company?: string, whatsappId?: string) {
    try {
      return await prisma.contact.upsert({
        where: { phoneNumber },
        update: {
          name: name || undefined,
          email: email || undefined,
          company: company || undefined,
          whatsappId: whatsappId || undefined,
        },
        create: {
          phoneNumber,
          name,
          email,
          company,
          whatsappId,
        },
      });
    } catch (error) {
      console.error('❌ Error upserting contact:', error);
      throw error;
    }
  }

  async getContact(phoneNumber: string) {
    try {
      return await prisma.contact.findUnique({
        where: { phoneNumber },
      });
    } catch (error) {
      console.error('❌ Error fetching contact:', error);
      return null;
    }
  }

  async searchContacts(query: string) {
    try {
      return await prisma.contact.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phoneNumber: { contains: query } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 10,
      });
    } catch (error) {
      console.error('❌ Error searching contacts:', error);
      return [];
    }
  }
}

// Database service for webhook logs
export class WebhookLogDatabaseService {
  async logWebhook(eventType: string, payload: any, processed = false, error?: string) {
    try {
      return await prisma.webhookLog.create({
        data: {
          eventType,
          payload,
          processed,
          error,
        },
      });
    } catch (error) {
      console.error('❌ Error logging webhook:', error);
      throw error;
    }
  }

  async getUnprocessedWebhooks() {
    try {
      return await prisma.webhookLog.findMany({
        where: { processed: false },
        orderBy: { createdAt: 'asc' as Prisma.SortOrder },
      });
    } catch (error) {
      console.error('❌ Error fetching unprocessed webhooks:', error);
      return [];
    }
  }
}

// Database service for business numbers
export class BusinessNumberDatabaseService {
  async getAll() {
    try {
      return await prisma.businessNumber.findMany({
        orderBy: { createdAt: 'asc' as Prisma.SortOrder },
      });
    } catch (error) {
      console.error('❌ Error fetching business numbers:', error);
      return [];
    }
  }

  async getActive() {
    try {
      return await prisma.businessNumber.findMany({
        where: { isActive: true },
        select: {
          id: true,
          label: true,
          phoneNumber: true,
          numberId: true,
          wabaId: true,
        },
        orderBy: { createdAt: 'asc' as Prisma.SortOrder },
      });
    } catch (error) {
      console.error('❌ Error fetching active business numbers:', error);
      return [];
    }
  }

  async getById(id: string) {
    try {
      return await prisma.businessNumber.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('❌ Error fetching business number by ID:', error);
      return null;
    }
  }

  async getByNumberId(numberId: string) {
    try {
      return await prisma.businessNumber.findUnique({
        where: { numberId },
      });
    } catch (error) {
      console.error('❌ Error fetching business number by numberId:', error);
      return null;
    }
  }

  async create(data: {
    label: string;
    phoneNumber: string;
    numberId: string;
    wabaId: string;
    isActive?: boolean;
  }) {
    try {
      const result = await prisma.businessNumber.create({
        data: {
          label: data.label,
          phoneNumber: data.phoneNumber,
          numberId: data.numberId,
          wabaId: data.wabaId,
          isActive: data.isActive ?? true,
        },
      });
      
      console.log(`📱 Business number created: ${data.label} (${data.numberId})`);
      return result;
    } catch (error) {
      console.error('❌ Error creating business number:', error);
      throw error;
    }
  }

  async update(id: string, data: {
    label?: string;
    phoneNumber?: string;
    numberId?: string;
    wabaId?: string;
    isActive?: boolean;
  }) {
    try {
      const result = await prisma.businessNumber.update({
        where: { id },
        data,
      });
      
      console.log(`📱 Business number updated: ${id}`);
      return result;
    } catch (error) {
      console.error('❌ Error updating business number:', error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const result = await prisma.businessNumber.delete({
        where: { id },
      });
      
      console.log(`📱 Business number deleted: ${id}`);
      return result;
    } catch (error) {
      console.error('❌ Error deleting business number:', error);
      throw error;
    }
  }

  async toggleActive(id: string) {
    try {
      const current = await prisma.businessNumber.findUnique({
        where: { id },
        select: { isActive: true },
      });

      if (!current) {
        throw new Error('Business number not found');
      }

      const result = await prisma.businessNumber.update({
        where: { id },
        data: { isActive: !current.isActive },
      });
      
      console.log(`📱 Business number ${id} toggled to ${result.isActive ? 'active' : 'inactive'}`);
      return result;
    } catch (error) {
      console.error('❌ Error toggling business number active status:', error);
      throw error;
    }
  }
}

// Database service for templates
export class TemplateDatabaseService {
  async getAll() {
    try {
      return await prisma.template.findMany({
        orderBy: { createdAt: 'desc' as Prisma.SortOrder },
      });
    } catch (error) {
      console.error('❌ Error fetching templates:', error);
      return [];
    }
  }

  async getById(id: string) {
    try {
      return await prisma.template.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('❌ Error fetching template:', error);
      return null;
    }
  }

  async updatePermissions(id: string, allowedUserIds: string[], allowedClientIds: string[]) {
    try {
      const result = await prisma.template.update({
        where: { id },
        data: {
          allowedUserIds,
          allowedClientIds,
        },
      });
      console.log(`📋 Template ${id} permissions updated`);
      return result;
    } catch (error) {
      console.error('❌ Error updating template permissions:', error);
      throw error;
    }
  }

  async canUserAccessTemplate(templateId: string, userId: string | null, userRole: string | null): Promise<boolean> {
    try {
      console.log('🔐 canUserAccessTemplate called:', { templateId, userId, userRole, userRoleType: typeof userRole });
      
      // Strict check: Only exact 'ADMIN' role can access all templates
      // Handle case sensitivity and null/undefined
      const normalizedRole = userRole?.toUpperCase()?.trim();
      if (normalizedRole === 'ADMIN') {
        console.log('✅ User is ADMIN, allowing access');
        return true;
      }

      // No user context – cannot access restricted templates
      if (!userId) {
        console.log('⚠️ No userId provided, denying access');
        return false;
      }

      const template = await prisma.template.findUnique({
        where: { id: templateId },
        select: {
          allowedUserIds: true,
        },
      });

      if (!template) {
        console.log('⚠️ Template not found, denying access');
        return false;
      }

      // Default: templates are restricted. Only explicitly allowed users (or admins) can access.
      // Empty allowedUserIds array means no one (except admins) can access
      const hasAccess = template.allowedUserIds.length > 0 && template.allowedUserIds.includes(userId);
      console.log('🔍 Permission check result:', {
        templateId,
        userId,
        userRole,
        normalizedRole,
        allowedUserIds: template.allowedUserIds,
        allowedUserIdsLength: template.allowedUserIds.length,
        hasAccess
      });
      
      return hasAccess;
    } catch (error) {
      console.error('❌ Error checking template access:', error);
      return false;
    }
  }

  async canClientAccessTemplate(templateId: string, clientId: string): Promise<boolean> {
    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
        select: {
          allowedClientIds: true,
        },
      });

      if (!template) {
        return false;
      }

      // Default: templates are restricted. Only explicitly allowed clients can access.
      if (template.allowedClientIds.length === 0) {
        return false;
      }

      return template.allowedClientIds.includes(clientId);
    } catch (error) {
      console.error('❌ Error checking template access for client:', error);
      return false;
    }
  }

  async getTemplatesForUser(userId: string | null, userRole: string | null) {
    try {
      console.log('🔍 getTemplatesForUser called:', { userId, userRole, userRoleType: typeof userRole });
      
      // Strict check: Only exact 'ADMIN' role can see all templates
      // Handle case sensitivity and null/undefined
      const normalizedRole = userRole?.toUpperCase()?.trim();
      if (normalizedRole === 'ADMIN') {
        console.log('✅ User is ADMIN, returning all templates');
        return await prisma.template.findMany({
          orderBy: { createdAt: 'desc' as Prisma.SortOrder },
        });
      }

      // No user context – non-admins cannot see any templates
      if (!userId) {
        console.log('⚠️ No userId provided, returning empty array');
        return [];
      }

      // Non-admins only see templates they are explicitly allowed to use
      // Empty allowedUserIds array means restricted (no access)
      const templates = await prisma.template.findMany({
        where: {
          allowedUserIds: { has: userId },
        },
        orderBy: { createdAt: 'desc' as Prisma.SortOrder },
        select: {
          id: true,
          name: true,
          language: true,
          allowedUserIds: true,
        },
      });
      
      console.log('📋 Templates found for user:', {
        userId,
        userRole,
        normalizedRole,
        templatesCount: templates.length,
        templateDetails: templates.map((t: any) => ({
          name: t.name,
          language: t.language,
          allowedUserIds: t.allowedUserIds,
          allowedUserIdsLength: t.allowedUserIds.length
        }))
      });
      
      return templates;
    } catch (error) {
      console.error('❌ Error fetching templates for user:', error);
      return [];
    }
  }
}

// Export service instances
export const messageDB = new MessageDatabaseService();
export const customerServiceWindowDB = new CustomerServiceWindowDatabaseService();
export const contactDB = new ContactDatabaseService();
export const webhookLogDB = new WebhookLogDatabaseService();
export const businessNumberDB = new BusinessNumberDatabaseService();
export const templateDB = new TemplateDatabaseService(); 