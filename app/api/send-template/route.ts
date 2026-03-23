import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { MessageDatabaseService, CustomerServiceWindowDatabaseService, templateDB, prisma } from '../../lib/database';

const messageService = new MessageDatabaseService();
const customerServiceWindowService = new CustomerServiceWindowDatabaseService();

// Normalize phone number format (remove + prefix, spaces, and URL encoding for consistency)
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  // Remove + prefix
  let normalized = phone.startsWith('+') ? phone.substring(1) : phone;
  // Remove all spaces and URL encoding
  normalized = normalized.replace(/\s+/g, '').replace(/%20/g, '');
  return normalized;
};

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const { to, templateName, language, components, numberId } = await req.json();

    // Validate required fields
    if (!numberId || !ACCESS_TOKEN) {
      return NextResponse.json({ error: 'WhatsApp number ID or access token not set' }, { status: 500 });
    }

    if (!templateName || !language) {
      return NextResponse.json({ error: 'Template name and language are required' }, { status: 400 });
    }

    if (!to) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 });
    }

    // Check if user has permission to send this template
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Find template in database by name and language
    const template = await prisma.template.findFirst({
      where: {
        name: templateName,
        language: language,
      },
    });

    if (template) {
      // Template exists in database - check permissions
      const hasPermission = await templateDB.canUserAccessTemplate(
        template.id,
        session.user.id,
        session.user.role
      );

      if (!hasPermission) {
        console.log('🚫 Permission denied for template:', {
          templateId: template.id,
          templateName,
          userId: session.user.id,
          userRole: session.user.role,
          userEmail: session.user.email
        });
        return NextResponse.json(
          { error: 'You do not have permission to send this template' },
          { status: 403 }
        );
      }
    } else {
      // Template not in database - by default, restrict access for non-admins
      // Only admins can send templates that haven't been synced yet
      const normalizedRole = session.user.role?.toUpperCase()?.trim();
      if (normalizedRole !== 'ADMIN') {
        console.log('🚫 Template not in database and user is not admin:', {
          templateName,
          userId: session.user.id,
          userRole: session.user.role,
          userEmail: session.user.email
        });
        return NextResponse.json(
          { error: 'Template not found or you do not have permission to send this template' },
          { status: 403 }
        );
      }
    }

    // Validate components structure if provided
    if (components && Array.isArray(components)) {
      for (const comp of components) {
        if (!comp.type) {
          return NextResponse.json({ error: 'Component type is required for all components' }, { status: 400 });
        }
        if (comp.parameters && Array.isArray(comp.parameters)) {
          for (const param of comp.parameters) {
            if (!param.type) {
              return NextResponse.json({ error: 'Parameter type is required for all parameters' }, { status: 400 });
            }
          }
        }
      }
    }

    const messageBody: any = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language
        }
      }
    };

    // Add components if provided (for templates with variables)
    if (components && Array.isArray(components) && components.length > 0) {
      messageBody.template.components = components;
    }

    // Log the request body for debugging
    console.log('WhatsApp API request body:', JSON.stringify(messageBody, null, 2));

    const response = await fetch(`${WHATSAPP_API_URL}/${numberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      // Extract error message from WhatsApp API response
      const errorMessage = data.error?.message || data.error?.error_user_msg || JSON.stringify(data.error || data);
      return NextResponse.json({ 
        error: 'Failed to send template message', 
        details: errorMessage,
        whatsappError: data.error 
      }, { status: response.status });
    }

    // Store the sent template message
    if (data.messages && data.messages[0]) {
      const messageId = data.messages[0].id;
      const normalizedTo = normalizePhoneNumber(to);
      
      // Get current user session to track who sent the message (already fetched above)
      const userId = session?.user?.id;
      
      // Extract parameter values from components for storage
      // Format: { "HEADER_0": "value1", "BODY_0": "value2", "BODY_1": "value3", ... }
      // For media parameters (image/document/video) we store the media ID so we can render attachments later.
      const templateParams: Record<string, string> = {};
      if (components && Array.isArray(components)) {
        components.forEach((comp: any) => {
          if (comp.parameters && Array.isArray(comp.parameters)) {
            comp.parameters.forEach((param: any, index: number) => {
              const key = `${comp.type}_${index}`;
              
              let storedValue: string | null = null;
              
              if (param.type === 'text' && param.text) {
                storedValue = param.text;
              } else if (param.type === 'currency' && param.currency) {
                // Format currency: amount_1000 / 1000
                const amount = param.currency.amount_1000 / 1000;
                storedValue = param.fallback_value || String(amount);
              } else if (param.type === 'date_time' && param.date_time) {
                storedValue = param.fallback_value || new Date().toISOString();
              } else if (
                (param.type === 'image' || param.type === 'document' || param.type === 'video') &&
                param[param.type]?.id
              ) {
                // Store media id so we can reconstruct attachments UI
                storedValue = String(param[param.type].id);
              } else if (param.fallback_value) {
                storedValue = param.fallback_value;
              }

              if (storedValue !== null) {
                templateParams[key] = storedValue;
              }
            });
          }
        });
      }
      
      // Store template name in message text for permission checking when displaying
      const sentMessage = {
        from: numberId, // Business phone number
        to: normalizedTo,
        text: `[Template: ${templateName}]`, // Template indicator with name for permission checks
        type: 'SENT' as const,
        status: 'SENDING' as const,
        whatsappMessageId: messageId,
        userId: userId,
        templateParameters: Object.keys(templateParams).length > 0 ? templateParams : undefined,
      };

      await messageService.addMessage(sentMessage);
      console.log(`📤 Template message stored: ${numberId} -> ${normalizedTo}: ${templateName}${userId ? ` (by user ${userId})` : ''}${Object.keys(templateParams).length > 0 ? ` with ${Object.keys(templateParams).length} parameters` : ''}`);
    }

    // Refresh the customer service window for the recipient
    // This ensures the window stays open for subsequent messages
    const normalizedTo = normalizePhoneNumber(to);
    await customerServiceWindowService.openWindow(normalizedTo);
    console.log(`🕐 Customer service window refreshed for ${normalizedTo} (template)`);

    return NextResponse.json({ status: 'sent', data });
  } catch (error) {
    console.error('Error sending template:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
      error: 'Internal server error while sending template', 
      details: errorMessage 
    }, { status: 500 });
  }
} 