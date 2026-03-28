"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { normalizeWhatsAppIdentity } from '../lib/whatsappIdentity';

import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';

function formatDateHeader(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const messageDate = new Date(date);
  messageDate.setHours(0, 0, 0, 0);
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);
  const yesterdayDate = new Date(yesterday);
  yesterdayDate.setHours(0, 0, 0, 0);

  if (messageDate.getTime() === todayDate.getTime()) {
    return 'Today';
  }

  if (messageDate.getTime() === yesterdayDate.getTime()) {
    return 'Yesterday';
  }

  const currentYear = today.getFullYear();
  if (messageDate.getFullYear() === currentYear) {
    return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }

  return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function isDifferentDate(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return d1.getTime() !== d2.getTime();
}

export default function ChatArea() {
  const activeChat = useAppStore((state) => state.activeChat);
  const messages = useAppStore((state) => state.messages);
  const activeChats = useAppStore((state) => state.activeChats);
  const contactNames = useAppStore((state) => state.contactNames);
  const selectedNumber = useAppStore((state) => state.selectedNumber);
  const text = useAppStore((state) => state.text);
  const onTextChange = useAppStore((state) => state.onTextChange);
  const sendMessage = useAppStore((state) => state.sendMessage);
  const sending = useAppStore((state) => state.sending);
  const error = useAppStore((state) => state.error);
  const fetchTemplates = useAppStore((state) => state.fetchTemplates);
  const loadingTemplates = useAppStore((state) => state.loadingTemplates);
  const showTemplates = useAppStore((state) => state.showTemplates);
  const templates = useAppStore((state) => state.templates);
  const selectedTemplate = useAppStore((state) => state.selectedTemplate);
  const onTemplateSelect = useAppStore((state) => state.onTemplateSelect);
  const templateVariables = useAppStore((state) => state.templateVariables);
  const onTemplateVariableChange = useAppStore((state) => state.onTemplateVariableChange);
  const sendTemplate = useAppStore((state) => state.sendTemplate);
  const sendingTemplate = useAppStore((state) => state.sendingTemplate);
  const templateError = useAppStore((state) => state.templateError);
  const onCloseTemplates = useAppStore((state) => state.onCloseTemplates);
  const fetchConversationMessages = useAppStore((state) => state.fetchConversationMessages);
  const loadMoreConversationMessages = useAppStore((state) => state.loadMoreConversationMessages);
  const conversationHasMore = useAppStore((state) => state.conversationHasMore);
  const loadingConversationMore = useAppStore((state) => state.loadingConversationMore);
  const updateWindowStatus = useAppStore((state) => state.updateWindowStatus);
  const markMessagesAsRead = useAppStore((state) => state.markMessagesAsRead);


  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Move all useColorModeValue hooks to the top
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const headerBgColor = useColorModeValue('white', 'gray.800');

  // Window status state
  const [windowStatus, setWindowStatus] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const activeChatIdentity = useMemo(() => normalizeWhatsAppIdentity(activeChat), [activeChat]);
  const activeChatNameByIdentity = useMemo(() => {
    const names: Record<string, string> = {};

    for (const chat of activeChats) {
      const resolvedName = chat.contactName || chat.phoneNumber || chat.chatKey || 'Unknown';
      for (const alias of [chat.phoneNumber, chat.chatKey]) {
        const normalized = normalizeWhatsAppIdentity(alias);
        if (normalized) {
          names[normalized] = resolvedName;
        }
      }
    }

    return names;
  }, [activeChats]);

  const chatMessages = useMemo(() => {
    if (!activeChatIdentity) return [];

    return messages
      .filter((msg) => {
        const messageConversationKey = normalizeWhatsAppIdentity(msg.conversationKey || '');
        const messageAliases = (msg.conversationAliases || [])
          .map((alias) => normalizeWhatsAppIdentity(alias))
          .filter(Boolean);

        if (messageAliases.includes(activeChatIdentity)) {
          return true;
        }

        if (messageConversationKey && messageConversationKey === activeChatIdentity) {
          return true;
        }

        if (msg.type === 'received' && normalizeWhatsAppIdentity(msg.from) === activeChatIdentity) {
          return true;
        }

        if (msg.type === 'sent' && normalizeWhatsAppIdentity(msg.to) === activeChatIdentity) {
          return true;
        }

        return false;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, activeChatIdentity]);

  // Check if user is at bottom of messages
  const [isAtBottom, setIsAtBottom] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [stickyDate, setStickyDate] = useState<string | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const checkIfAtBottom = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
      setIsAtBottom(isBottom);
    }
  };

  // Find the first visible message and update sticky date
  const updateStickyDate = useCallback(() => {
    if (!messagesContainerRef.current || chatMessages.length === 0) {
      setStickyDate(null);
      return;
    }

    const container = messagesContainerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    // Find the first message that is visible in the viewport
    let firstVisibleMessage = null;
    for (const msg of chatMessages) {
      const messageElement = messageRefs.current.get(msg.id);
      if (messageElement) {
        const messageTop = messageElement.offsetTop;
        const messageBottom = messageTop + messageElement.offsetHeight;
        
        // Check if message intersects with viewport (with some padding)
        if (messageBottom >= viewportTop && messageTop <= viewportBottom) {
          firstVisibleMessage = msg;
          break;
        }
      }
    }

    // If no message found, use the first message
    if (!firstVisibleMessage && chatMessages.length > 0) {
      firstVisibleMessage = chatMessages[0];
    }

    if (firstVisibleMessage) {
      setStickyDate(formatDateHeader(new Date(firstVisibleMessage.timestamp)));
    }
  }, [chatMessages]);

  // Store previous scroll height to preserve position when loading older messages
  const previousScrollHeightRef = useRef<number>(0);

  // Handle scroll to detect when user scrolls to top for loading older messages
  const handleScroll = () => {
    checkIfAtBottom();
    updateStickyDate();
    
    if (messagesContainerRef.current && activeChat) {
      const { scrollTop } = messagesContainerRef.current;
      
      // If user is near the top (within 50px) and there are more messages to load
      if (scrollTop <= 50 && conversationHasMore && !loadingConversationMore) {
        // Store current scroll height before loading
        if (messagesContainerRef.current) {
          previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
        }
        loadMoreConversationMessages();
      }
    }
  };

  // Preserve scroll position when older messages are loaded
  useEffect(() => {
    if (loadingConversationMore || !messagesContainerRef.current) return;
    
    // After messages are loaded, adjust scroll position to maintain view
    const container = messagesContainerRef.current;
    const previousHeight = previousScrollHeightRef.current;
    const currentHeight = container.scrollHeight;
    
    if (previousHeight > 0 && currentHeight > previousHeight) {
      // Calculate the difference in height (new messages added)
      const heightDifference = currentHeight - previousHeight;
      // Adjust scroll position to maintain the same view
      container.scrollTop = container.scrollTop + heightDifference;
      previousScrollHeightRef.current = 0; // Reset
    }
    
    // Update sticky date after messages are loaded
    updateStickyDate();
  }, [chatMessages.length, loadingConversationMore, updateStickyDate]);

  // Update sticky date when active chat changes
  useEffect(() => {
    if (chatMessages.length > 0) {
      updateStickyDate();
    } else {
      setStickyDate(null);
    }
  }, [activeChat, chatMessages.length, updateStickyDate]);

  // Scroll to bottom only if user is already at bottom
  const scrollToBottom = () => {
    if (isAtBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Update timer every second
  useEffect(() => {
    if (!windowStatus?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(windowStatus.expiresAt).getTime();
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setTimeRemaining(formatTimeRemaining(remainingSeconds));
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [windowStatus?.expiresAt]);

  // Always scroll to bottom when active chat changes
  useEffect(() => {
    if (activeChat) {
      // Immediate scroll to bottom without smooth behavior for initial load
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        setIsAtBottom(true);
      }, 50);
    }
  }, [activeChat]);

  // Ensure scroll to bottom when messages are loaded for the first time
  useEffect(() => {
    if (chatMessages.length > 0 && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
      setIsAtBottom(true);
    }
  }, [chatMessages.length]);

  // Fetch conversation messages and window status for the active chat
  useEffect(() => {
    if (!activeChat) return;

    // Fetch conversation messages for the active chat (conversation-specific pagination)
    fetchConversationMessages(activeChat, false);

    const fetchWindowStatus = async () => {
      try {
        // Update the store (which MessageInput reads from)
        await updateWindowStatus(activeChat);
        // Also update local state for display in ChatArea
        const params = new URLSearchParams({ phone: normalizeWhatsAppIdentity(activeChat) });
        if (selectedNumber?.numberId) {
          params.append('numberId', selectedNumber.numberId);
        }
        const response = await fetch(`/api/window-status?${params.toString()}`);
        if (response.ok) {
          const status = await response.json();
          setWindowStatus(status);
        }
      } catch (error) {
        console.error('Failed to fetch window status:', error);
      }
    };

    fetchWindowStatus();

    // Set up polling to fetch window status every 60 seconds (reduced from 30s to reduce CPU)
    // Note: Real-time messages are now handled by SSE, so we only poll for window status
    const statusInterval = setInterval(() => {
      fetchWindowStatus();
    }, 60000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [activeChat, fetchConversationMessages, selectedNumber?.numberId, updateWindowStatus]);

  // Mark messages as read when chat is visible and has messages
  useEffect(() => {
    if (!activeChat || !selectedNumber?.numberId || chatMessages.length === 0) return;

    // Mark messages as read when viewing the chat (with a small delay to ensure messages are loaded)
    const markReadTimer = setTimeout(() => {
      markMessagesAsRead(activeChat).catch(error => {
        console.error('Error marking messages as read in ChatArea:', error);
      });
    }, 1000);

    return () => {
      clearTimeout(markReadTimer);
    };
  }, [activeChat, chatMessages.length, markMessagesAsRead, selectedNumber?.numberId]);

  const getDisplayName = (phoneNumber: string) => {
    const normalized = normalizeWhatsAppIdentity(phoneNumber);
    return (
      (normalized ? activeChatNameByIdentity[normalized] : undefined) ||
      (normalized ? contactNames[normalized] : undefined) ||
      contactNames[phoneNumber] ||
      phoneNumber
    );
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <Flex flex={1} flexDirection="column" bg={bgColor} h="calc(100vh - 80px)">
      {/* Chat Header - Fixed at top */}
      <Box p={4} borderBottom="1px" borderColor={borderColor} bg={headerBgColor} flexShrink={0}>
        <VStack spacing={3} align="stretch">
          <Flex align="center" justify="space-between">
            <VStack spacing={1} align="start">
              <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                {getDisplayName(activeChat)}
              </Text>
              <Text fontSize="sm" color={secondaryTextColor}>
                WhatsApp Business Chat
              </Text>
            </VStack>
            {/* Live Timer */}
            {windowStatus && (
              <VStack spacing={1} align="end">
                <Badge
                  colorScheme={windowStatus.canSendFreeForm ? 'green' : 'red'}
                  variant="subtle"
                  fontSize="xs"
                >
                  {windowStatus.canSendFreeForm ? 'Active' : 'Expired'}
                </Badge>
                <Text fontSize="xs" color={secondaryTextColor} fontWeight="medium">
                  {timeRemaining}
                </Text>
              </VStack>
            )}
          </Flex>
        </VStack>
      </Box>

      {/* Chat Messages - Scrollable area */}
      <Box 
        ref={messagesContainerRef}
        flex={1} 
        overflowY="auto" 
        p={6}
        minH={0} // Important for flex child to scroll properly
        onScroll={handleScroll}
        position="relative"
        css={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e0',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#a0aec0',
          },
        }}
      >
        {/* Sticky date header at top */}
        {stickyDate && (
          <Box
            position="sticky"
            top={0}
            zIndex={10}
            bg="transparent"
            py={2}
            mb={2}
          >
            <Flex justify="center">
              <Badge
                colorScheme="gray"
                variant="subtle"
                fontSize="xs"
                px={3}
                py={1}
                borderRadius="full"
              >
                {stickyDate}
              </Badge>
            </Flex>
          </Box>
        )}
        <VStack spacing={4} align="stretch">
          {chatMessages.length === 0 ? (
            <Flex flexDirection="column" align="center" justify="center" h="full" color={secondaryTextColor}>
              <Text fontSize="lg">No messages yet.</Text>
            </Flex>
          ) : (
            <>
              {/* Loading indicator at top when loading older messages */}
              {loadingConversationMore && (
                <Flex justify="center" py={2}>
                  <Text fontSize="sm" color={secondaryTextColor}>
                    Loading older messages...
                  </Text>
                </Flex>
              )}
              {chatMessages.map((msg, index) => {
                const showDateHeader = index === 0 || isDifferentDate(
                  chatMessages[index - 1].timestamp,
                  msg.timestamp
                );
                
                return (
                  <Box 
                    key={msg.id}
                    ref={(el) => {
                      if (el) {
                        messageRefs.current.set(msg.id, el);
                      } else {
                        messageRefs.current.delete(msg.id);
                      }
                    }}
                  >
                    {showDateHeader && (
                      <Flex justify="center" my={4}>
                        <Badge
                          colorScheme="gray"
                          variant="subtle"
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                        >
                          {formatDateHeader(new Date(msg.timestamp))}
                        </Badge>
                      </Flex>
                    )}
                    <MessageBubble message={msg} />
                  </Box>
                );
              })}
              <Box ref={messagesEndRef} h="1px" />
            </>
          )}
        </VStack>
      </Box>

            {/* Message Input - Fixed at bottom */}
      <Box flexShrink={0} borderTop="1px" borderColor={borderColor} bg={headerBgColor}>
        <MessageInput
          text={text}
          onTextChange={onTextChange}
          onSend={handleSend}
          sending={sending}
          error={error}
          onFetchTemplates={fetchTemplates}
          loadingTemplates={loadingTemplates}
          showTemplates={showTemplates}
          templates={templates}
          selectedTemplate={selectedTemplate}
          onTemplateSelect={onTemplateSelect}
          templateVariables={templateVariables}
          onTemplateVariableChange={onTemplateVariableChange}
          onSendTemplate={sendTemplate}
          sendingTemplate={sendingTemplate}
          templateError={templateError}
          onCloseTemplates={onCloseTemplates}
        />
      </Box>
    </Flex>
  );
} 
