"use client";
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';

export default function ChatArea() {
  const {
    activeChat,
    messages,
    contactNames,
    selectedNumber,
    text,
    onTextChange,
    sendMessage,
    sending,
    error,
    fetchTemplates,
    loadingTemplates,
    showTemplates,
    templates,
    selectedTemplate,
    onTemplateSelect,
    templateVariables,
    onTemplateVariableChange,
    sendTemplate,
    sendingTemplate,
    templateError,
    onCloseTemplates,
    fetchMessages,
    fetchConversationMessages,
    loadMoreConversationMessages,
    conversationHasMore,
    loadingConversationMore,
    updateWindowStatus,
    markMessagesAsRead,
  } = useAppStore();


  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Move all useColorModeValue hooks to the top
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const headerBgColor = useColorModeValue('white', 'gray.800');
  const statusBgColor = useColorModeValue('gray.50', 'gray.700');

  // Window status state
  const [windowStatus, setWindowStatus] = useState<any>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Normalize phone number format (remove + prefix, spaces, and URL encoding for consistency)
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove + prefix
    let normalized = phone.startsWith('+') ? phone.substring(1) : phone;
    // Remove all spaces and URL encoding
    normalized = normalized.replace(/\s+/g, '').replace(/%20/g, '');
    return normalized;
  };

  // Filter messages for the active chat, ensuring we only show customer messages
  const chatMessages = messages.filter((msg) => {
    if (!activeChat) return false;
    
    const normalizedActiveChat = normalizePhoneNumber(activeChat);
    
    // For received messages, show if the customer (from) matches activeChat
    if (msg.type === 'received' && normalizePhoneNumber(msg.from) === normalizedActiveChat) {
      return true;
    }
    
    // For sent messages, show if the customer (to) matches activeChat
    if (msg.type === 'sent' && normalizePhoneNumber(msg.to) === normalizedActiveChat) {
      return true;
    }
    
    return false;
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Sort by timestamp ascending (oldest first)

  // Helper function to format date for display
  const formatDateHeader = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Reset time to compare dates only
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);
    const yesterdayDate = new Date(yesterday);
    yesterdayDate.setHours(0, 0, 0, 0);
    
    if (messageDate.getTime() === todayDate.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterdayDate.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "Month Day, Year" or "Month Day" if same year
      const year = messageDate.getFullYear();
      const currentYear = today.getFullYear();
      if (year === currentYear) {
        return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      } else {
        return messageDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
  };

  // Helper function to check if two messages are on different dates
  const isDifferentDate = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return d1.getTime() !== d2.getTime();
  };

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
        const response = await fetch(`/api/window-status?phone=${activeChat}`);
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
  }, [activeChat]);

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
  }, [activeChat, selectedNumber?.numberId, chatMessages.length]);

  const getDisplayName = (phoneNumber: string) => {
    return contactNames[phoneNumber] || phoneNumber;
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