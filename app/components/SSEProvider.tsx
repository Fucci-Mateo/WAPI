"use client";
import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSSE, SSEMessage } from '../hooks/useSSE';
import { Message } from './types';

export default function SSEProvider() {
  const {
    selectedNumber,
    activeChat,
    addMessage,
    replaceMessage,
    updateMessageStatus,
    setContactNames,
    fetchActiveChats,
  } = useAppStore();

  // Helper to normalize phone numbers
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    let normalized = phone.startsWith('+') ? phone.substring(1) : phone;
    normalized = normalized.replace(/\s+/g, '').replace(/%20/g, '');
    return normalized;
  };

  // Handle SSE messages - MEMOIZED to prevent reconnection loops
  const handleSSEMessage = useCallback((data: SSEMessage) => {
    // Get current messages from store to avoid stale closures
    const messages = useAppStore.getState().messages;
    if (data.type === 'new_message' && data.message) {
      const msg = data.message;
      
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
        text: displayText,
        timestamp: msg.timestamp,
        type: msg.type,
        status: msg.status,
        userId: msg.userId,
        userName: msg.userName,
        media,
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
            const normalizedFrom = normalizePhoneNumber(msg.from);
            setContactNames({
              ...useAppStore.getState().contactNames,
              [normalizedFrom]: msg.contactName,
            });
          }
          return;
        }
      }
      
      // No match found, add as new message
      console.log('📥 Adding new message from SSE:', clientMessage);
      addMessage(clientMessage);
      
      // Update contact name if provided
      if (msg.contactName && msg.from) {
        const normalizedFrom = normalizePhoneNumber(msg.from);
        setContactNames({
          ...useAppStore.getState().contactNames,
          [normalizedFrom]: msg.contactName,
        });
      }
    } else if (data.type === 'active_chats_updated') {
      console.log('📋 Active chats updated, refreshing...');
      // Refresh active chats list
      if (selectedNumber?.numberId) {
        fetchActiveChats();
      }
    } else if (data.type === 'message_status_update' && (data as any).messageId && (data as any).status) {
      const { messageId, status } = data as any;
      console.log('📊 Updating message status from SSE:', messageId, status);
      updateMessageStatus(messageId, status);
    }
  }, [addMessage, replaceMessage, updateMessageStatus, setContactNames, fetchActiveChats, selectedNumber?.numberId]);

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

