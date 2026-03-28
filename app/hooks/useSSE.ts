import { useEffect, useRef, useCallback } from 'react';
import type { ActiveChat } from '../components/types';

export interface SSEMessage {
  type: 'connected' | 'new_message' | 'active_chats_updated' | 'message_status_update';
  message?: any;
  messageId?: string;
  status?: string;
  businessNumberId?: string;
  chat?: ActiveChat;
  chatKey?: string;
  refresh?: boolean;
}

export interface UseSSEOptions {
  businessNumberId?: string | null;
  phoneNumber?: string | null;
  onMessage?: (data: SSEMessage) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

export function useSSE({ 
  businessNumberId, 
  phoneNumber, 
  onMessage, 
  onError,
  enabled = true 
}: UseSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isIntentionallyClosingRef = useRef(false);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds
  
  // Use refs for callbacks to prevent reconnection loops
  // This allows callbacks to change without recreating the connect function
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const enabledRef = useRef(enabled);
  const businessNumberIdRef = useRef(businessNumberId);
  const phoneNumberRef = useRef(phoneNumber);
  
  // Update refs when values change
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    enabledRef.current = enabled;
    businessNumberIdRef.current = businessNumberId;
    phoneNumberRef.current = phoneNumber;
  }, [onMessage, onError, enabled, businessNumberId, phoneNumber]);

  const connect = useCallback(() => {
    // Check if still enabled and has required params
    if (!enabledRef.current) return;
    if (!businessNumberIdRef.current && !phoneNumberRef.current) return;

    // Close existing connection if any
    if (eventSourceRef.current) {
      isIntentionallyClosingRef.current = true;
      const oldEventSource = eventSourceRef.current;
      eventSourceRef.current = null;
      oldEventSource.close();
    }

    // Build SSE URL
    const params = new URLSearchParams();
    if (businessNumberIdRef.current) {
      params.append('businessNumberId', businessNumberIdRef.current);
    }
    if (phoneNumberRef.current) {
      params.append('phoneNumber', phoneNumberRef.current);
    }

    const url = `/api/realtime?${params.toString()}`;
    console.log('🔌 Connecting to SSE:', url);

    try {
      // Reset flag before creating new connection
      isIntentionallyClosingRef.current = false;
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ SSE connection opened');
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      };

      eventSource.onmessage = (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data);
          console.log('📨 SSE message received:', data);
          onMessageRef.current?.(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        const currentEventSource = eventSourceRef.current;
        
        // Check if connection was intentionally closed
        if (isIntentionallyClosingRef.current) {
          console.log('🔌 SSE connection closed intentionally, not reconnecting');
          return;
        }

        // Check connection state - only reconnect if actually closed unexpectedly
        if (currentEventSource && currentEventSource.readyState === EventSource.CLOSED) {
          console.error('❌ SSE connection closed unexpectedly');
          onErrorRef.current?.(error);
          
          // Only reconnect if still enabled and has required params
          if (!enabledRef.current) {
            console.log('🔌 SSE disabled, not reconnecting');
            return;
          }
          
          if (!businessNumberIdRef.current && !phoneNumberRef.current) {
            console.log('🔌 SSE params missing, not reconnecting');
            return;
          }
          
          // Attempt to reconnect
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              // Double-check before reconnecting
              if (enabledRef.current && (businessNumberIdRef.current || phoneNumberRef.current)) {
                connect();
              }
            }, reconnectDelay);
          } else {
            console.error('❌ Max reconnect attempts reached. SSE connection failed.');
          }
        } else if (currentEventSource && currentEventSource.readyState === EventSource.CONNECTING) {
          // Connection is still connecting, don't treat as error
          console.log('🔄 SSE connection still connecting...');
        }
      };
    } catch (error) {
      console.error('Error creating SSE connection:', error);
      isIntentionallyClosingRef.current = false;
    }
  }, []); // Empty deps - we use refs for all values

  const disconnect = useCallback(() => {
    isIntentionallyClosingRef.current = true;
    
    if (eventSourceRef.current) {
      console.log('🔌 Disconnecting SSE');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    reconnectAttemptsRef.current = 0;
    
    // Reset flag after a short delay
    setTimeout(() => {
      isIntentionallyClosingRef.current = false;
    }, 100);
  }, []);

  useEffect(() => {
    if (enabled && (businessNumberId || phoneNumber)) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, businessNumberId, phoneNumber]); // Removed connect and disconnect from deps to prevent reconnection loops

  return { connect, disconnect };
}
