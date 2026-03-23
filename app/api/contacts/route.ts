import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { MessageDatabaseService, ContactDatabaseService, prisma } from '@/app/lib/database';

const messageService = new MessageDatabaseService();
const contactService = new ContactDatabaseService();

/**
 * Format template components into readable text
 * Extracts text from HEADER, BODY, and FOOTER components.
 * Replaces {{1}}, {{2}}, etc. or named placeholders like {{member_name}} with actual parameter values if provided.
 * (Matches behavior used in /api/messages so previews are consistent.)
 */
function formatTemplateContent(components: any[], templateParameters?: Record<string, any>): string {
  if (!Array.isArray(components)) {
    return '';
  }

  const parts: string[] = [];

  for (const component of components) {
    if (!component || typeof component !== 'object') continue;

    const type = component.type?.toUpperCase();
    const text = component.text;
    if (!text) continue;

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
      case 'BODY':
        parts.push(formattedText);
        break;
      case 'FOOTER':
        parts.push(formattedText);
        break;
      default:
        parts.push(formattedText);
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
    const businessNumberId = searchParams.get('businessNumberId');

    if (!businessNumberId) {
      return NextResponse.json({
        error: 'businessNumberId is required'
      }, { status: 400 });
    }

    console.log('📋 Fetching active contacts for business number:', businessNumberId);

    // Get active contacts with their latest message info
    const contacts = await messageService.getActiveContacts(businessNumberId);

    // Hydrate template placeholders in lastMessage for users who are allowed to view
    // Sidebar previews should show real template text when permitted.
    const templateNameSet = new Set<string>();
    for (const c of contacts) {
      const match = c.lastMessage?.match(/\[Template:\s*([^\]]+)\]/);
      if (match?.[1]) {
        templateNameSet.add(match[1].trim());
      }
    }

    const templateNames = Array.from(templateNameSet);
    const templatePreviewByName = new Map<string, string>();

    if (templateNames.length > 0) {
      const templates = await prisma.template.findMany({
        where: { name: { in: templateNames } },
        select: {
          id: true,
          name: true,
          components: true,
          allowedUserIds: true,
        },
        orderBy: [{ name: 'asc' }, { language: 'asc' }],
      });

      const normalizedRole = session.user.role?.toUpperCase()?.trim();
      const userId = session.user.id || null;

      // Group templates by name and decide which (if any) the current user can view
      const byName = new Map<string, typeof templates>();
      for (const t of templates) {
        const arr = byName.get(t.name) || [];
        arr.push(t);
        byName.set(t.name, arr);
      }

      for (const [name, list] of byName.entries()) {
        let chosen: (typeof templates)[number] | null = null;

        if (normalizedRole === 'ADMIN') {
          chosen = list[0] || null;
        } else if (userId) {
          chosen =
            list.find((t) => t.allowedUserIds.length > 0 && t.allowedUserIds.includes(userId)) || null;
        }

        if (chosen?.components) {
          // Note: We don't have templateParameters here in the preview map,
          // but individual contacts will have them in their lastMessage data
          templatePreviewByName.set(name, formatTemplateContent(chosen.components as any));
        }
      }
    }

    // Get contact names from database
    const contactNames: Record<string, string> = {};
    for (const contact of contacts) {
      try {
        const contactInfo = await contactService.getContact(contact.phoneNumber);
        if (contactInfo && contactInfo.name) {
          contactNames[contact.phoneNumber] = contactInfo.name;
        }
      } catch (error) {
        console.warn(`Could not fetch contact name for ${contact.phoneNumber}:`, error);
      }
    }

    // Add contact names to the response and hydrate template content with actual parameters
    const contactsWithNames = await Promise.all(contacts.map(async (contact) => {
      let lastMessage = contact.lastMessage;
      
      const match = contact.lastMessage?.match(/\[Template:\s*([^\]]+)\]/);
      const templateName = match?.[1]?.trim();
      
      if (templateName) {
        // Get the template preview (formatted template structure)
        const templatePreview = templatePreviewByName.get(templateName);
        
        // If we have stored template parameters, fetch the full template and format with actual values
        if (contact.templateParameters && templatePreview) {
          const templates = await prisma.template.findMany({
            where: { name: templateName },
            select: { id: true, name: true, components: true },
            take: 1,
          });
          
          if (templates.length > 0 && templates[0].components) {
            lastMessage = formatTemplateContent(
              templates[0].components as any,
              contact.templateParameters as Record<string, any>
            );
          } else {
            lastMessage = templatePreview;
          }
        } else if (templatePreview) {
          lastMessage = templatePreview;
        }
      }
      
      return {
        ...contact,
        lastMessage,
        contactName: contactNames[contact.phoneNumber] || null,
      };
    }));

    return NextResponse.json({
      contacts: contactsWithNames,
      status: 'ok'
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    return NextResponse.json({
      error: 'Failed to fetch contacts',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

