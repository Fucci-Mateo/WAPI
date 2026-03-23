import { NextRequest, NextResponse } from 'next/server';
import { CustomerServiceWindowDatabaseService, MessageDatabaseService, ContactDatabaseService, BusinessNumberDatabaseService } from '../../lib/database';
import { WebhookManager } from '../../lib/webhookConfig';

const customerServiceWindowService = new CustomerServiceWindowDatabaseService();
const messageService = new MessageDatabaseService();
const contactService = new ContactDatabaseService();
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Webhook POST received:', JSON.stringify(body, null, 2));
    
    // Handle WhatsApp webhook verification
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      
      if (entry?.changes?.[0]?.value?.messages) {
        const messages = entry.changes[0].value.messages;
        const contacts = entry.changes[0].value.contacts || [];
        const metadata = entry.changes[0].value.metadata;
        
        // Check if this business number is active before processing
        const businessPhoneNumber = metadata?.display_phone_number;
        if (!businessPhoneNumber) {
          console.log('⚠️ No business phone number in metadata, skipping webhook processing');
          return NextResponse.json({ status: 'ok', message: 'No business phone number' });
        }
        
        // Get active business numbers to verify this one is active
        const activeNumbers = await businessNumberService.getActive();
        const isActiveNumber = activeNumbers.some(num => 
          num.numberId === metadata?.phone_number_id
        );
        
        if (!isActiveNumber) {
          console.log(`⚠️ Business number ${businessPhoneNumber} is not active, skipping webhook processing`);
          return NextResponse.json({ status: 'ok', message: 'Business number not active' });
        }
        
        console.log(`📨 Processing ${messages.length} incoming message(s) for active business number ${businessPhoneNumber}`);
        
        // Process incoming messages
        for (const message of messages) {
          console.log('📝 Message details:', {
            id: message.id,
            from: message.from,
            type: message.type,
            timestamp: message.timestamp
          });

          if (message.type === 'text' && message.from) {
            // Normalize phone number for consistent storage
            const normalizedPhoneNumber = normalizePhoneNumber(message.from);
            
            // Record user message to open/refresh customer service window
            await customerServiceWindowService.openWindow(normalizedPhoneNumber);
            
            console.log(`🕐 Customer service window opened/refreshed for ${normalizedPhoneNumber}`);
            
            // Store the incoming message
            const contact = contacts.find((c: any) => c.wa_id === message.from);
            const contactName = contact?.profile?.name || normalizedPhoneNumber;
            
            // Store contact information with normalized phone number
            if (contact?.profile?.name) {
              await contactService.upsertContact(normalizedPhoneNumber, contact.profile.name);
            }
            
            const storedMessage = {
              from: normalizedPhoneNumber,
              to: normalizePhoneNumber(metadata?.display_phone_number || 'Unknown'),
              text: message.text?.body || '',
              type: 'RECEIVED' as const,
              status: 'DELIVERED' as const,
              contactName,
              whatsappMessageId: message.id,
              conversationId: message.context?.id
            };
            
            const savedMessage = await messageService.addMessage(storedMessage);
            console.log(`💾 Incoming message stored: ${contactName} (${normalizedPhoneNumber})`);
            
            // Broadcast new message to connected clients via SSE
            try {
              const { broadcastMessage } = await import('../realtime/broadcast');
              broadcastMessage(
                metadata?.phone_number_id || null,
                normalizedPhoneNumber,
                {
                  id: savedMessage.id,
                  from: normalizedPhoneNumber,
                  to: storedMessage.to,
                  text: storedMessage.text,
                  timestamp: savedMessage.timestamp.toISOString(),
                  type: 'received',
                  status: 'delivered',
                  contactName,
                  whatsappMessageId: storedMessage.whatsappMessageId,
                }
              );
              
              // Also broadcast active chats update
              if (metadata?.phone_number_id) {
                const { broadcastActiveChatsUpdate } = await import('../realtime/broadcast');
                broadcastActiveChatsUpdate(metadata.phone_number_id);
              }
            } catch (error) {
              console.error('Error broadcasting message:', error);
            }
            
          } else if (message.type === 'template' && message.from) {
            // Handle template messages
            console.log(`📋 Template message received from ${message.from}`);
          } else if (message.type === 'image' && message.from) {
            // Handle image messages
            console.log(`🖼️ Image message received from ${message.from}`);
            const normalizedPhoneNumber = normalizePhoneNumber(message.from);
            await customerServiceWindowService.openWindow(normalizedPhoneNumber);

            const contact = contacts.find((c: any) => c.wa_id === message.from);
            const contactName = contact?.profile?.name || normalizedPhoneNumber;
            if (contact?.profile?.name) {
              await contactService.upsertContact(normalizedPhoneNumber, contact.profile.name);
            }

            const mediaId = message.image?.id || 'unknown';
            const storedMessage = {
              from: normalizedPhoneNumber,
              to: normalizePhoneNumber(metadata?.display_phone_number || 'Unknown'),
              text: `[Image] media_id=${mediaId}`,
              type: 'RECEIVED' as const,
              status: 'DELIVERED' as const,
              contactName,
              whatsappMessageId: message.id,
              conversationId: message.context?.id
            };

            const savedImageMessage = await messageService.addMessage(storedMessage);
            console.log(`💾 Incoming image stored: ${contactName} (${normalizedPhoneNumber})`);
            
            // Broadcast new message to connected clients via SSE
            try {
              const { broadcastMessage, broadcastActiveChatsUpdate } = await import('../realtime/broadcast');
              broadcastMessage(
                metadata?.phone_number_id || null,
                normalizedPhoneNumber,
                {
                  id: savedImageMessage.id,
                  from: normalizedPhoneNumber,
                  to: storedMessage.to,
                  text: storedMessage.text,
                  timestamp: savedImageMessage.timestamp.toISOString(),
                  type: 'received',
                  status: 'delivered',
                  contactName,
                  whatsappMessageId: storedMessage.whatsappMessageId,
                }
              );
              
              if (metadata?.phone_number_id) {
                broadcastActiveChatsUpdate(metadata.phone_number_id);
              }
            } catch (error) {
              console.error('Error broadcasting image message:', error);
            }
          } else if (message.type === 'audio' && message.from) {
            // Handle audio messages
            console.log(`🔊 Audio message received from ${message.from}`);
            const normalizedPhoneNumber = normalizePhoneNumber(message.from);
            await customerServiceWindowService.openWindow(normalizedPhoneNumber);

            const contact = contacts.find((c: any) => c.wa_id === message.from);
            const contactName = contact?.profile?.name || normalizedPhoneNumber;
            if (contact?.profile?.name) {
              await contactService.upsertContact(normalizedPhoneNumber, contact.profile.name);
            }

            const mediaId = message.audio?.id || 'unknown';
            const storedMessage = {
              from: normalizedPhoneNumber,
              to: normalizePhoneNumber(metadata?.display_phone_number || 'Unknown'),
              text: `[Audio] media_id=${mediaId}`,
              type: 'RECEIVED' as const,
              status: 'DELIVERED' as const,
              contactName,
              whatsappMessageId: message.id,
              conversationId: message.context?.id
            };

            const savedAudioMessage = await messageService.addMessage(storedMessage);
            console.log(`💾 Incoming audio stored: ${contactName} (${normalizedPhoneNumber})`);
            
            // Broadcast new message to connected clients via SSE
            try {
              const { broadcastMessage, broadcastActiveChatsUpdate } = await import('../realtime/broadcast');
              broadcastMessage(
                metadata?.phone_number_id || null,
                normalizedPhoneNumber,
                {
                  id: savedAudioMessage.id,
                  from: normalizedPhoneNumber,
                  to: storedMessage.to,
                  text: storedMessage.text,
                  timestamp: savedAudioMessage.timestamp.toISOString(),
                  type: 'received',
                  status: 'delivered',
                  contactName,
                  whatsappMessageId: storedMessage.whatsappMessageId,
                }
              );
              
              if (metadata?.phone_number_id) {
                broadcastActiveChatsUpdate(metadata.phone_number_id);
              }
            } catch (error) {
              console.error('Error broadcasting audio message:', error);
            }
          } else if (message.type === 'document' && message.from) {
            // Handle document messages
            console.log(`📄 Document message received from ${message.from}`);
            const normalizedPhoneNumber = normalizePhoneNumber(message.from);
            await customerServiceWindowService.openWindow(normalizedPhoneNumber);

            const contact = contacts.find((c: any) => c.wa_id === message.from);
            const contactName = contact?.profile?.name || normalizedPhoneNumber;
            if (contact?.profile?.name) {
              await contactService.upsertContact(normalizedPhoneNumber, contact.profile.name);
            }

            const mediaId = message.document?.id || 'unknown';
            const fileName = message.document?.filename;
            const mimeType = message.document?.mime_type;

            // Encode metadata in text using the same format used for outgoing media messages:
            // [Document] media_id=xxx|fileName=xxx|mimeType=xxx|Caption text
            const parts: string[] = [`[Document] media_id=${mediaId}`];
            if (fileName) parts.push(`fileName=${fileName}`);
            if (mimeType) parts.push(`mimeType=${mimeType}`);
            const encodedText = parts.join('|');

            const storedMessage = {
              from: normalizedPhoneNumber,
              to: normalizePhoneNumber(metadata?.display_phone_number || 'Unknown'),
              text: encodedText,
              type: 'RECEIVED' as const,
              status: 'DELIVERED' as const,
              contactName,
              whatsappMessageId: message.id,
              conversationId: message.context?.id
            };

            const savedDocumentMessage = await messageService.addMessage(storedMessage);
            console.log(`💾 Incoming document stored: ${contactName} (${normalizedPhoneNumber})`);
            
            // Broadcast new message to connected clients via SSE
            try {
              const { broadcastMessage, broadcastActiveChatsUpdate } = await import('../realtime/broadcast');
              broadcastMessage(
                metadata?.phone_number_id || null,
                normalizedPhoneNumber,
                {
                  id: savedDocumentMessage.id,
                  from: normalizedPhoneNumber,
                  to: storedMessage.to,
                  text: storedMessage.text,
                  timestamp: savedDocumentMessage.timestamp.toISOString(),
                  type: 'received',
                  status: 'delivered',
                  contactName,
                  whatsappMessageId: storedMessage.whatsappMessageId,
                }
              );
              
              if (metadata?.phone_number_id) {
                broadcastActiveChatsUpdate(metadata.phone_number_id);
              }
            } catch (error) {
              console.error('Error broadcasting document message:', error);
            }
          }
        }
      }
      
      // Handle message status updates
      if (entry?.changes?.[0]?.value?.statuses) {
        const statuses = entry.changes[0].value.statuses;
        console.log(`📊 Processing ${statuses.length} status update(s)`);
        
        for (const status of statuses) {
          console.log(`📈 Message status update: ${status.id} - ${status.status}`);
          
          // Update message status in database
          const updateResult = await messageService.updateMessageStatusByWhatsAppId(status.id, status.status.toUpperCase() as any);
          
          console.log(`📊 Status update result for ${status.id}: ${updateResult.count} message(s) updated`);
          
          // Broadcast status update via SSE
          if (updateResult.count > 0) {
            try {
              const { broadcastMessageStatusUpdate } = await import('../realtime/broadcast');
              // Find the message to get phone numbers for broadcasting
              const prisma = (await import('../../lib/database')).prisma;
              const targetMessage = await prisma.message.findFirst({
                where: { whatsappMessageId: status.id },
              });
              
              if (targetMessage) {
                console.log(`📤 Broadcasting status update for message ${targetMessage.id} (WhatsApp ID: ${status.id})`);
                const businessPhoneNumber = entry?.changes?.[0]?.value?.metadata?.phone_number_id;
                broadcastMessageStatusUpdate(
                  businessPhoneNumber || null,
                  targetMessage.from || targetMessage.to || null,
                  targetMessage.id,
                  status.status.toLowerCase()
                );
              } else {
                console.warn(`⚠️ Status update received for WhatsApp ID ${status.id}, but message not found in database`);
              }
            } catch (error) {
              console.error('Error broadcasting status update:', error);
            }
          } else {
            console.warn(`⚠️ Status update for WhatsApp ID ${status.id} did not match any messages in database`);
            // Debug: Check if any messages exist with this WhatsApp ID
            const prisma = (await import('../../lib/database')).prisma;
            const existingMessage = await prisma.message.findFirst({
              where: { whatsappMessageId: status.id },
              select: { id: true, text: true, type: true, whatsappMessageId: true },
            });
            if (existingMessage) {
              console.log(`🔍 Found message in database:`, existingMessage);
            } else {
              console.log(`🔍 No message found with WhatsApp ID: ${status.id}`);
            }
          }
        }
      }

      // Handle other webhook events
      if (entry?.changes?.[0]?.value?.errors) {
        const errors = entry.changes[0].value.errors;
        console.error('❌ Webhook errors:', errors);
      }
    }
    
    return NextResponse.json({ status: 'ok', message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  console.log('🔍 Webhook verification request:', { mode, token: token ? '***' : 'missing', challenge });
  
  // If this is a webhook verification request
  if (mode && token && challenge) {
    const webhookManager = WebhookManager.getInstance();
    const verifyToken = webhookManager.getVerifyToken();
    
    console.log('🔐 Verifying token:', { 
      provided: token ? '***' : 'missing', 
      expected: verifyToken ? '***' : 'missing',
      match: token === verifyToken 
    });
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ Webhook verified successfully');
      return new NextResponse(challenge, { 
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }
    
    console.log('❌ Webhook verification failed - invalid token');
    return NextResponse.json({ 
      error: 'Forbidden - Invalid verification token',
      details: 'The provided verify token does not match the expected token'
    }, { status: 403 });
  }
  
  // If this is a regular GET request, don't return messages (security risk)
  // Only return a status message
  return NextResponse.json({ 
    status: 'ok',
    message: 'Webhook endpoint is active. Use POST for webhook events.'
  });
} 