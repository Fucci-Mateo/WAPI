"use client";
import { useEffect, useMemo, useRef, useState, memo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAppStore } from '../store/useAppStore';
import { NumberOption, ActiveChat } from './types';
import {
  Box,
  Text,
  Button,
  Select,
  VStack,
  HStack,
  Avatar,
  Badge,
  useColorModeValue,
  Icon,
  Spinner,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { FiMessageCircle, FiPlus, FiUser, FiSearch } from 'react-icons/fi';
import { normalizeWhatsAppIdentity } from '../lib/whatsappIdentity';

interface SidebarProps {
  numberOptions: NumberOption[];
}

function useDebouncedValue<T>(value: T, delay = 180): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

interface ActiveChatRowProps {
  chat: ActiveChat;
  isActive: boolean;
  onSelect: (chatKey: string) => void;
}

const ActiveChatRow = memo(function ActiveChatRow({
  chat,
  isActive,
  onSelect,
}: ActiveChatRowProps) {
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');
  const activeBg = useColorModeValue('teal.50', 'teal.900');
  const borderColor = useColorModeValue('teal.200', 'teal.600');

  const displayName = chat.contactName || chat.phoneNumber || chat.chatKey || 'Unknown';
  const chatKey = chat.chatKey || chat.phoneNumber;

  return (
    <Box
      h="104px"
      p={3}
      bg={isActive ? activeBg : 'transparent'}
      borderWidth="1px"
      borderColor={isActive ? borderColor : 'transparent'}
      borderRadius="lg"
      cursor="pointer"
      overflow="hidden"
      _hover={{ bg: isActive ? activeBg : hoverBgColor }}
      onClick={() => onSelect(chatKey)}
      transition="background-color 0.15s ease"
    >
      <HStack spacing={3} align="flex-start">
        <Avatar size="sm" name={displayName} bg="teal.500" color="white">
          <Icon as={FiUser} />
        </Avatar>
        <Box flex={1} minW={0}>
          <HStack justify="space-between" align="flex-start" mb={1}>
            <Text fontSize="sm" fontWeight="medium" color={textColor} noOfLines={1}>
              {displayName}
            </Text>
            {chat.lastMessageTimestamp && (
              <Text fontSize="xs" color={secondaryTextColor} whiteSpace="nowrap" ml={2}>
                {formatTimestamp(chat.lastMessageTimestamp)}
              </Text>
            )}
          </HStack>
          {chat.lastMessage && (
            <Text fontSize="xs" color={secondaryTextColor} noOfLines={1} mb={1}>
              {truncateMessage(chat.lastMessage)}
            </Text>
          )}
          <HStack spacing={2}>
            {chat.unreadCount > 0 && (
              <Badge colorScheme="teal" variant="solid" fontSize="xs" borderRadius="full">
                {chat.unreadCount}
              </Badge>
            )}
            {isActive && (
              <Badge colorScheme="teal" variant="subtle" fontSize="xs">
                Active
              </Badge>
            )}
          </HStack>
        </Box>
      </HStack>
    </Box>
  );
});

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncateMessage(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

export default function Sidebar({ numberOptions }: SidebarProps) {
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedNumber = useAppStore((state) => state.selectedNumber);
  const setSelectedNumber = useAppStore((state) => state.setSelectedNumber);
  const setIsNewChat = useAppStore((state) => state.setIsNewChat);
  const activeChat = useAppStore((state) => state.activeChat);
  const setActiveChat = useAppStore((state) => state.setActiveChat);
  const activeChats = useAppStore((state) => state.activeChats);
  const loadingActiveChats = useAppStore((state) => state.loadingActiveChats);
  const fetchActiveChats = useAppStore((state) => state.fetchActiveChats);
  const selectedNumberId = selectedNumber?.numberId;
  const activeChatIdentity = useMemo(() => normalizeWhatsAppIdentity(activeChat), [activeChat]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (selectedNumberId && isClient) {
      fetchActiveChats();
    }
  }, [selectedNumberId, isClient, fetchActiveChats]);

  useEffect(() => {
    setSearchQuery('');
  }, [selectedNumberId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [debouncedSearch, selectedNumberId]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const selectBgColor = useColorModeValue('gray.50', 'gray.700');
  const searchBg = useColorModeValue('gray.50', 'gray.700');

  const filteredChats = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();
    if (!needle) return activeChats;

    return activeChats.filter((chat) =>
      [
        chat.contactName,
        chat.phoneNumber,
        chat.chatKey,
        chat.lastMessage,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [activeChats, debouncedSearch]);

  const virtualizer = useVirtualizer({
    count: filteredChats.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 104,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const handleSelectChat = useCallback((chatKey: string) => {
    setActiveChat(chatKey);
  }, [setActiveChat]);

  if (!isClient) {
    return (
      <Box w="320px" bg="gray.100" borderRight="1px" borderColor="gray.300" display="flex" flexDirection="column">
        <Box p={4}>
          <Text fontSize="sm" color="gray.600">
            Loading...
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box w="320px" bg={bgColor} borderRight="1px" borderColor={borderColor} display="flex" flexDirection="column" h="calc(100vh - 80px)">
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Text fontSize="lg" fontWeight="bold" color={textColor}>
          WhatsApp Business
        </Text>
        <Text fontSize="sm" color={secondaryTextColor}>
          Professional messaging platform
        </Text>
      </Box>

      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" fontWeight="medium" color={secondaryTextColor}>
            Select Number
          </Text>
          <Select
            value={selectedNumber?.numberId || ''}
            onChange={(e) => {
              const selected = numberOptions.find((option) => option.numberId === e.target.value);
              setSelectedNumber(selected || null);
            }}
            bg={selectBgColor}
            borderColor={borderColor}
            _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px teal.400' }}
          >
            <option value="">Choose a number...</option>
            {(numberOptions || []).map((option) => (
              <option key={option.numberId} value={option.numberId}>
                {option.label}
              </option>
            ))}
          </Select>
        </VStack>
      </Box>

      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Button
          onClick={() => setIsNewChat(true)}
          colorScheme="teal"
          w="full"
          leftIcon={<Icon as={FiPlus} />}
        >
          New Chat
        </Button>
      </Box>

      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Icon as={FiSearch} color={secondaryTextColor} />
          </InputLeftElement>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats"
            bg={searchBg}
            borderColor={borderColor}
            _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px teal.400' }}
          />
        </InputGroup>
      </Box>

      <Box flex={1} overflow="hidden" minH={0}>
        <Box ref={scrollRef} flex={1} overflowY="auto" h="100%" minH={0}>
          {filteredChats.length === 0 && !loadingActiveChats ? (
            <Box textAlign="center" py={8} px={4}>
              <Icon as={FiMessageCircle} w={8} h={8} color={secondaryTextColor} mb={2} />
              <Text fontSize="sm" color={secondaryTextColor}>
                {searchQuery.trim() ? 'No chats match your search' : 'No active chats'}
              </Text>
              <Text fontSize="xs" color={secondaryTextColor} mt={1}>
                {searchQuery.trim() ? 'Clear the search to see all chats' : 'Start a new chat to begin messaging'}
              </Text>
            </Box>
          ) : (
            <Box position="relative" h={`${virtualizer.getTotalSize()}px`}>
              {virtualItems.map((virtualItem) => {
                const chat = filteredChats[virtualItem.index];
                const chatKey = chat.chatKey || chat.phoneNumber;
                const isActive = activeChatIdentity === normalizeWhatsAppIdentity(chatKey);

                return (
                  <Box
                    key={chatKey}
                    position="absolute"
                    top={0}
                    left={0}
                    width="100%"
                    transform={`translateY(${virtualItem.start}px)`}
                  >
                    <ActiveChatRow
                      chat={chat}
                      isActive={isActive}
                      onSelect={handleSelectChat}
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          {loadingActiveChats && (
            <Box textAlign="center" py={4}>
              <Spinner size="sm" color="teal.500" />
              <Text fontSize="xs" color={secondaryTextColor} mt={2}>
                Loading chats...
              </Text>
            </Box>
          )}

          {!loadingActiveChats && filteredChats.length > 0 && (
            <Box py={4} textAlign="center">
              <Text fontSize="xs" color={secondaryTextColor}>
                {filteredChats.length} chat{filteredChats.length === 1 ? '' : 's'}
              </Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
