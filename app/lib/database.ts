import { PrismaClient, Prisma } from '@prisma/client';
import {
  getCanonicalContactIdentity,
  getContactIdentityAliases,
  isLikelyBusinessScopedUserId,
  isLikelyPhoneIdentity,
  normalizeWhatsAppIdentity,
  sameWhatsAppIdentity,
} from './whatsappIdentity';
import type { ActiveChat } from '../components/types';

// Global prisma instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function resolveBusinessNumberScope(numberId: string) {
  return prisma.businessNumber.findUnique({
    where: { numberId },
    select: {
      id: true,
      numberId: true,
      phoneNumber: true,
      wabaId: true,
      label: true,
      isActive: true,
    },
  });
}

async function resolveContactByIdentity(identity: string, wabaId?: string | null) {
  const normalizedIdentity = normalizeWhatsAppIdentity(identity);
  if (!normalizedIdentity) return null;

  return prisma.contact.findFirst({
    where: {
      ...(wabaId ? { wabaId } : {}),
      OR: [
        { phoneNumber: normalizedIdentity },
        { businessScopedUserId: normalizedIdentity },
        { whatsappId: normalizedIdentity },
      ],
    },
  });
}

type ConversationSummaryContact = {
  id: string;
  phoneNumber: string | null;
  businessScopedUserId: string | null;
  whatsappId: string | null;
  name: string | null;
};

type ConversationSummaryMessage = {
  from: string;
  to: string;
  text: string;
  type: 'SENT' | 'RECEIVED';
  status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  contactName?: string | null;
  templateParameters?: Record<string, any> | null;
  timestamp: Date | string;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function normalizeNullableIdentity(value: string | null | undefined): string | null {
  const normalized = normalizeWhatsAppIdentity(value);
  return normalized || null;
}

function getBusinessIdentityAliases(source: { numberId: string; phoneNumber: string | null | undefined }): string[] {
  return Array.from(
    new Set([
      normalizeWhatsAppIdentity(source.numberId),
      normalizeWhatsAppIdentity(source.phoneNumber),
    ].filter(Boolean))
  );
}

class ConversationSummaryDatabaseService {
  private async countUnreadMessagesForConversation(
    businessNumberId: string,
    businessIdentity: string,
    aliases: string[]
  ): Promise<number> {
    if (!businessIdentity || aliases.length === 0) {
      return 0;
    }

    return prisma.message.count({
      where: {
        type: 'RECEIVED',
        status: { not: 'READ' },
        to: businessIdentity,
        OR: aliases.map((alias) => ({ from: alias })),
      },
    });
  }

  private toActiveChat(summary: {
    chatKey: string;
    phoneNumber: string | null;
    businessScopedUserId: string | null;
    contactId: string | null;
    contactName: string | null;
    lastMessage: string | null;
    lastMessageTimestamp: Date | string | null;
    lastMessageType: 'SENT' | 'RECEIVED' | null;
    unreadCount: number;
    templateParameters: Prisma.JsonValue | null;
  }): ActiveChat & { templateParameters?: Prisma.JsonValue | null } {
    const templateParameters =
      summary.templateParameters && typeof summary.templateParameters === 'object' && !Array.isArray(summary.templateParameters)
        ? (summary.templateParameters as Record<string, any>)
        : null;

    return {
      phoneNumber: summary.phoneNumber || summary.chatKey,
      chatKey: summary.chatKey,
      contactId: summary.contactId,
      businessScopedUserId: summary.businessScopedUserId,
      contactName: summary.contactName,
      lastMessage: summary.lastMessage,
      lastMessageTimestamp: summary.lastMessageTimestamp ? toDate(summary.lastMessageTimestamp).toISOString() : null,
      lastMessageType: summary.lastMessageType ? (summary.lastMessageType.toLowerCase() as ActiveChat['lastMessageType']) : null,
      unreadCount: summary.unreadCount,
      templateParameters,
    };
  }

  private resolveContactFields(
    customerIdentity: string,
    contact: ConversationSummaryContact | null
  ) {
    const normalizedCustomerIdentity = normalizeWhatsAppIdentity(customerIdentity);

    const phoneNumber = contact?.phoneNumber || (isLikelyPhoneIdentity(normalizedCustomerIdentity) ? normalizedCustomerIdentity : null);
    const businessScopedUserId =
      contact?.businessScopedUserId ||
      (isLikelyBusinessScopedUserId(normalizedCustomerIdentity) ? normalizedCustomerIdentity : null);

    return {
      phoneNumber,
      businessScopedUserId,
      contactId: contact?.id || null,
      contactName: contact?.name || null,
      normalizedCustomerIdentity,
    };
  }

  async getActiveChats(businessNumberId: string): Promise<ActiveChat[]> {
    const summaries = await prisma.conversationSummary.findMany({
      where: { businessNumberId },
      orderBy: { lastMessageTimestamp: 'desc' as Prisma.SortOrder },
    });

    if (summaries.length > 0) {
      return summaries.map((summary) => this.toActiveChat(summary as any));
    }

    // Backward-compatible fallback: build the summaries once from the legacy scan path.
    const legacyChats = await new MessageDatabaseService().getActiveContactsLegacy(businessNumberId);
    if (legacyChats.length > 0) {
      await this.replaceBusinessNumberSummaries(businessNumberId, legacyChats);
    }

    return legacyChats;
  }

  async getActiveContacts(businessNumberId: string): Promise<ActiveChat[]> {
    return this.getActiveChats(businessNumberId);
  }

  async replaceBusinessNumberSummaries(businessNumberId: string, activeChats: ActiveChat[]) {
    await prisma.conversationSummary.deleteMany({
      where: { businessNumberId },
    });

    const now = new Date();
    const rows = activeChats.map((chat) => ({
      businessNumberId,
      chatKey: normalizeWhatsAppIdentity(chat.chatKey || chat.phoneNumber),
      phoneNumber: normalizeNullableIdentity(chat.phoneNumber) || normalizeNullableIdentity(chat.chatKey),
      businessScopedUserId: normalizeNullableIdentity(chat.businessScopedUserId),
      contactId: chat.contactId || null,
      contactName: chat.contactName || null,
      lastMessage: chat.lastMessage || null,
      lastMessageTimestamp: chat.lastMessageTimestamp ? toDate(chat.lastMessageTimestamp) : null,
      lastMessageType: chat.lastMessageType ? (chat.lastMessageType.toUpperCase() as 'SENT' | 'RECEIVED') : null,
      unreadCount: chat.unreadCount || 0,
      templateParameters:
        (chat as ActiveChat & { templateParameters?: Prisma.JsonValue | null }).templateParameters == null
          ? Prisma.DbNull
          : ((chat as ActiveChat & { templateParameters?: Prisma.JsonValue | null }).templateParameters as Prisma.InputJsonValue | undefined),
      createdAt: now,
      updatedAt: now,
    }));

    for (const batch of chunkArray(rows, 500)) {
      if (batch.length === 0) continue;
      await prisma.conversationSummary.createMany({
        data: batch,
        skipDuplicates: true,
      });
    }
  }

  async upsertFromMessage(params: {
    businessNumberId: string;
    message: ConversationSummaryMessage;
    contact?: ConversationSummaryContact | null;
    businessScope?: string | null;
  }): Promise<ActiveChat | null> {
    const { businessNumberId, message, businessScope } = params;
    const businessNumber = await resolveBusinessNumberScope(businessNumberId);
    if (!businessNumber) return null;

    const customerIdentity = message.type === 'SENT' ? message.to : message.from;
    const contact = params.contact || (businessScope ? await resolveContactByIdentity(customerIdentity, businessScope) : await resolveContactByIdentity(customerIdentity));
    const chatKey = contact ? getCanonicalContactIdentity(contact) : normalizeWhatsAppIdentity(customerIdentity);
    if (!chatKey) return null;

    const contactFields = this.resolveContactFields(customerIdentity, contact);
    const businessIdentity = normalizeWhatsAppIdentity(businessNumber.phoneNumber);
    const aliases = contact ? getContactIdentityAliases(contact).filter(Boolean) : [contactFields.normalizedCustomerIdentity].filter(Boolean);

    const baseData = {
      businessNumberId,
      chatKey,
      phoneNumber: contactFields.phoneNumber,
      businessScopedUserId: contactFields.businessScopedUserId,
      contactId: contactFields.contactId,
      contactName: contactFields.contactName || message.contactName || null,
      lastMessage: message.text || null,
      lastMessageTimestamp: toDate(message.timestamp),
      lastMessageType: message.type,
      templateParameters: message.templateParameters,
    };

    const existing = await prisma.conversationSummary.findUnique({
      where: {
        businessNumberId_chatKey: {
          businessNumberId,
          chatKey,
        },
      },
      select: {
        unreadCount: true,
      },
    });

    if (existing) {
      const data: Prisma.ConversationSummaryUpdateInput = {
        ...baseData,
        contactId: baseData.contactId || undefined,
        contactName: baseData.contactName || undefined,
        businessScopedUserId: baseData.businessScopedUserId || undefined,
        phoneNumber: baseData.phoneNumber || undefined,
        templateParameters:
          baseData.templateParameters == null
            ? Prisma.DbNull
            : (baseData.templateParameters as Prisma.InputJsonValue),
      };

      if (message.type === 'RECEIVED') {
        data.unreadCount = {
          increment: 1,
        };
      }

      const updated = await prisma.conversationSummary.update({
        where: {
          businessNumberId_chatKey: {
            businessNumberId,
            chatKey,
          },
        },
        data,
      });

      return this.toActiveChat(updated as any);
    }

    const unreadCount = await this.countUnreadMessagesForConversation(
      businessNumberId,
      businessIdentity,
      aliases
    );

    const created = await prisma.conversationSummary.create({
        data: {
          ...baseData,
          unreadCount,
          templateParameters:
          baseData.templateParameters == null
            ? Prisma.DbNull
            : (baseData.templateParameters as Prisma.InputJsonValue),
      },
    });

    return this.toActiveChat(created as any);
  }

  async recalculateUnreadCount(params: {
    businessNumberId: string;
    customerIdentity: string;
    contact?: ConversationSummaryContact | null;
    businessScope?: string | null;
  }): Promise<ActiveChat | null> {
    const { businessNumberId, customerIdentity, businessScope } = params;
    const businessNumber = await resolveBusinessNumberScope(businessNumberId);
    if (!businessNumber) return null;

    const contact = params.contact || (businessScope ? await resolveContactByIdentity(customerIdentity, businessScope) : await resolveContactByIdentity(customerIdentity));
    const chatKey = contact ? getCanonicalContactIdentity(contact) : normalizeWhatsAppIdentity(customerIdentity);
    if (!chatKey) return null;

    const contactFields = this.resolveContactFields(customerIdentity, contact);
    const businessIdentity = normalizeWhatsAppIdentity(businessNumber.phoneNumber);
    const aliases = contact ? getContactIdentityAliases(contact).filter(Boolean) : [contactFields.normalizedCustomerIdentity].filter(Boolean);
    const unreadCount = await this.countUnreadMessagesForConversation(businessNumberId, businessIdentity, aliases);

    const updated = await prisma.conversationSummary.upsert({
      where: {
        businessNumberId_chatKey: {
          businessNumberId,
          chatKey,
        },
      },
      create: {
        businessNumberId,
        chatKey,
        phoneNumber: contactFields.phoneNumber,
        businessScopedUserId: contactFields.businessScopedUserId,
        contactId: contactFields.contactId,
        contactName: contactFields.contactName,
        unreadCount,
      },
      update: {
        phoneNumber: contactFields.phoneNumber || undefined,
        businessScopedUserId: contactFields.businessScopedUserId || undefined,
        contactId: contactFields.contactId || undefined,
        contactName: contactFields.contactName || undefined,
        unreadCount,
      },
    });

    return this.toActiveChat(updated as any);
  }
}

export const conversationSummaryDB = new ConversationSummaryDatabaseService();

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

  async getMessagesByPhoneNumber(phoneNumber: string, limit = 50, offset = 0, wabaId?: string | null) {
    try {
      const contact = wabaId ? await resolveContactByIdentity(phoneNumber, wabaId) : await resolveContactByIdentity(phoneNumber);
      const aliases = contact ? getContactIdentityAliases(contact) : [normalizeWhatsAppIdentity(phoneNumber)];
      const uniqueAliases = Array.from(new Set(aliases.filter(Boolean)));

      return await prisma.message.findMany({
        where: {
          OR: uniqueAliases.flatMap((alias) => ([
            { from: alias },
            { to: alias },
          ])),
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

  async getMessagesForConversation(businessNumberId: string, customerIdentity: string, limit = 50, offset = 0) {
    try {
      const businessNumber = await resolveBusinessNumberScope(businessNumberId);

      if (!businessNumber) {
        console.warn(`⚠️ Business number not found: ${businessNumberId}`);
        return [];
      }

      const normalizedCustomerIdentity = normalizeWhatsAppIdentity(customerIdentity);
      if (!normalizedCustomerIdentity) {
        return [];
      }

      const contact = businessNumber.wabaId
        ? await resolveContactByIdentity(normalizedCustomerIdentity, businessNumber.wabaId)
        : await resolveContactByIdentity(normalizedCustomerIdentity);
      const customerAliases = (contact ? getContactIdentityAliases(contact) : [normalizedCustomerIdentity]).filter(Boolean);
      const businessAliases = getBusinessIdentityAliases({
        numberId: businessNumber.numberId,
        phoneNumber: businessNumber.phoneNumber,
      });

      if (customerAliases.length === 0 || businessAliases.length === 0) {
        return [];
      }

      return await prisma.message.findMany({
        where: {
          OR: customerAliases.flatMap((customerAlias) =>
            businessAliases.flatMap((businessAlias) => ([
              { from: businessAlias, to: customerAlias },
              { from: customerAlias, to: businessAlias },
            ]))
          ),
        },
        orderBy: { timestamp: 'desc' as Prisma.SortOrder },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error('❌ Error fetching conversation messages by business number:', error);
      throw error;
    }
  }

  async getMessagesByBusinessNumber(businessNumberId: string, limit = 100, offset = 0) {
    try {
      const businessNumber = await resolveBusinessNumberScope(businessNumberId);

      if (!businessNumber) {
        console.warn(`⚠️ Business number not found: ${businessNumberId}`);
        return [];
      }

      const businessAliases = getBusinessIdentityAliases({
        numberId: businessNumber.numberId,
        phoneNumber: businessNumber.phoneNumber,
      });

      console.log('🔍 getMessagesByBusinessNumber query params:', {
        businessNumberId,
        businessPhoneNumber: businessNumber.phoneNumber,
        businessAliases,
        limit,
        offset
      });

      const query = {
        where: {
          OR: businessAliases.flatMap((businessAlias) => ([{ from: businessAlias }, { to: businessAlias }])),
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

  async getContactName(phoneNumber: string, wabaId?: string | null) {
    try {
      const contact = await resolveContactByIdentity(phoneNumber, wabaId);
      return contact?.name || null;
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
    return conversationSummaryDB.getActiveContacts(businessNumberId);
  }

  async getActiveContactsLegacy(businessNumberId: string) {
    try {
      const businessNumber = await resolveBusinessNumberScope(businessNumberId);

      if (!businessNumber) {
        console.warn(`⚠️ Business number not found: ${businessNumberId}`);
        return [];
      }

      const toIdentity = normalizeWhatsAppIdentity(businessNumber.phoneNumber);
      const businessAliases = getBusinessIdentityAliases({
        numberId: businessNumber.numberId,
        phoneNumber: businessNumber.phoneNumber,
      });
      const businessScope = businessNumber.wabaId;

      const scopeContacts = businessScope
        ? await prisma.contact.findMany({
            where: { wabaId: businessScope },
            select: {
              id: true,
              phoneNumber: true,
              businessScopedUserId: true,
              whatsappId: true,
              name: true,
            },
          })
        : [];

      const identityToContact = new Map<string, {
        id: string;
        phoneNumber: string | null;
        businessScopedUserId: string | null;
        whatsappId: string | null;
        name: string | null;
      }>();

      for (const contact of scopeContacts) {
        for (const alias of getContactIdentityAliases(contact)) {
          identityToContact.set(alias, contact);
        }
      }

      // Get all messages for this business number
      const allMessages = await prisma.message.findMany({
        where: {
          OR: businessAliases.flatMap((businessAlias) => ([{ from: businessAlias }, { to: businessAlias }])),
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
        chatKey: string;
        phoneNumber: string;
        businessScopedUserId: string | null;
        contactId: string | null;
        lastMessage: string | null;
        lastMessageTimestamp: string | null;
        lastMessageType: 'sent' | 'received' | null;
        unreadCount: number;
        templateParameters: any;
        contactName: string | null;
      }>();

      for (const msg of allMessages) {
        const normalizedFrom = normalizeWhatsAppIdentity(msg.from);
        const normalizedTo = normalizeWhatsAppIdentity(msg.to);

        let contactIdentity: string | null = null;
        if (normalizedFrom === businessNumberId || sameWhatsAppIdentity(normalizedFrom, toIdentity)) {
          contactIdentity = normalizedTo;
        } else if (normalizedTo === businessNumberId || sameWhatsAppIdentity(normalizedTo, toIdentity)) {
          contactIdentity = normalizedFrom;
        }

        if (!contactIdentity) continue;

        const contactRecord = identityToContact.get(contactIdentity) || await resolveContactByIdentity(contactIdentity, businessScope);
        const chatKey = contactRecord ? getCanonicalContactIdentity(contactRecord) : normalizeWhatsAppIdentity(contactIdentity);

        if (!chatKey) continue;

        if (!contactMap.has(chatKey)) {
          contactMap.set(chatKey, {
            chatKey,
            phoneNumber: contactRecord?.phoneNumber || contactIdentity,
            businessScopedUserId: contactRecord?.businessScopedUserId || null,
            contactId: contactRecord?.id || null,
            lastMessage: null,
            lastMessageTimestamp: null,
            lastMessageType: null,
            unreadCount: 0,
            templateParameters: null,
            contactName: contactRecord?.name || null,
          });
        }

        const contact = contactMap.get(chatKey)!;
        
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
  async openWindow(wabaId: string, phoneNumber: string) {
    try {
      const scopeId = wabaId || 'legacy';
      const contactKey = normalizeWhatsAppIdentity(phoneNumber);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

      const result = await prisma.customerServiceWindow.upsert({
        where: {
          wabaId_phoneNumber: {
            wabaId: scopeId,
            phoneNumber: contactKey,
          },
        },
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
          wabaId: scopeId,
          phoneNumber: contactKey,
          isOpen: true,
          openedAt: now,
          expiresAt,
          lastUserMessageAt: now,
          messageCount: 1,
        },
      });
      
      console.log(`🕐 Customer service window opened/refreshed for ${contactKey} (${scopeId})`);
      return result;
    } catch (error) {
      console.error('❌ Error opening customer service window:', error);
      throw error;
    }
  }

  async getWindowStatus(wabaId: string, phoneNumber: string) {
    try {
      const scopeId = wabaId || 'legacy';
      const contactKey = normalizeWhatsAppIdentity(phoneNumber);
      const window = await prisma.customerServiceWindow.findUnique({
        where: {
          wabaId_phoneNumber: {
            wabaId: scopeId,
            phoneNumber: contactKey,
          },
        },
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
  async upsertContact(data: {
    wabaId: string;
    phoneNumber?: string | null;
    businessScopedUserId?: string | null;
    name?: string | null;
    email?: string | null;
    company?: string | null;
    whatsappId?: string | null;
  }) {
    try {
      const wabaId = data.wabaId || 'legacy';
      const phoneNumber = normalizeWhatsAppIdentity(data.phoneNumber);
      const businessScopedUserId = normalizeWhatsAppIdentity(data.businessScopedUserId);
      const whatsappId = normalizeWhatsAppIdentity(data.whatsappId);
      const name = data.name?.trim() || null;
      const email = data.email?.trim() || null;
      const company = data.company?.trim() || null;
      const pick = (...values: Array<string | null | undefined>) => values.find((value) => value && value.trim()) || null;

      const byPhone = phoneNumber
        ? await prisma.contact.findUnique({
            where: {
              wabaId_phoneNumber: {
                wabaId,
                phoneNumber,
              },
            },
          })
        : null;

      const byBsuid = businessScopedUserId
        ? await prisma.contact.findUnique({
            where: {
              wabaId_businessScopedUserId: {
                wabaId,
                businessScopedUserId,
              },
            },
          })
        : null;

      const byLegacy = !byPhone && !byBsuid && whatsappId
        ? await prisma.contact.findFirst({
            where: {
              wabaId,
              whatsappId,
            },
          })
        : null;

      const existing = byPhone || byBsuid || byLegacy;

      if (!existing) {
        return await prisma.contact.create({
          data: {
            wabaId,
            phoneNumber: phoneNumber || null,
            businessScopedUserId: businessScopedUserId || null,
            name: name || undefined,
            email: email || undefined,
            company: company || undefined,
            whatsappId: whatsappId || undefined,
          },
        });
      }

      const finalPhoneNumber = pick(
        phoneNumber,
        byPhone?.phoneNumber,
        byBsuid?.phoneNumber,
        byLegacy?.phoneNumber,
        existing.phoneNumber,
      );
      const finalBusinessScopedUserId = pick(
        businessScopedUserId,
        byPhone?.businessScopedUserId,
        byBsuid?.businessScopedUserId,
        byLegacy?.businessScopedUserId,
        existing.businessScopedUserId,
      );
      const finalWhatsappId = pick(
        whatsappId,
        byPhone?.whatsappId,
        byBsuid?.whatsappId,
        byLegacy?.whatsappId,
        existing.whatsappId,
      );
      const finalName = pick(name, byPhone?.name, byBsuid?.name, byLegacy?.name, existing.name);
      const finalEmail = pick(email, byPhone?.email, byBsuid?.email, byLegacy?.email, existing.email);
      const finalCompany = pick(company, byPhone?.company, byBsuid?.company, byLegacy?.company, existing.company);

      // If the phone and BSUID currently live on separate rows, merge them into a single record.
      if (byPhone && byBsuid && byPhone.id !== byBsuid.id) {
        const base = byPhone;
        const duplicate = byBsuid;
        const preferred = base.businessScopedUserId ? base : duplicate;
        const secondary = preferred.id === base.id ? duplicate : base;

        const mergedRecord = await prisma.$transaction(async (tx) => {
          await tx.contact.delete({
            where: { id: secondary.id },
          });

          return tx.contact.update({
            where: { id: preferred.id },
            data: {
              wabaId,
              phoneNumber: preferred.phoneNumber || finalPhoneNumber || undefined,
              businessScopedUserId: preferred.businessScopedUserId || finalBusinessScopedUserId || undefined,
              name: finalName || undefined,
              email: finalEmail || undefined,
              company: finalCompany || undefined,
              whatsappId: finalWhatsappId || undefined,
            },
          });
        });

        return mergedRecord;
      }

      return await prisma.contact.update({
        where: { id: existing.id },
        data: {
          wabaId,
          phoneNumber: finalPhoneNumber || undefined,
          businessScopedUserId: finalBusinessScopedUserId || undefined,
          name: finalName || undefined,
          email: finalEmail || undefined,
          company: finalCompany || undefined,
          whatsappId: finalWhatsappId || undefined,
        },
      });
    } catch (error) {
      console.error('❌ Error upserting contact:', error);
      throw error;
    }
  }

  async getContact(phoneNumber: string, wabaId?: string | null) {
    try {
      return await resolveContactByIdentity(phoneNumber, wabaId);
    } catch (error) {
      console.error('❌ Error fetching contact:', error);
      return null;
    }
  }

  async searchContacts(query: string, wabaId?: string | null) {
    try {
      return await prisma.contact.findMany({
        where: {
          ...(wabaId ? { wabaId } : {}),
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phoneNumber: { contains: query } },
            { businessScopedUserId: { contains: query, mode: 'insensitive' } },
            { whatsappId: { contains: query, mode: 'insensitive' } },
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
