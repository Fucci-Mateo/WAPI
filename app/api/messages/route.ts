import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { MessageDatabaseService, ContactDatabaseService, BusinessNumberDatabaseService, templateDB, prisma } from '../../lib/database';
import { getCanonicalContactIdentity, getContactIdentityAliases, normalizeWhatsAppIdentity } from '../../lib/whatsappIdentity';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function resolveDisplayPhone(numberId: string): Promise<string | null> {
  if (!ACCESS_TOKEN) return null;
  try {
    const res = await fetch(`${WHATSAPP_API_URL}/${numberId}?fields=display_phone_number`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    const disp: string | undefined = data?.display_phone_number;
    if (!disp) return null;
    return disp.replace(/^\\+/, '').replace(/\\s+/g, '');
  } catch {
    return null;
  }
}

const messageService = new MessageDatabaseService();
const contactService = new ContactDatabaseService();
const businessNumberService = new BusinessNumberDatabaseService();

/**
 * Format template components into readable text
 * Extracts text from HEADER, BODY, and FOOTER components
 * Replaces {{1}}, {{2}}, etc. (or {{member_name}}, {{period}}, etc.) with actual parameter values if provided.
 *
 * NOTE:
 * - WhatsApp templates may expose placeholders as {{1}}, {{2}} or as named placeholders like {{member_name}}.
 * - We store parameters positionally per component as:
 *     { "HEADER_0": "value1", "BODY_0": "value2", "BODY_1": "value3", ... }
 * - This helper therefore supports BOTH numeric and named placeholders:
 *     - If the placeholder content is a number → we map it to that 1‑based index.
 *     - Otherwise we fall back to "the Nth placeholder in this component" for that component type.
 */
function formatTemplateContent(components: any[], templateParameters?: Record<string, any>): string {
  if (!Array.isArray(components)) {
    return '';
  }

  const parts: string[] = [];

  for (const component of components) {
    if (!component || typeof component !== 'object') {
      continue;
    }

    const type = component.type?.toUpperCase();
    const text = component.text;

    if (!text) {
      continue;
    }

    let formattedText = text;

    // Replace {{1}}, {{2}} or {{member_name}}, etc. with actual parameter values if available
    if (templateParameters) {
      // Counter of placeholders within this specific component text
      let ordinalIndex = 0;

      formattedText = text.replace(/\{\{([^}]+)\}\}/g, (match: string, inner: string) => {
        let paramKey: string | null = null;

        // Try numeric placeholder first (e.g. {{1}})
        const numericIndex = Number(inner);
        if (!Number.isNaN(numericIndex) && numericIndex > 0) {
          // Stored index is 0-based
          paramKey = `${type}_${numericIndex - 1}`;
        } else {
          // Fallback: use the Nth placeholder for this component type
          paramKey = `${type}_${ordinalIndex}`;
        }

        ordinalIndex += 1;

        if (!paramKey) return match;
        const paramValue = templateParameters[paramKey];

        if (paramValue !== undefined && paramValue !== null) {
          return String(paramValue);
        }
        // Fallback to original placeholder if parameter not found
        return match;
      });
    } else {
      // No parameters stored, use a generic placeholder marker for any double‑braced token
      formattedText = text.replace(/\{\{([^}]+)\}\}/g, '[...]');
    }

    switch (type) {
      case 'HEADER':
        parts.push(formattedText);
        break;
      case 'BODY':
        parts.push(formattedText);
        break;
      case 'FOOTER':
        // Footer text (usually no variables)
        parts.push(formattedText);
        break;
      default:
        // Other component types (buttons, etc.) - just show text if available
        if (formattedText) {
          parts.push(formattedText);
        }
    }
  }

  return parts.join('\n\n').trim() || '[Template content]';
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const businessNumberId = searchParams.get('businessNumberId');
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const businessNumber = businessNumberId ? await businessNumberService.getByNumberId(businessNumberId) : null;
    const businessScope = businessNumber?.wabaId || null;
    const requestedConversationKey = phoneNumber ? normalizeWhatsAppIdentity(phoneNumber) : null;
    
    let messages;
    let hasMore = false;
    
    if (phoneNumber && businessNumberId) {
      messages = await messageService.getMessagesForConversation(businessNumberId, phoneNumber, limit + 1, offset);

      hasMore = messages.length > limit;
      if (hasMore) {
        messages = messages.slice(0, limit);
      }
    } else if (businessNumberId) {
      console.log('📨 Messages API - business number filtering:', {
        businessNumberId,
        offset,
        limit
      });
      
      // Filter by business number: the method will look up the phone number from the database
      // Fetch one more than requested to check if there are more messages
      messages = await messageService.getMessagesByBusinessNumber(businessNumberId, limit + 1, offset);
      
      // Check if there are more messages
      hasMore = messages.length > limit;
      
      // Trim to requested limit
      if (hasMore) {
        messages = messages.slice(0, limit);
      }
    } else if (phoneNumber) {
      // Filter by customer phone number (conversation with specific customer)
      // Fetch one more than requested to check if there are more messages
      messages = await messageService.getMessagesByPhoneNumber(phoneNumber, limit + 1, offset, businessScope);
      
      // Check if there are more messages
      hasMore = messages.length > limit;
      
      // Trim to requested limit
      if (hasMore) {
        messages = messages.slice(0, limit);
      }
    } else {
      // Get all messages
      // Fetch one more than requested to check if there are more messages
      messages = await messageService.getMessages(limit + 1, offset);
      
      // Check if there are more messages
      hasMore = messages.length > limit;
      
      // Trim to requested limit
      if (hasMore) {
        messages = messages.slice(0, limit);
      }
    }
    
    // Resolve conversation identities and contact names for each message.
    const contactNames: Record<string, string> = {};
    
    // Get user names for all unique userIds (for sent messages)
    const uniqueUserIds = new Set<string>();
    messages.forEach((msg: any) => {
      if (msg.userId) {
        uniqueUserIds.add(msg.userId);
      }
    });
    
    // Fetch user information from database
    const userMap: Record<string, { id: string; name: string | null; email: string }> = {};
    if (uniqueUserIds.size > 0) {
      try {
        const users = await prisma.user.findMany({
          where: {
            id: { in: Array.from(uniqueUserIds) }
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        });
        
        users.forEach((user) => {
          userMap[user.id] = {
            id: user.id,
            name: user.name,
            email: user.email
          };
        });
      } catch (error) {
        console.warn('Could not fetch user information:', error);
      }
    }
    
    // Add userName to messages that have userId and check template permissions
    const messagesWithUserInfo = await Promise.all(messages.map(async (msg: any) => {
      let messageWithInfo: any = { ...msg };
      const customerIdentity = msg.type === 'SENT' ? msg.to : msg.from;
      const contact = await contactService.getContact(customerIdentity, businessScope);
      const canonicalConversationKey = contact ? getCanonicalContactIdentity(contact) : normalizeWhatsAppIdentity(customerIdentity);
      const resolvedContactName = contact?.name || msg.contactName || null;
      const responseConversationKey = requestedConversationKey || canonicalConversationKey;

      messageWithInfo.conversationKey = responseConversationKey;
      if (contact) {
        const aliases = getContactIdentityAliases(contact);
        messageWithInfo.conversationAliases = aliases;
        if (resolvedContactName) {
          for (const alias of aliases) {
            contactNames[alias] = resolvedContactName;
          }
          contactNames[responseConversationKey] = resolvedContactName;
          messageWithInfo.contactName = resolvedContactName;
        }
      } else if (resolvedContactName) {
        messageWithInfo.conversationAliases = [responseConversationKey];
        contactNames[responseConversationKey] = resolvedContactName;
        messageWithInfo.contactName = resolvedContactName;
      } else {
        messageWithInfo.conversationAliases = [responseConversationKey];
      }
      
      // Add user name if available
      if (msg.userId && userMap[msg.userId]) {
        messageWithInfo.userName = userMap[msg.userId].name || userMap[msg.userId].email;
      }
      
      // Check template permissions for template messages
      // Template messages have text like "[Template: template_name]"
      const templateMatch = msg.text?.match(/\[Template:\s*([^\]]+)\]/);
      if (templateMatch && session?.user) {
        const templateName = templateMatch[1].trim();
        
        // Try to find template in database (we need to check by name, language might vary)
        // For now, we'll check if any template with this name exists and user has access
        const templates = await prisma.template.findMany({
          where: {
            name: templateName,
          },
          select: {
            id: true,
            name: true,
            language: true,
            components: true,
            allowedUserIds: true,
          },
        });
        
        if (templates.length > 0) {
          // Check permission for the first matching template (or all if needed)
          let canView = false;
          let allowedTemplate = null;
          
          for (const template of templates) {
            const hasPermission = await templateDB.canUserAccessTemplate(
              template.id,
              session.user.id,
              session.user.role
            );
            if (hasPermission) {
              canView = true;
              allowedTemplate = template;
              break;
            }
          }
          
          messageWithInfo.canViewTemplate = canView;
          
          // If user has permission, replace placeholder with actual template content
          // and, if applicable, attach media (document/image) derived from template parameters.
          if (canView && allowedTemplate && allowedTemplate.components) {
            // Get stored template parameters from the message (if available)
            const templateParams = msg.templateParameters as Record<string, any> | undefined;
            messageWithInfo.text = formatTemplateContent(allowedTemplate.components as any, templateParams);

            // Derive attachment information from HEADER media parameters (document/image)
            if (templateParams) {
              for (const comp of allowedTemplate.components as any[]) {
                if (!comp || typeof comp !== 'object') continue;
                const compType = comp.type?.toUpperCase();
                if (compType !== 'HEADER' || !Array.isArray(comp.parameters)) continue;

                for (let index = 0; index < comp.parameters.length; index++) {
                  const param = comp.parameters[index];
                  if (!param || typeof param !== 'object') continue;

                  const paramType = String(param.type || '').toLowerCase();
                  if (paramType !== 'image' && paramType !== 'document') continue;

                  const key = `${compType}_${index}`;
                  const mediaId = templateParams[key];
                  if (!mediaId) continue;

                  // Attach a media object compatible with frontend Message type
                  messageWithInfo.media = {
                    kind: paramType === 'image' ? 'image' : 'document',
                    id: String(mediaId),
                    url: `/api/media/${mediaId}`,
                  };

                  // Only support a single attachment per template message for now
                  break;
                }

                if (messageWithInfo.media) break;
              }
            }
          }
        } else {
          // Template not in database yet, allow viewing (backward compatible)
          messageWithInfo.canViewTemplate = true;
        }
      } else {
        // Not a template message or no session, allow viewing
        messageWithInfo.canViewTemplate = true;
      }
      
      return messageWithInfo;
    }));
    
    return NextResponse.json({
      messages: messagesWithUserInfo,
      // total is omitted for pagination - use hasMore flag instead
      // total would require an additional count query and is misleading when paginated
      hasMore,
      offset,
      limit,
      contactNames,
      status: 'ok'
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    return NextResponse.json({
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await messageService.clearAllMessages();
    return NextResponse.json({
      status: 'ok',
      message: 'All messages cleared'
    });
  } catch (error) {
    console.error('❌ Error clearing messages:', error);
    return NextResponse.json({
      error: 'Failed to clear messages',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 
