import { NextRequest, NextResponse } from 'next/server';
import { authenticateClient, pickHeadersForLog, hasScope, SCOPES } from '@/app/lib/extAuth';
import { prisma, templateDB, BusinessNumberDatabaseService, ContactDatabaseService, conversationSummaryDB } from '@/app/lib/database';
import { MessageDatabaseService } from '@/app/lib/database';
import { getCanonicalContactIdentity, getContactIdentityAliases, normalizeWhatsAppIdentity } from '@/app/lib/whatsappIdentity';

const messageService = new MessageDatabaseService();
const businessNumberService = new BusinessNumberDatabaseService();
const contactService = new ContactDatabaseService();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  let clientId: string | null = null;
  let numberId: string | null = null;
  let responseCode = 500;
  let status = 'ERROR';
  let responseBody: any = null;
  let error: string | undefined;
  let requestBodyForLog: any = null;

  try {
    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: 'Server not configured for WhatsApp API' }, { status: 500 });
    }

    const client = await authenticateClient(req);
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    clientId = client.id;

    // Check required scope
    if (!hasScope(client, SCOPES.MESSAGES_SEND)) {
      return NextResponse.json({ error: 'Forbidden - missing required scope: messages:send' }, { status: 403 });
    }

    // Determine numberId
    numberId = req.headers.get('x-number-id') || new URL(req.url).searchParams.get('numberId') || client.defaultNumberId || null;
    if (!numberId) {
      return NextResponse.json({ error: 'numberId is required (header X-Number-Id or client default)' }, { status: 400 });
    }

    // Parse request body (store for audit log)
    const body = await req.json();
    requestBodyForLog = body;
    const { to, templateName, language, components } = body;

    // Validate required fields
    if (!templateName || !language) {
      return NextResponse.json({ error: 'templateName and language are required' }, { status: 400 });
    }

    if (!to) {
      return NextResponse.json({ error: 'Recipient identifier (to) is required' }, { status: 400 });
    }

    // Check if client has permission to send this template
    const template = await prisma.template.findFirst({
      where: {
        name: templateName,
        language: language,
      },
    });

    if (template) {
      const hasPermission = await templateDB.canClientAccessTemplate(
        template.id,
        clientId
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden - client does not have permission to send this template' },
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

    // Idempotency (best-effort v1)
    const idemKey = req.headers.get('idempotency-key');
    if (idemKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { clientId_key: { clientId: client.id, key: idemKey } },
      });
      if (existing) {
        return NextResponse.json({ status: 'DUPLICATE', idempotencyKey: idemKey, messageId: existing.messageId }, { status: 200 });
      }
    }

    // Build WhatsApp API request body
    const messageBody: any = {
      messaging_product: 'whatsapp',
      to: normalizeWhatsAppIdentity(to),
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

    // Send to WhatsApp API
    const upstream = await fetch(`${WHATSAPP_API_URL}/${numberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });

    responseCode = upstream.status;
    responseBody = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      status = 'UPSTREAM_ERROR';
      return NextResponse.json({ 
        error: 'upstream_error', 
        upstream: responseBody,
        details: responseBody.error?.message || responseBody.error?.error_user_msg || JSON.stringify(responseBody.error || responseBody)
      }, { status: upstream.status });
    }

    status = 'OK';

    // Persist messageId if present for idempotency and association
    const messageId = responseBody?.messages?.[0]?.id as string | undefined;
    if (messageId && idemKey) {
      await prisma.idempotencyKey.create({ data: { clientId: client.id, key: idemKey, messageId } });
    }

    // Store the sent template message in database
    if (messageId) {
      const normalizedTo = normalizeWhatsAppIdentity(to);
      const businessNumber = await businessNumberService.getByNumberId(numberId);
      const businessScope = businessNumber?.wabaId || null;
      try {
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
        
        const savedMessage = await messageService.addMessage({
          from: numberId,
          to: normalizedTo,
          text: `[Template: ${templateName}]`,
          type: 'SENT' as const,
          status: 'SENDING' as const,
          whatsappMessageId: messageId,
          templateParameters: Object.keys(templateParams).length > 0 ? templateParams : undefined,
        });

        const recipientContact = await contactService.getContact(normalizedTo, businessScope);
        const recipientAliases = recipientContact ? getContactIdentityAliases(recipientContact) : [normalizedTo];
        const canonicalConversationKey = recipientContact ? getCanonicalContactIdentity(recipientContact) : normalizedTo;
        const summary = await conversationSummaryDB.upsertFromMessage({
          businessNumberId: numberId,
          message: {
            from: numberId,
            to: normalizedTo,
            text: `[Template: ${templateName}]`,
            type: 'SENT',
            status: 'SENDING',
            contactName: recipientContact?.name || null,
            templateParameters: Object.keys(templateParams).length > 0 ? templateParams : null,
            timestamp: savedMessage.timestamp,
          },
          contact: recipientContact
            ? {
                id: recipientContact.id,
                phoneNumber: recipientContact.phoneNumber,
                businessScopedUserId: recipientContact.businessScopedUserId,
                whatsappId: recipientContact.whatsappId,
                name: recipientContact.name,
              }
            : null,
          businessScope,
        });

        try {
          const { broadcastMessage, broadcastActiveChatsUpdate } = await import('../../../realtime/broadcast');
          broadcastMessage(
            numberId,
            recipientAliases,
            {
              id: savedMessage.id,
              from: numberId,
              to: normalizedTo,
              text: `[Template: ${templateName}]`,
              timestamp: savedMessage.timestamp.toISOString(),
              type: 'sent',
              status: 'sending',
              whatsappMessageId: messageId,
              conversationKey: canonicalConversationKey,
              conversationAliases: recipientAliases,
            }
          );

          broadcastActiveChatsUpdate(numberId, summary || undefined);
        } catch (broadcastError) {
          console.error('Failed to broadcast template message:', broadcastError);
        }
      } catch (dbError) {
        // Log but don't fail the request if DB write fails
        console.error('Failed to store template message in database:', dbError);
      }
    }

    return NextResponse.json(responseBody);
  } catch (e: any) {
    error = e?.message || String(e);
    responseBody = { error };
    responseCode = 500;
    status = 'ERROR';
    return NextResponse.json({ error: 'internal_error', details: error }, { status: 500 });
  } finally {
    try {
      // Persist audit log
      await prisma.extRequestLog.create({
        data: {
          clientId: clientId || 'unknown',
          method: 'POST',
          path: '/api/v1/ext/send-template',
          numberId: numberId || undefined,
          status,
          responseCode,
          durationMs: Date.now() - startedAt,
          ip: req.headers.get('x-forwarded-for') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          requestedAt: new Date(startedAt),
          respondedAt: new Date(),
          requestHeadersSubset: pickHeadersForLog(req),
          requestBody: requestBodyForLog ?? undefined,
          responseBody: responseBody ?? undefined,
          error,
        },
      });
    } catch {}
  }
}
