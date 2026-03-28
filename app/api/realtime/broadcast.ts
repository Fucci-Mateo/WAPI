import { normalizeWhatsAppIdentity } from '@/app/lib/whatsappIdentity';
import type { ActiveChat } from '../../components/types';

// Broadcast functions for SSE connections
// Store active SSE connections
// Using a global Map to persist across requests in Next.js
// In production, consider using Redis or similar for multi-instance deployments
const connections = new Map<string, ReadableStreamDefaultController[]>();

export function broadcastMessage(
  businessNumberId: string | null,
  phoneNumber: string | string[] | null,
  message: any
) {
  const targets: string[] = [];
  
  if (businessNumberId) {
    targets.push(`business:${businessNumberId}`);
  }
  const identityTargets = Array.isArray(phoneNumber)
    ? phoneNumber
    : phoneNumber
      ? [phoneNumber]
      : [];

  for (const identity of identityTargets) {
    const normalizedIdentity = normalizeWhatsAppIdentity(identity);
    if (normalizedIdentity) {
      targets.push(`phone:${normalizedIdentity}`);
    }
  }
  if (targets.length === 0) {
    targets.push('default');
  }

  const encoder = new TextEncoder();
  const payloadMessage = businessNumberId
    ? { ...message, businessNumberId }
    : message;
  const data = `data: ${JSON.stringify({ type: 'new_message', message: payloadMessage })}\n\n`;

  for (const target of targets) {
    const conns = connections.get(target);
    if (conns) {
      // Filter out closed connections
      const activeConns = conns.filter(controller => {
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (error) {
          return false;
        }
      });
      
      // Update connections list
      if (activeConns.length !== conns.length) {
        if (activeConns.length === 0) {
          connections.delete(target);
        } else {
          connections.set(target, activeConns);
        }
      }
    }
  }
}

export function broadcastActiveChatsUpdate(businessNumberId: string, chat?: ActiveChat | null) {
  const target = `business:${businessNumberId}`;
  const conns = connections.get(target);
  if (!conns || conns.length === 0) return;

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({
    type: 'active_chats_updated',
    businessNumberId,
    chat: chat || undefined,
    chatKey: chat?.chatKey || chat?.phoneNumber || undefined,
    refresh: !chat,
  })}\n\n`;

  const activeConns = conns.filter(controller => {
    try {
      controller.enqueue(encoder.encode(data));
      return true;
    } catch (error) {
      return false;
    }
  });
  
  if (activeConns.length !== conns.length) {
    if (activeConns.length === 0) {
      connections.delete(target);
    } else {
      connections.set(target, activeConns);
    }
  }
}

export function broadcastMessageStatusUpdate(
  businessNumberId: string | null,
  phoneNumber: string | string[] | null,
  messageId: string,
  status: string
) {
  const targets: string[] = [];
  
  if (businessNumberId) {
    targets.push(`business:${businessNumberId}`);
  }
  const identityTargets = Array.isArray(phoneNumber)
    ? phoneNumber
    : phoneNumber
      ? [phoneNumber]
      : [];

  for (const identity of identityTargets) {
    const normalizedIdentity = normalizeWhatsAppIdentity(identity);
    if (normalizedIdentity) {
      targets.push(`phone:${normalizedIdentity}`);
    }
  }
  if (targets.length === 0) {
    targets.push('default');
  }

  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify({ type: 'message_status_update', messageId, status })}\n\n`;

  for (const target of targets) {
    const conns = connections.get(target);
    if (conns) {
      const activeConns = conns.filter(controller => {
        try {
          controller.enqueue(encoder.encode(data));
          return true;
        } catch (error) {
          return false;
        }
      });
      
      if (activeConns.length !== conns.length) {
        if (activeConns.length === 0) {
          connections.delete(target);
        } else {
          connections.set(target, activeConns);
        }
      }
    }
  }
}

// Export the connections map for the route handler to use
export function getConnections() {
  return connections;
}
