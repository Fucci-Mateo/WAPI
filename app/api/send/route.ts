import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { MessageDatabaseService, CustomerServiceWindowDatabaseService, BusinessNumberDatabaseService } from '../../lib/database';

const messageService = new MessageDatabaseService();
const customerServiceWindowService = new CustomerServiceWindowDatabaseService();
const businessNumberService = new BusinessNumberDatabaseService();

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
  const { to, text, numberId, mediaId, mediaType, caption, fileName, mimeType } = await req.json();

  console.log('API Request:', { to, text, numberId, mediaId, mediaType, hasToken: !!ACCESS_TOKEN });

  if (!numberId || !ACCESS_TOKEN) {
    console.error('Missing configuration:', { numberId, hasToken: !!ACCESS_TOKEN });
    return NextResponse.json({ error: 'WhatsApp number ID or access token not set' }, { status: 500 });
  }

  // Validate: either text or mediaId must be provided
  if (!text && !mediaId) {
    return NextResponse.json({ error: 'Either text or mediaId must be provided' }, { status: 400 });
  }

  // If mediaId is provided, mediaType is required
  if (mediaId && !mediaType) {
    return NextResponse.json({ error: 'mediaType is required when mediaId is provided' }, { status: 400 });
  }

  // Validate mediaType
  if (mediaType && !['image', 'audio', 'document'].includes(mediaType)) {
    return NextResponse.json({ error: 'mediaType must be one of: image, audio, document' }, { status: 400 });
  }

  try {
    const resolvedNumberId = await resolvePhoneNumberId(numberId);
    
    // Build request body based on whether it's a text or media message
    let requestBody: any = {
      messaging_product: 'whatsapp',
      to,
    };

    if (mediaId) {
      // Media message
      requestBody.type = mediaType;
      
      if (mediaType === 'image') {
        requestBody.image = { id: mediaId };
        if (caption) requestBody.image.caption = caption;
      } else if (mediaType === 'audio') {
        requestBody.audio = { id: mediaId };
      } else if (mediaType === 'document') {
        // WhatsApp Cloud API supports an optional `filename` field for documents.
        // Use the provided fileName from our upload step so the receiver sees a proper name
        // instead of a generic "Untitled document".
        requestBody.document = { id: mediaId } as any;
        if (caption) {
          (requestBody.document as any).caption = caption;
        }
        if (fileName) {
          (requestBody.document as any).filename = fileName;
        }
      }
    } else {
      // Text message
      requestBody.type = 'text';
      requestBody.text = { body: text };
    }
    
    console.log('WhatsApp API Request:', requestBody);
    
    const response = await fetch(`${WHATSAPP_API_URL}/${resolvedNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('WhatsApp API Response Status:', response.status);
    const data = await response.json();
    console.log('WhatsApp API Response:', data);
    
    if (!response.ok) {
      console.error('WhatsApp API Error:', data);
      return NextResponse.json({ error: data }, { status: response.status });
    }
    
    // Store the sent message in the database
    if (data.messages && data.messages[0]) {
      const messageId = data.messages[0].id;
      const normalizedTo = normalizePhoneNumber(to);
      
      // Get current user session to track who sent the message
      const session = await getServerSession(authOptions);
      const userId = session?.user?.id;
      
      // Determine message text for storage
      // Format: [Type] media_id=xxx|fileName=xxx|mimeType=xxx|Caption text
      // Use | as delimiter to separate metadata fields
      let messageText = text || '';
      if (mediaId) {
        const mediaPrefix = mediaType === 'image' ? '[Image]' : mediaType === 'audio' ? '[Audio]' : '[Document]';
        const parts = [`${mediaPrefix} media_id=${mediaId}`];
        if (fileName) parts.push(`fileName=${fileName}`);
        if (mimeType) parts.push(`mimeType=${mimeType}`);
        if (caption) parts.push(caption);
        messageText = parts.join('|');
      }
      
      const sentMessage = {
        from: resolvedNumberId, // Business phone number id
        to: normalizedTo,
        text: messageText,
        type: 'SENT' as const,
        status: 'SENDING' as const,
        whatsappMessageId: messageId,
        userId: userId,
      };
      
      const savedMessage = await messageService.addMessage(sentMessage);
      console.log(`📤 Sent message stored: ${numberId} -> ${normalizedTo}: ${messageText}${userId ? ` (by user ${userId})` : ''}`);
      console.log(`📤 WhatsApp message ID stored: ${messageId} for message type: ${mediaType || 'text'}`);
      
      // Broadcast new message to connected clients via SSE
      try {
        const { broadcastMessage, broadcastActiveChatsUpdate } = await import('../realtime/broadcast');
        broadcastMessage(
          resolvedNumberId || null,
          normalizedTo,
          {
            id: savedMessage.id,
            from: resolvedNumberId,
            to: normalizedTo,
            text: messageText,
            timestamp: savedMessage.timestamp.toISOString(),
            type: 'sent',
            status: 'sending',
            userId,
            whatsappMessageId: messageId,
          }
        );
        
        // Also broadcast active chats update
        if (resolvedNumberId) {
          broadcastActiveChatsUpdate(resolvedNumberId);
        }
      } catch (error) {
        console.error('Error broadcasting message:', error);
      }
    }
    
    // Refresh the customer service window for the recipient
    // This ensures the window stays open for subsequent messages
    const normalizedTo = normalizePhoneNumber(to);
    await customerServiceWindowService.openWindow(normalizedTo);
    console.log(`🕐 Customer service window refreshed for ${normalizedTo}`);
    
    console.log('Message sent successfully to WhatsApp');
    return NextResponse.json({ status: 'sent', data });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 