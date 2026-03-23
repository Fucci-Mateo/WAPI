import { create } from 'zustand';
import { Message, Template, NumberOption, ActiveChat } from '../components/types';
import { validatePhoneNumber, validateMessage } from '../lib/validation';
import { toast } from 'react-hot-toast';

// Add WindowStatus interface for client-side use
interface WindowStatus {
  isOpen: boolean;
  canSendFreeForm: boolean;
  canSendTemplate: boolean;
  timeRemaining: number;
  expiresAt: string;
}

interface AppState {
  // Messages
  messages: Message[];
  text: string;
  sending: boolean;
  error: string;
  contactNames: Record<string, string>;
  
  // Templates
  templates: Template[];
  selectedTemplate: Template | null;
  templateVariables: Record<string, string>;
  showTemplates: boolean;
  loadingTemplates: boolean;
  sendingTemplate: boolean;
  templateError: string;
  
  // UI State
  selectedNumber: NumberOption | null;
  activeChat: string;
  isNewChat: boolean;
  newChatNumber: string;
  isLoading: boolean;
  
  // Customer Service Windows
  windowStatus: WindowStatus | null;
  
  // Pagination State
  hasMoreMessages: boolean;
  loadingMoreMessages: boolean;
  messagesOffset: number;
  
  // Conversation Pagination State
  conversationHasMore: boolean;
  loadingConversationMore: boolean;
  conversationOffset: number;
  
  // Active Chats State
  activeChats: ActiveChat[];
  loadingActiveChats: boolean;
  
  // Actions
  setText: (text: string) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string) => void;
  addMessage: (message: Message) => void;
  replaceMessage: (oldMessageId: string, newMessage: Message) => void;
  updateMessageStatus: (messageId: string, status: Message['status']) => void;
  setContactNames: (contactNames: Record<string, string>) => void;
  
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setTemplateVariables: (variables: Record<string, string>) => void;
  setShowTemplates: (show: boolean) => void;
  setLoadingTemplates: (loading: boolean) => void;
  setSendingTemplate: (sending: boolean) => void;
  setTemplateError: (error: string) => void;
  
  setSelectedNumber: (number: NumberOption | null) => void;
  setActiveChat: (chat: string) => void;
  setIsNewChat: (isNew: boolean) => void;
  setNewChatNumber: (number: string) => void;
  setIsLoading: (loading: boolean) => void;
  
  // Customer Service Window Actions
  updateWindowStatus: (phoneNumber: string) => void;
  recordUserMessage: (phoneNumber: string) => void;
  canSendMessageType: (messageType: 'text' | 'template' | 'media' | 'interactive') => boolean;
  
  // Aliases for component compatibility
  onTextChange: (text: string) => void;
  onTemplateSelect: (template: Template | null) => void;
  onTemplateVariableChange: (variables: Record<string, string>) => void;
  onCloseTemplates: () => void;
  
  // Complex Actions
  sendMessage: () => Promise<void>;
  sendMediaMessage: (mediaId: string, mediaType: 'image' | 'audio' | 'document', caption?: string, fileName?: string, mimeType?: string) => Promise<boolean>;
  fetchTemplates: () => Promise<void>;
  sendTemplate: () => Promise<void>;
  startNewChat: (phoneNumber: string) => void;
  cancelNewChat: () => void;
  fetchMessages: (append?: boolean) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  setMessages: (messages: Message[]) => void;
  setHasMoreMessages: (hasMore: boolean) => void;
  setLoadingMoreMessages: (loading: boolean) => void;
  setMessagesOffset: (offset: number) => void;
  resetPagination: () => void;
  
  // Conversation Pagination Actions
  fetchConversationMessages: (phoneNumber: string, append?: boolean, polling?: boolean) => Promise<void>;
  loadMoreConversationMessages: () => Promise<void>;
  resetConversationPagination: () => void;
  setConversationHasMore: (hasMore: boolean) => void;
  setLoadingConversationMore: (loading: boolean) => void;
  setConversationOffset: (offset: number) => void;
  
  // Active Chats Actions
  fetchActiveChats: () => Promise<void>;
  setActiveChats: (chats: ActiveChat[]) => void;
  setLoadingActiveChats: (loading: boolean) => void;
  
  // Mark Messages as Read
  markMessagesAsRead: (phoneNumber: string) => Promise<void>;
}

async function fetchWindowStatus(phoneNumber: string) {
  try {
    const res = await fetch(`/api/window-status?phone=${encodeURIComponent(phoneNumber)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  messages: [],
  text: '',
  sending: false,
  error: '',
  contactNames: {},
  
  templates: [],
  selectedTemplate: null,
  templateVariables: {},
  showTemplates: false,
  loadingTemplates: false,
  sendingTemplate: false,
  templateError: '',
  
  selectedNumber: null,
  activeChat: '',
  isNewChat: false,
  newChatNumber: '',
  isLoading: true,
  
  windowStatus: null,
  
  // Pagination State
  hasMoreMessages: false,
  loadingMoreMessages: false,
  messagesOffset: 0,
  
  // Conversation Pagination State
  conversationHasMore: false,
  loadingConversationMore: false,
  conversationOffset: 0,
  
  // Active Chats State
  activeChats: [],
  loadingActiveChats: false,
  
  // Simple Actions
  setText: (text) => set({ text }),
  setSending: (sending) => set({ sending }),
  setError: (error) => set({ error }),
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  replaceMessage: (oldMessageId, newMessage) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === oldMessageId ? newMessage : msg
    )
  })),
  updateMessageStatus: (messageId, status) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, status } : msg
    )
  })),
  setContactNames: (contactNames) => set({ contactNames }),
  
  setTemplates: (templates) => set({ templates }),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setTemplateVariables: (variables) => set({ templateVariables: variables }),
  setShowTemplates: (show: boolean) => set({ showTemplates: show }),
  setLoadingTemplates: (loading) => set({ loadingTemplates: loading }),
  setSendingTemplate: (sending) => set({ sendingTemplate: sending }),
  setTemplateError: (error) => set({ templateError: error }),
  
  setSelectedNumber: (number) => set({ selectedNumber: number }),
  setActiveChat: (chat) => {
    const { resetConversationPagination, markMessagesAsRead, selectedNumber } = get();
    resetConversationPagination();
    set({ activeChat: chat });
    
    // Mark messages as read when opening a chat
    if (chat && selectedNumber?.numberId) {
      markMessagesAsRead(chat).catch(error => {
        console.error('Error marking messages as read:', error);
      });
    }
  },
  setIsNewChat: (isNew) => set({ isNewChat: isNew }),
  setNewChatNumber: (number) => set({ newChatNumber: number }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  // Pagination Actions
  setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),
  setLoadingMoreMessages: (loading) => set({ loadingMoreMessages: loading }),
  setMessagesOffset: (offset) => set({ messagesOffset: offset }),
  resetPagination: () => set({ hasMoreMessages: false, loadingMoreMessages: false, messagesOffset: 0 }),
  
  // Conversation Pagination Actions
  resetConversationPagination: () => set({ conversationHasMore: false, loadingConversationMore: false, conversationOffset: 0 }),
  setConversationHasMore: (hasMore: boolean) => set({ conversationHasMore: hasMore }),
  setLoadingConversationMore: (loading: boolean) => set({ loadingConversationMore: loading }),
  setConversationOffset: (offset: number) => set({ conversationOffset: offset }),
  
  // Active Chats Actions
  setActiveChats: (chats: ActiveChat[]) => set({ activeChats: chats }),
  setLoadingActiveChats: (loading: boolean) => set({ loadingActiveChats: loading }),
  
  fetchActiveChats: async () => {
    const { selectedNumber, setActiveChats, setLoadingActiveChats, setContactNames } = get();
    
    if (!selectedNumber?.numberId) {
      console.log('🔍 fetchActiveChats: No selected number, skipping');
      setActiveChats([]);
      return;
    }
    
    try {
      setLoadingActiveChats(true);
      console.log('🔍 fetchActiveChats: Fetching contacts for business number:', selectedNumber.numberId);
      
      const url = `/api/contacts?businessNumberId=${encodeURIComponent(selectedNumber.numberId)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        console.log(`📋 Fetched ${data.contacts?.length || 0} active contacts`);
        setActiveChats(data.contacts || []);
        
        // Update contact names in the store
        const contactNames: Record<string, string> = {};
        (data.contacts || []).forEach((contact: ActiveChat) => {
          if (contact.contactName) {
            contactNames[contact.phoneNumber] = contact.contactName;
          }
        });
        setContactNames(contactNames);
      } else {
        console.error('Failed to fetch active chats:', data.error);
        setActiveChats([]);
      }
    } catch (error) {
      console.error('Error fetching active chats:', error);
      setActiveChats([]);
    } finally {
      setLoadingActiveChats(false);
    }
  },
  
  markMessagesAsRead: async (phoneNumber: string) => {
    const { selectedNumber, fetchActiveChats } = get();
    
    if (!selectedNumber?.numberId || !phoneNumber) {
      console.log('⚠️ Cannot mark messages as read: missing numberId or phoneNumber');
      return;
    }
    
    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          numberId: selectedNumber.numberId,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Marked ${data.marked || 0} message(s) as read for ${phoneNumber}`);
        
        // Refresh active chats to get updated unread counts
        fetchActiveChats();
      } else {
        console.error('❌ Failed to mark messages as read:', data.error);
      }
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  },
  
  fetchConversationMessages: async (phoneNumber: string, append = false, polling = false) => {
    const {
      messages,
      setMessages,
      setContactNames,
      setConversationHasMore,
      setLoadingConversationMore,
      setConversationOffset,
      resetConversationPagination,
      markMessagesAsRead,
    } = get();
    
    // Helper to normalize phone numbers for comparison
    const normalizePhoneNumber = (phone: string): string => {
      if (!phone) return '';
      let normalized = phone.startsWith('+') ? phone.substring(1) : phone;
      normalized = normalized.replace(/\s+/g, '').replace(/%20/g, '');
      return normalized;
    };
    
    try {
      // Reset pagination if not appending and not polling (initial load only)
      if (!append && !polling) {
        resetConversationPagination();
      }
      
      // Always set loading to true since we're fetching data
      setLoadingConversationMore(true);
      
      // Get current conversationOffset from state AFTER potential reset
      // This ensures we have the latest value, especially important for append mode
      const currentState = get();
      const conversationOffset = currentState.conversationOffset || 0;
      
      const limit = 100;
      // For polling, always fetch from offset 0 (latest messages)
      // For append, use current offset to get older messages
      // For initial load, use offset 0
      const offset = polling ? 0 : (append ? conversationOffset : 0);
      
      console.log(`🔍 fetchConversationMessages: phoneNumber=${phoneNumber}, append=${append}, polling=${polling}, conversationOffset=${conversationOffset}, calculatedOffset=${offset}`);
      
      const url = `/api/messages?phoneNumber=${encodeURIComponent(phoneNumber)}&offset=${offset}&limit=${limit}`;
      
      console.log(`🔍 Fetching from URL: ${url}`);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log(`🔍 API Response: hasMore=${data.hasMore}, messagesCount=${data.messages?.length || 0}, returnedOffset=${data.offset}, returnedLimit=${data.limit}`);
      
      if (response.ok) {
        // Convert server messages to client format
        const clientMessages: Message[] = data.messages.map((msg: any) => {
          // Detect media placeholders stored on server, but prefer explicit media field if provided by API
          let media: Message['media'] | undefined = msg.media;
          let displayText = msg.text || '';
          const text: string = msg.text || '';
          
          // If no explicit media is present, fall back to encoded text format parsing
          const mediaMatch = !media ? text.match(/^\[(Image|Audio|Document)\]\s+media_id=([^|]+)(?:\|(.+))?$/i) : null;
          if (mediaMatch) {
            const mediaType = mediaMatch[1].toLowerCase() as 'image' | 'audio' | 'document';
            const id = mediaMatch[2];
            const rest = mediaMatch[3] || '';
            
            // Parse metadata fields separated by |
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

          return {
            id: msg.id,
            from: msg.from,
            to: msg.to,
            text: displayText,
            timestamp: msg.timestamp,
            type: msg.type.toLowerCase() as 'sent' | 'received',
            status: msg.status?.toLowerCase() as 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
            media,
            userId: msg.userId,
            userName: msg.userName,
          };
        });
        
        const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
        
        // Handle append mode: prepend older messages (they come in DESC order, so reverse for prepend)
        if (append) {
          // Messages are returned in DESC order (newest first), but we want to prepend older ones
          // So we reverse them to get oldest first, then prepend
          const reversedMessages = clientMessages.reverse();
          const existingIds = new Set(messages.map(m => m.id));
          const newMessages = reversedMessages.filter(m => !existingIds.has(m.id));
          setMessages([...newMessages, ...messages]);
          
          // Get the current offset from state again to ensure we have the latest value
          const currentOffset = get().conversationOffset || 0;
          
          // Increment offset by the actual number fetched (limit + 1 if hasMore, else actual count)
          // This prevents overlap because API fetches limit+1 items to check hasMore
          const actualFetched = data.hasMore ? limit + 1 : clientMessages.length;
          const newOffset = currentOffset + actualFetched;
          
          console.log(`📥 Append mode: currentOffset=${currentOffset}, actualFetched=${actualFetched}, newOffset=${newOffset}`);
          console.log(`📥 Prepended ${newMessages.length} older messages (${clientMessages.length} total fetched, ${actualFetched} actually fetched from DB)`);
          
          setConversationOffset(newOffset);
        } else if (polling) {
          // Polling mode: fetch latest messages and append only new ones
          // Don't reset pagination state - preserve conversationOffset and conversationHasMore
          const normalizedPhone = normalizePhoneNumber(phoneNumber);
          
          // Get existing messages for this conversation
          const existingConversationMessages = messages.filter(msg => {
            const msgFrom = normalizePhoneNumber(msg.from);
            const msgTo = normalizePhoneNumber(msg.to);
            return msgFrom === normalizedPhone || msgTo === normalizedPhone;
          });
          
          // Messages come in DESC order (newest first), reverse to get chronological order
          const reversedMessages = clientMessages.reverse();
          const existingIds = new Set(existingConversationMessages.map(m => m.id));
          const newMessages = reversedMessages.filter(m => !existingIds.has(m.id));
          
          if (newMessages.length > 0) {
            // Get messages from other conversations
            const otherMessages = messages.filter(msg => {
              const msgFrom = normalizePhoneNumber(msg.from);
              const msgTo = normalizePhoneNumber(msg.to);
              return !(msgFrom === normalizedPhone || msgTo === normalizedPhone);
            });
            
            // Merge: other conversations + existing conversation messages + new messages
            // Sort all messages by timestamp to maintain chronological order
            const allMessages = [...otherMessages, ...existingConversationMessages, ...newMessages].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            
            setMessages(allMessages);
            console.log(`📥 Polling: added ${newMessages.length} new messages (${clientMessages.length} total fetched)`);
          }
          // Don't update conversationOffset or conversationHasMore during polling - preserve pagination state
        } else {
          // Initial load: remove existing messages for this conversation and add new ones
          // Keep messages from other conversations
          const normalizedPhone = normalizePhoneNumber(phoneNumber);
          const otherMessages = messages.filter(msg => {
            // Check if message belongs to this conversation
            const msgFrom = normalizePhoneNumber(msg.from);
            const msgTo = normalizePhoneNumber(msg.to);
            // Message belongs to this conversation if from or to matches
            return !(msgFrom === normalizedPhone || msgTo === normalizedPhone);
          });
          
          // Reverse to show oldest first (messages come DESC from server)
          const reversedMessages = clientMessages.reverse();
          
          // Merge: other conversations + this conversation messages
          // Sort all messages by timestamp to maintain chronological order across conversations
          const allMessages = [...otherMessages, ...reversedMessages].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          setMessages(allMessages);
          // Increment offset by the actual number fetched (limit + 1 if hasMore, else actual count)
          // This prevents overlap because API fetches limit+1 items to check hasMore
          const actualFetched = data.hasMore ? limit + 1 : reversedMessages.length;
          console.log(`📥 Initial load: actualFetched=${actualFetched}, hasMore=${data.hasMore}, setting conversationOffset to ${actualFetched}`);
          console.log(`📥 Fetched ${reversedMessages.length} conversation messages, kept ${otherMessages.length} from other conversations (${actualFetched} actually fetched from DB)`);
          
          setConversationOffset(actualFetched);
        }
        
        // Update pagination state (but not during polling to preserve state)
        if (!polling) {
          setConversationHasMore(data.hasMore || false);
        }
        setContactNames(data.contactNames || {});
        
        // Mark messages as read when fetching conversation (only on initial load, not append/polling)
        if (!append && !polling) {
          markMessagesAsRead(phoneNumber).catch(error => {
            console.error('Error marking messages as read after fetch:', error);
          });
        }
      } else {
        console.error('Failed to fetch conversation messages:', data.error);
        setConversationHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      setConversationHasMore(false);
    } finally {
      setLoadingConversationMore(false);
    }
  },
  
  loadMoreConversationMessages: async () => {
    const { activeChat, conversationHasMore, loadingConversationMore, fetchConversationMessages, conversationOffset } = get();
    console.log(`🔍 loadMoreConversationMessages called: activeChat=${activeChat}, conversationHasMore=${conversationHasMore}, loadingConversationMore=${loadingConversationMore}, conversationOffset=${conversationOffset}`);
    
    if (!activeChat || !conversationHasMore || loadingConversationMore) {
      console.log(`🔍 loadMoreConversationMessages: Skipping - conditions not met`);
      return;
    }
    await fetchConversationMessages(activeChat, true);
  },
  
  // Customer Service Window Actions
  updateWindowStatus: async (phoneNumber) => {
    const status = await fetchWindowStatus(phoneNumber);
    set({ windowStatus: status });
  },
  
  recordUserMessage: async (phoneNumber) => {
    // The server will update the window on incoming message, so just fetch the latest status
    const status = await fetchWindowStatus(phoneNumber);
    set({ windowStatus: status });
  },
  
  canSendMessageType: (messageType) => {
    const { windowStatus } = get();
    if (!windowStatus) return false;
    if (messageType === 'template') return windowStatus.canSendTemplate;
    return windowStatus.canSendFreeForm;
  },
  
  // Aliases for component compatibility
  onTextChange: (text: string) => set({ text }),
  onTemplateSelect: (template: Template | null) => set({ selectedTemplate: template }),
  onTemplateVariableChange: (variables: Record<string, string>) => set({ templateVariables: variables }),
  onCloseTemplates: () => set({ showTemplates: false }),
  
  // Complex Actions
  sendMessage: async () => {
    const { 
      text, 
      selectedNumber, 
      activeChat, 
      addMessage, 
      updateMessageStatus, 
      setSending, 
      setError, 
      setText, 
      updateWindowStatus, 
      canSendMessageType 
    } = get();
    
    if (!selectedNumber || !activeChat || !text.trim()) {
      toast.error('Please select a number, ensure chat is active, and enter a message');
      return;
    }
    
    // Check if we can send free-form messages
    if (!canSendMessageType('text')) {
      toast.error('Customer service window is closed. You can only send template messages.');
      return;
    }
    
    // Validate phone number format
    const phoneValidation = validatePhoneNumber(activeChat);
    if (!phoneValidation.success) {
      toast.error(phoneValidation.error);
      return;
    }
    
    // Validate message
    const messageValidation = validateMessage({ text, to: activeChat });
    if (!messageValidation.success) {
      toast.error(messageValidation.error);
      return;
    }
    
    setSending(true);
    setError('');
    
    const messageId = Date.now().toString();
    const newMessage: Message = {
      id: messageId,
      from: selectedNumber.numberId, // Use the actual business phone number, not the label
      to: activeChat,
      text,
      timestamp: new Date().toISOString(),
      type: 'sent',
      status: 'sending'
    };
    
    addMessage(newMessage);
    setText('');
    
    const loadingToast = toast.loading('Sending message...');
    
    try {
      // Use the validated phone number (already has + prefix)
      const validatedPhone = phoneValidation.data;
      
      const res = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: validatedPhone,
          text,
          numberId: selectedNumber.numberId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        updateMessageStatus(messageId, 'sent');
        toast.success('Message sent successfully!', { id: loadingToast });
        
        // Refresh the customer service window status after sending
        // This ensures the window stays open for subsequent messages
        updateWindowStatus(activeChat);
      } else {
        updateMessageStatus(messageId, 'failed');
        toast.error(data.error || 'Failed to send message', { id: loadingToast });
        setError(data.error || 'Failed to send message');
      }
    } catch (error) {
      updateMessageStatus(messageId, 'failed');
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      toast.error(errorMessage, { id: loadingToast });
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  },

  sendMediaMessage: async (mediaId: string, mediaType: 'image' | 'audio' | 'document', caption?: string, fileName?: string, mimeType?: string) => {
    const { 
      selectedNumber, 
      activeChat, 
      addMessage, 
      updateMessageStatus, 
      setSending, 
      setError, 
      setText, 
      updateWindowStatus, 
      canSendMessageType 
    } = get();
    
    if (!selectedNumber || !activeChat) {
      toast.error('Please select a number and ensure chat is active');
      return false;
    }
    
    // Check if we can send free-form messages
    if (!canSendMessageType('media')) {
      toast.error('Customer service window is closed. You can only send template messages.');
      return false;
    }
    
    // Validate phone number format
    const phoneValidation = validatePhoneNumber(activeChat);
    if (!phoneValidation.success) {
      toast.error(phoneValidation.error);
      return false;
    }
    
    setSending(true);
    setError('');
    
    const messageId = Date.now().toString();
    // Use empty string to match database storage format (no placeholder text)
    const messageText = caption || '';
    
    const newMessage: Message = {
      id: messageId,
      from: selectedNumber.numberId,
      to: activeChat,
      text: messageText,
      timestamp: new Date().toISOString(),
      type: 'sent',
      status: 'sending',
      media: {
        kind: mediaType,
        id: mediaId,
        url: `/api/media/${mediaId}`,
        ...(fileName && { fileName }),
        ...(mimeType && { mimeType }),
      },
    };
    
    addMessage(newMessage);
    setText('');
    
    const loadingToast = toast.loading('Sending media...');
    
    try {
      const validatedPhone = phoneValidation.data;
      
      const res = await fetch("/api/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: validatedPhone,
          numberId: selectedNumber.numberId,
          mediaId,
          mediaType,
          caption,
          fileName,
          mimeType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        updateMessageStatus(messageId, 'sent');
        toast.success('Media sent successfully!', { id: loadingToast });
        updateWindowStatus(activeChat);
        return true;
      } else {
        updateMessageStatus(messageId, 'failed');
        toast.error(data.error || 'Failed to send media', { id: loadingToast });
        setError(data.error || 'Failed to send media');
        return false;
      }
    } catch (error) {
      updateMessageStatus(messageId, 'failed');
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      toast.error(errorMessage, { id: loadingToast });
      setError(errorMessage);
      return false;
    } finally {
      setSending(false);
    }
  },

  fetchMessages: async (append = false) => {
    const { 
      setMessages, 
      setContactNames, 
      activeChat, 
      updateWindowStatus, 
      showTemplates, 
      selectedNumber,
      messages,
      messagesOffset,
      setHasMoreMessages,
      setLoadingMoreMessages,
      setMessagesOffset,
      resetPagination
    } = get();
    
    try {
      // Reset pagination if not appending (initial load)
      if (!append) {
        resetPagination();
      }
      
      // Always set loading to true since we're fetching data
      setLoadingMoreMessages(true);
      
      console.log('🔍 fetchMessages called with selectedNumber:', selectedNumber, 'append:', append, 'offset:', messagesOffset);
      
      const limit = 100;
      
      // Build URL with business number filter if selected
      let url = '/api/messages';
      const params = new URLSearchParams();
      
      if (selectedNumber?.numberId) {
        // Only pass businessNumberId - server will look up phone number from database
        params.append('businessNumberId', selectedNumber.numberId);
      }
      
      // Add pagination parameters
      if (append) {
        params.append('offset', messagesOffset.toString());
        params.append('limit', limit.toString());
      } else {
        params.append('offset', '0');
        params.append('limit', limit.toString());
      }
      
      url += `?${params.toString()}`;
      console.log('🔍 Built URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        // Convert server messages to client format
        const clientMessages: Message[] = data.messages.map((msg: any) => {
          // Detect media placeholders stored on server
          // Format: [Type] media_id=xxx|fileName=xxx|mimeType=xxx|Caption text
          // Use | as delimiter to separate metadata fields
          let media: Message['media'] | undefined = msg.media;
          let displayText = msg.text || '';
          const text: string = msg.text || '';
          
          // If no explicit media is present, fall back to encoded text format parsing
          const mediaMatch = !media ? text.match(/^\[(Image|Audio|Document)\]\s+media_id=([^|]+)(?:\|(.+))?$/i) : null;
          if (mediaMatch) {
            const mediaType = mediaMatch[1].toLowerCase() as 'image' | 'audio' | 'document';
            const id = mediaMatch[2];
            const rest = mediaMatch[3] || '';
            
            // Parse metadata fields separated by |
            // Format: fileName=xxx|mimeType=xxx|Caption text
            // Metadata fields come first in order, caption is everything after the last metadata field
            // Parse in order to avoid false matches in filenames/captions
            let fileName: string | undefined;
            let mimeType: string | undefined;
            let caption = '';
            
            if (rest) {
              // Split by | to process parts in order
              const parts = rest.split('|');
              let lastMetadataIndex = -1;
              
              // Process parts in order - metadata fields must be at the start of segments
              for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                
                if (part.startsWith('fileName=')) {
                  fileName = part.substring('fileName='.length);
                  lastMetadataIndex = i;
                } else if (part.startsWith('mimeType=')) {
                  mimeType = part.substring('mimeType='.length);
                  lastMetadataIndex = i;
                } else {
                  // This is not a metadata field, so everything from here is caption
                  // Join remaining parts (including this one) as caption
                  caption = parts.slice(i).join('|');
                  break;
                }
              }
              
              // If no caption was found (all parts were metadata), caption is empty
              if (caption === '' && lastMetadataIndex >= 0 && lastMetadataIndex < parts.length - 1) {
                // This shouldn't happen with current format, but handle edge case
                caption = parts.slice(lastMetadataIndex + 1).join('|');
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

        return ({
          id: msg.id,
          from: msg.from,
          to: msg.to,
          text: displayText,
          timestamp: msg.timestamp,
          type: msg.type.toLowerCase() as 'sent' | 'received',
          status: msg.status?.toLowerCase() as 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
          media,
          userId: msg.userId,
          userName: msg.userName,
        });
        });
        
        // Handle append mode: merge with existing messages and deduplicate by ID
        if (append) {
          const existingIds = new Set(messages.map(m => m.id));
          const newMessages = clientMessages.filter(m => !existingIds.has(m.id));
          setMessages([...messages, ...newMessages]);
          // Increment offset by the actual number fetched (limit + 1 if hasMore, else actual count)
          // This prevents overlap because API fetches limit+1 items to check hasMore
          const actualFetched = data.hasMore ? limit + 1 : clientMessages.length;
          setMessagesOffset(messagesOffset + actualFetched);
          console.log(`📥 Appended ${newMessages.length} new messages (${clientMessages.length} total fetched, ${actualFetched} actually fetched from DB)`);
        } else {
          setMessages(clientMessages);
          // Set offset to the actual number fetched (limit + 1 if hasMore, else actual count)
          // This prevents overlap because API fetches limit+1 items to check hasMore
          const actualFetched = data.hasMore ? limit + 1 : clientMessages.length;
          setMessagesOffset(actualFetched);
          console.log(`📥 Fetched ${clientMessages.length} messages from server (${actualFetched} actually fetched from DB)`);
        }
        
        // Update pagination state
        setHasMoreMessages(data.hasMore || false);
        setContactNames(data.contactNames || {});
        
        // Only update window status if templates modal is not open
        if (activeChat && !showTemplates) {
          updateWindowStatus(activeChat);
        }
      } else {
        console.error('Failed to fetch messages:', data.error);
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setHasMoreMessages(false);
    } finally {
      setLoadingMoreMessages(false);
    }
  },
  
  loadMoreMessages: async () => {
    const { hasMoreMessages, loadingMoreMessages, fetchMessages } = get();
    if (!hasMoreMessages || loadingMoreMessages) {
      return;
    }
    await fetchMessages(true);
  },
  setMessages: (messages: Message[]) => set({ messages }),
  
  fetchTemplates: async () => {
    const { selectedNumber, setLoadingTemplates, setTemplates, setTemplateError, setShowTemplates } = get();
    
    if (!selectedNumber) {
      toast.error('Please select a WhatsApp number first');
      return;
    }
    
    setLoadingTemplates(true);
    setTemplateError('');
    
    const loadingToast = toast.loading('Loading templates...');
    
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wabaId: selectedNumber.wabaId }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch templates");
      
      setTemplates(data.templates || []);
      setShowTemplates(true);
      toast.success(`Loaded ${data.templates?.length || 0} templates`, { id: loadingToast });
    } catch (err: any) {
      const errorMessage = err.message || JSON.stringify(err);
      setTemplateError(errorMessage);
      toast.error('Failed to load templates', { id: loadingToast });
    } finally {
      setLoadingTemplates(false);
    }
  },
  
  sendTemplate: async () => {
    const { selectedTemplate, selectedNumber, activeChat, templateVariables, addMessage, updateMessageStatus, setSendingTemplate, setError, setSelectedTemplate, setTemplateVariables, setShowTemplates, canSendMessageType } = get();
    
    if (!selectedTemplate || !selectedNumber || !activeChat) {
      toast.error('Please select a template and ensure chat is active');
      return;
    }
    
    // Check if we can send template messages
    if (!canSendMessageType('template')) {
      toast.error('Cannot send template messages at this time.');
      return;
    }
    
    // Validate phone number format
    const phoneValidation = validatePhoneNumber(activeChat);
    if (!phoneValidation.success) {
      toast.error(phoneValidation.error);
      return;
    }
    
    setSendingTemplate(true);
    setError('');
    
    const messageId = Date.now().toString();
    const newMessage: Message = {
      id: messageId,
      from: selectedNumber.label,
      to: activeChat,
      text: `Template: ${selectedTemplate.name}`,
      timestamp: new Date().toISOString(),
      type: 'sent',
      status: 'sending'
    };
    
    addMessage(newMessage);
    
    const loadingToast = toast.loading('Sending template...');
    
    try {
      // Build components array with proper parameter structure for WhatsApp API
      // Handle case where components is undefined or null to prevent TypeError
      const components = (selectedTemplate.components || []).map(comp => {
        if (!comp.parameters || comp.parameters.length === 0) {
          return null; // Skip components without parameters
        }
        
        // WhatsApp requires ALL parameters defined in the template to be provided
        // We cannot skip parameters - use user value or fallback to example/default
        const parameters = comp.parameters.map((param: any, index: number) => {
          // Validate parameter has a type
          if (!param.type) {
            console.error(`Parameter ${index + 1} in ${comp.type} component is missing type:`, param);
            throw new Error(`Parameter ${index + 1} in ${comp.type} component is missing type`);
          }
          
          const variableValue = templateVariables[`${comp.type}_${index}`];
          
          // Use user-provided value, or fallback to example text, or use a default
          // WhatsApp requires all parameters, so we must provide a value
          const value = variableValue?.trim() || param.example || param.text || '';
          
          // Build parameter based on type
          const paramObj: any = { type: param.type };
          
          // Include parameter_name if available (for named template parameters)
          if (param.param_name) {
            paramObj.parameter_name = param.param_name;
          }
          
          switch (param.type) {
            case 'text':
              paramObj.text = value;
              break;
            case 'currency':
              // Currency requires currency object and fallback_value
              const currencyAmount = parseFloat(value) || 0;
              paramObj.currency = {
                code: param.currency?.code || 'USD',
                amount_1000: Math.round(currencyAmount * 1000)
              };
              paramObj.fallback_value = value || '0';
              break;
            case 'date_time':
              // Date_time requires date_time object and fallback_value
              paramObj.date_time = {
                component: param.date_time?.component || 'BOTH',
                day_of_week: param.date_time?.day_of_week,
                day_of_month: param.date_time?.day_of_month,
                month: param.date_time?.month,
                year: param.date_time?.year,
                hour: param.date_time?.hour,
                minute: param.date_time?.minute,
                calendar: param.date_time?.calendar || 'GREGORIAN',
                timestamp: param.date_time?.timestamp || Date.now()
              };
              paramObj.fallback_value = value || new Date().toISOString();
              break;
            case 'image':
            case 'document':
            case 'video':
              // Media parameters require an id - if no value, we can't send this parameter
              // But WhatsApp requires all parameters, so we should validate this earlier
              if (!value) {
                throw new Error(`Media parameter ${index + 1} in ${comp.type} component requires a media ID`);
              }
              paramObj[param.type] = { id: value };
              break;
            default:
              // For unknown types, try to use the type as property name
              paramObj[param.type] = value;
          }
          
          return paramObj;
        });
        
        // Only include component if it has parameters
        if (parameters.length === 0) {
          return null;
        }
        
        return {
          type: comp.type?.toUpperCase() || comp.type, // Ensure uppercase (HEADER, BODY, FOOTER)
          parameters
        };
      }).filter((comp: any) => comp !== null); // Remove null components

      // Use validated phone number (already has + prefix)
      const validatedPhone = phoneValidation.data;
      
      // Log the request payload for debugging
      const requestPayload = {
        to: validatedPhone,
        templateName: selectedTemplate.name,
        language: selectedTemplate.language,
        components,
        numberId: selectedNumber.numberId,
      };
      console.log('Sending template request:', JSON.stringify(requestPayload, null, 2));
      
      const res = await fetch("/api/send-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();

      if (res.ok) {
        updateMessageStatus(messageId, 'sent');
        toast.success('Template sent successfully!', { id: loadingToast });
        
        // Reset template state
        setSelectedTemplate(null);
        setTemplateVariables({});
        setShowTemplates(false);
      } else {
        updateMessageStatus(messageId, 'failed');
        // Extract detailed error message
        const errorMsg = data.details || data.error || 'Failed to send template';
        const fullError = data.whatsappError ? `${errorMsg} (WhatsApp: ${JSON.stringify(data.whatsappError)})` : errorMsg;
        toast.error(errorMsg, { id: loadingToast });
        setError(fullError);
      }
    } catch (error) {
      updateMessageStatus(messageId, 'failed');
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      toast.error(errorMessage, { id: loadingToast });
      setError(errorMessage);
    } finally {
      setSendingTemplate(false);
    }
  },

  startNewChat: (phoneNumber: string) => {
    const { setActiveChat, setIsNewChat } = get();
    setActiveChat(phoneNumber);
    setIsNewChat(false);
  },

  cancelNewChat: () => {
    const { setIsNewChat, setNewChatNumber } = get();
    setIsNewChat(false);
    setNewChatNumber('');
  },
})); 