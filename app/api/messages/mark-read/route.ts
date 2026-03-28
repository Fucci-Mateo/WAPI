import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { MessageDatabaseService, BusinessNumberDatabaseService, conversationSummaryDB } from '../../../lib/database';
import { prisma } from '../../../lib/database';
import { getCanonicalContactIdentity, getContactIdentityAliases, normalizeWhatsAppIdentity } from '../../../lib/whatsappIdentity';

const messageService = new MessageDatabaseService();
const businessNumberService = new BusinessNumberDatabaseService();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function resolvePhoneNumberId(inputNumberId: string): Promise<string> {
  // If it's already a likely phone_number_id (long numeric id), just return
  if (/^\d{12,}$/.test(inputNumberId)) return inputNumberId;

  // Get all active business numbers from database
  const businessNumbers = await businessNumberService.getActive();
  
  if (businessNumbers.length === 0) {
    console.warn('⚠️ No active business numbers found in database');
    return inputNumberId;
  }

  const normalizedDisplay = inputNumberId.replace(/^\+/, '');

  // Try each business number's wabaId
  for (const businessNumber of businessNumbers) {
    if (!businessNumber.wabaId) continue;
    try {
      const res = await fetch(`${WHATSAPP_API_URL}/${businessNumber.wabaId}/phone_numbers?fields=id,display_phone_number&limit=100`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
        cache: 'no-store',
      });
      if (!res.ok) continue;
      const data = await res.json();
      const list: any[] = data?.data || [];
      const match = list.find((p: any) => {
        const disp = String(p.display_phone_number || '').replace(/^\+/, '');
        return disp === normalizedDisplay;
      });
      if (match?.id) return String(match.id);
    } catch (e) {
      // ignore and try next
    }
  }
  // Fallback to original
  return inputNumberId;
}

export async function POST(req: NextRequest) {
  try {
    if (!ACCESS_TOKEN) {
      return NextResponse.json({ error: 'WhatsApp access token not configured' }, { status: 500 });
    }

    const { phoneNumber, numberId } = await req.json();

    if (!phoneNumber || !numberId) {
      return NextResponse.json({ error: 'phoneNumber and numberId are required' }, { status: 400 });
    }

    // Resolve the phone number ID
    const resolvedNumberId = await resolvePhoneNumberId(numberId);
    const businessNumber = await businessNumberService.getByNumberId(resolvedNumberId);
    const businessScope = businessNumber?.wabaId || null;
    const businessAliases = Array.from(new Set([
      normalizeWhatsAppIdentity(resolvedNumberId),
      normalizeWhatsAppIdentity(businessNumber?.phoneNumber),
    ].filter(Boolean)));

    const normalizedIdentity = normalizeWhatsAppIdentity(phoneNumber);
    const contact = await (businessScope
      ? prisma.contact.findFirst({
          where: {
            wabaId: businessScope,
            OR: [
              { phoneNumber: normalizedIdentity },
              { businessScopedUserId: normalizedIdentity },
              { whatsappId: normalizedIdentity },
            ],
          },
        })
      : prisma.contact.findFirst({
          where: {
            OR: [
              { phoneNumber: normalizedIdentity },
              { businessScopedUserId: normalizedIdentity },
              { whatsappId: normalizedIdentity },
            ],
          },
        }));
    const aliases = contact ? getContactIdentityAliases(contact) : [normalizedIdentity];
    const canonicalIdentity = contact ? getCanonicalContactIdentity(contact) : normalizedIdentity;

    console.log(`🔍 Marking messages as read for identity: ${phoneNumber} (normalized: ${normalizedIdentity}, canonical: ${canonicalIdentity})`);

    // Find all unread received messages from this customer
    // For RECEIVED messages: from = customer phone, to = business phone
    let unreadMessages = await prisma.message.findMany({
      where: {
        type: 'RECEIVED',
        status: { not: 'READ' },
        OR: aliases.flatMap((alias) =>
          businessAliases.map((businessAlias) => ({
            from: alias,
            to: businessAlias,
          }))
        ),
      },
      select: {
        id: true,
        whatsappMessageId: true,
        from: true,
        to: true,
      },
    });

    if (unreadMessages.length === 0) {
      console.log(`⚠️ No messages found with exact/alias match, trying normalized comparison...`);
      const allUnreadMessages = await prisma.message.findMany({
        where: {
          type: 'RECEIVED',
          status: { not: 'READ' },
        },
        select: {
          id: true,
          whatsappMessageId: true,
          from: true,
          to: true,
        },
      });

      unreadMessages = allUnreadMessages.filter(msg => {
        const msgFromNormalized = normalizeWhatsAppIdentity(msg.from);
        const msgToNormalized = normalizeWhatsAppIdentity(msg.to);
        return (
          aliases.some((alias) => normalizeWhatsAppIdentity(alias) === msgFromNormalized) &&
          businessAliases.some((businessAlias) => businessAlias === msgToNormalized)
        );
      });
      console.log(`🔍 Found ${unreadMessages.length} messages after normalized comparison`);
    } else {
      console.log(`✅ Found ${unreadMessages.length} messages with exact match`);
    }

    if (unreadMessages.length === 0) {
      return NextResponse.json({ 
        status: 'success', 
        message: 'No unread messages to mark',
        marked: 0 
      });
    }

    // Mark each message as read via WhatsApp API
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const msg of unreadMessages) {
      if (!msg.whatsappMessageId) {
        console.warn(`⚠️ Message ${msg.id} has no WhatsApp message ID, skipping`);
        continue;
      }

      try {
        // Call WhatsApp API to mark message as read
        const response = await fetch(`${WHATSAPP_API_URL}/${resolvedNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: msg.whatsappMessageId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Update database status to READ
          await messageService.updateMessageStatusByWhatsAppId(msg.whatsappMessageId, 'READ');
          successCount++;
          results.push({ messageId: msg.id, whatsappMessageId: msg.whatsappMessageId, status: 'success' });
          console.log(`✅ Marked message as read: ${msg.whatsappMessageId}`);
        } else {
          console.error(`❌ Failed to mark message as read: ${msg.whatsappMessageId}`, data);
          failCount++;
          results.push({ messageId: msg.id, whatsappMessageId: msg.whatsappMessageId, status: 'failed', error: data });
        }
      } catch (error) {
        console.error(`❌ Error marking message as read: ${msg.whatsappMessageId}`, error);
        failCount++;
        results.push({ 
          messageId: msg.id, 
          whatsappMessageId: msg.whatsappMessageId, 
          status: 'error', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    const summary = await conversationSummaryDB.recalculateUnreadCount({
      businessNumberId: resolvedNumberId,
      customerIdentity: normalizedIdentity,
      contact: contact
        ? {
            id: contact.id,
            phoneNumber: contact.phoneNumber,
            businessScopedUserId: contact.businessScopedUserId,
            whatsappId: contact.whatsappId,
            name: contact.name,
          }
        : null,
      businessScope,
    });

    // Broadcast active chats update to refresh unread counts
    try {
      const { broadcastActiveChatsUpdate } = await import('../../realtime/broadcast');
      broadcastActiveChatsUpdate(resolvedNumberId, summary || undefined);
    } catch (error) {
      console.error('Error broadcasting active chats update:', error);
    }

    return NextResponse.json({
      status: 'success',
      message: `Marked ${successCount} message(s) as read`,
      marked: successCount,
      failed: failCount,
      results,
      summary,
    });
  } catch (error) {
    console.error('❌ Error in mark-read API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
