"use client";
import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSSE, SSEMessage } from '../hooks/useSSE';
import { Message } from './types';
import { normalizeWhatsAppIdentity } from '../lib/whatsappIdentity';

export default function SSEProvider() {
  const selectedNumber = useAppStore((state) => state.selectedNumber);
  const activeChat = useAppStore((state) => state.activeChat);
  const addMessage = useAppStore((state) => state.addMessage);
  const replaceMessage = useAppStore((state) => state.replaceMessage);
  const updateMessageStatus = useAppStore((state) => state.updateMessageStatus);
  const setContactNames = useAppStore((state) => state.setContactNames);
  const fetchActiveChats = useAppStore((state) => state.fetchActiveChats);
  const upsertActiveChat = useAppStore((state) => state.upsertActiveChat);

  // Handle SSE messages - MEMOIZED to prevent reconnection loops
  const handleSSEMessage = useCallback((data: SSEMessage) => {
    // Get current messages from store to avoid stale closures
    const messages = useAppStore.getState().messages;
    if (data.type === 'new_message' && data.message) {
      const msg = data.message;
      if (msg.businessNumberId && selectedNumber?.numberId && msg.businessNumberId !== selectedNumber.numberId) {
        return;
      }
      
      // Convert server message format to client format
      // Handle media messages format: [Type] media_id=xxx|fileName=xxx|mimeType=xxx|Caption text
      let media: Message['media'] | undefined;
      let displayText = msg.text || '';
      const text: string = msg.text || '';
      
      // Check if this is a media message format
      const mediaMatch = text.match(/^\[(Image|Audio|Document)\]\s+media_id=([^|]+)(?:\|(.+))?$/i);
      if (mediaMatch) {
        const mediaType = mediaMatch[1].toLowerCase() as 'image' | 'audio' | 'document';
        const id = mediaMatch[2];
        const rest = mediaMatch[3] || '';
        
        let fileName: string | undefined;
        let mimeType: string | undefined;
        let caption = '';
        
        if (rest) {
          const parts = rest.split('|');
          let lastMetadataIndex = -1;
          
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            if (part.startsWith('fileName=')) {
              fileName = part.substring('fileName='.length);
              lastMetadataIndex = i;
            } else if (part.startsWith('mimeType=')) {
              mimeType = part.substring('mimeType='.length);
              lastMetadataIndex = i;
            } else {
              caption = parts.slice(i).join('|');
              break;
            }
          }
        }
        
        media = {
          kind: mediaType,
          id,
          url: `/api/media/${id}`,
          ...(fileName && { fileName }),
          ...(mimeType && { mimeType }),
        };
        displayText = caption || '';
      }
      
      const clientMessage: Message = {
        id: msg.id,
        from: msg.from,
        to: msg.to,
        businessNumberId: msg.businessNumberId,
        text: displayText,
        timestamp: msg.timestamp,
        type: msg.type,
        status: msg.status,
        userId: msg.userId,
        userName: msg.userName,
        media,
        conversationKey: msg.conversationKey,
        conversationAliases: msg.conversationAliases,
      };

      // Check if message already exists by ID (avoid duplicates)
      const existingMessageById = messages.find((m: Message) => m.id === clientMessage.id);
      if (existingMessageById) {
        console.log('📥 Message already exists (by ID), skipping:', clientMessage.id);
        return;
      }
      
      // Check if this is a sent message that matches an optimistic message
      // Optimistic messages have temporary IDs (timestamp strings) and status 'sending'
      // Match by: type='sent', same from/to, same content (text or media), timestamp within 10 seconds
      if (clientMessage.type === 'sent') {
        const messageTimestamp = new Date(clientMessage.timestamp).getTime();
        const optimisticMessage = messages.find((m: Message) => {
          if (m.type !== 'sent' || m.status !== 'sending') return false;
          if (m.from !== clientMessage.from || m.to !== clientMessage.to) return false;
          
          // For media messages, match by media ID
          if (clientMessage.media && m.media) {
            if (clientMessage.media.id !== m.media.id) return false;
            // Also check caption/text match if both have it
            if (clientMessage.text !== m.text) return false;
          } else if (clientMessage.media || m.media) {
            // One has media, the other doesn't - not a match
            return false;
          } else {
            // Both are text messages, match by text
            if (m.text !== clientMessage.text) return false;
          }
          
          // Check if timestamp is within 10 seconds (optimistic message was just created)
          const mTimestamp = new Date(m.timestamp).getTime();
          const timeDiff = Math.abs(messageTimestamp - mTimestamp);
          return timeDiff < 10000; // 10 seconds
        });
        
        if (optimisticMessage) {
          console.log('📥 Replacing optimistic message with real message:', optimisticMessage.id, '->', clientMessage.id);
          replaceMessage(optimisticMessage.id, clientMessage);
          
          // Update contact name if provided
      if (msg.contactName && msg.from) {
            const aliases = Array.from(new Set([
              msg.conversationKey,
              ...(msg.conversationAliases || []),
              msg.from,
              msg.to,
            ].map((alias) => normalizeWhatsAppIdentity(alias)).filter(Boolean)));

            const nextContactNames = { ...useAppStore.getState().contactNames };
            for (const alias of aliases) {
              nextContactNames[alias] = msg.contactName;
            }
            setContactNames(nextContactNames);
          }
          return;
        }
      }
      
      // No match found, add as new message
      console.log('📥 Adding new message from SSE:', clientMessage);
      addMessage(clientMessage);
      
      // Update contact name if provided
      if (msg.contactName && msg.from) {
        const aliases = Array.from(new Set([
          msg.conversationKey,
          ...(msg.conversationAliases || []),
          msg.from,
          msg.to,
        ].map((alias) => normalizeWhatsAppIdentity(alias)).filter(Boolean)));

        const nextContactNames = { ...useAppStore.getState().contactNames };
        for (const alias of aliases) {
          nextContactNames[alias] = msg.contactName;
        }
        setContactNames(nextContactNames);
      }
    } else if (data.type === 'active_chats_updated') {
      console.log('📋 Active chats updated, refreshing...');
      if (data.businessNumberId && selectedNumber?.numberId && data.businessNumberId !== selectedNumber.numberId) {
        return;
      }

      if (data.chat) {
        upsertActiveChat(data.chat);
      } else if (selectedNumber?.numberId && data.refresh !== false) {
        fetchActiveChats();
      }
    } else if (data.type === 'message_status_update' && (data as any).messageId && (data as any).status) {
      const { messageId, status } = data as any;
      console.log('📊 Updating message status from SSE:', messageId, status);
      updateMessageStatus(messageId, status);
    }
  }, [addMessage, replaceMessage, updateMessageStatus, setContactNames, fetchActiveChats, selectedNumber?.numberId, upsertActiveChat]);

  const handleSSEError = useCallback((error: Event) => {
    console.error('SSE error:', error);
  }, []);

  // Connect to SSE for business number (for active chats updates)
  useSSE({
    businessNumberId: selectedNumber?.numberId || null,
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    enabled: !!selectedNumber?.numberId,
  });

  // Connect to SSE for active chat (for conversation messages)
  useSSE({
    phoneNumber: activeChat || null,
    onMessage: handleSSEMessage,
    onError: handleSSEError,
    enabled: !!activeChat,
  });

  return null; // This is a provider component, doesn't render anything
}
