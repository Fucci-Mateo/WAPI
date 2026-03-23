"use client";
import { useAppStore } from '../store/useAppStore';
import { NumberOption } from './types';
import {
  Box, Flex, Text, Button, Select, VStack, HStack, Avatar, Badge,
  useColorModeValue, Icon, Divider,
} from '@chakra-ui/react';
import { FiMessageCircle, FiPlus, FiUser } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { Spinner } from '@chakra-ui/react';

interface SidebarProps {
  numberOptions: NumberOption[];
}

export default function Sidebar({ numberOptions }: SidebarProps) {
  const [isClient, setIsClient] = useState(false);

  // Always call hooks first, before any conditional returns
  const storeData = useAppStore();
  const { 
    selectedNumber, 
    setSelectedNumber, 
    setIsNewChat, 
    activeChat, 
    setActiveChat, 
    activeChats,
    loadingActiveChats,
    fetchActiveChats,
    contactNames
  } = storeData;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch active chats when selected number changes
  useEffect(() => {
    console.log('🔍 Sidebar useEffect triggered:', { selectedNumber, isClient });
    if (selectedNumber && isClient) {
      console.log('🔍 Calling fetchActiveChats from Sidebar');
      fetchActiveChats();
    }
  }, [selectedNumber, isClient, fetchActiveChats]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');
  const selectBgColor = useColorModeValue('gray.50', 'gray.700');

  // Add a simple check to prevent the eval error
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

  // Normalize phone number format (remove + prefix, spaces, and URL encoding for consistency)
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove + prefix
    let normalized = phone.startsWith('+') ? phone.substring(1) : phone;
    // Remove all spaces and URL encoding
    normalized = normalized.replace(/\s+/g, '').replace(/%20/g, '');
    return normalized;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return '';
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
    
    // Format as date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Truncate message preview
  const truncateMessage = (text: string | null, maxLength: number = 50): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Box w="320px" bg={bgColor} borderRight="1px" borderColor={borderColor} display="flex" flexDirection="column" h="calc(100vh - 80px)">
      {/* Header */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <Text fontSize="lg" fontWeight="bold" color={textColor}>
          WhatsApp Business
        </Text>
        <Text fontSize="sm" color={secondaryTextColor}>
          Professional messaging platform
        </Text>
      </Box>

      {/* Number Selection */}
      <Box p={4} borderBottom="1px" borderColor={borderColor}>
        <VStack spacing={3} align="stretch">
          <Text fontSize="sm" fontWeight="medium" color={secondaryTextColor}>
            Select Number
          </Text>
          <Select
            value={selectedNumber?.numberId || ''}
            onChange={(e) => {
              const selected = numberOptions.find(option => option.numberId === e.target.value);
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

      {/* New Chat Button */}
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

      {/* Active Chats */}
      <Box 
        flex={1} 
        overflowY="auto"
      >
        <Box p={4}>
          <Text fontSize="sm" fontWeight="medium" color={secondaryTextColor} mb={3}>
            Active Chats ({activeChats.length})
          </Text>
          <VStack spacing={2} align="stretch">
            {activeChats.map((chat) => {
              const normalizedActiveChat = normalizePhoneNumber(activeChat);
              const normalizedPhoneNumber = normalizePhoneNumber(chat.phoneNumber);
              const isActive = normalizedActiveChat === normalizedPhoneNumber;
              const displayName = chat.contactName || chat.phoneNumber;
              
              return (
                <Box
                  key={chat.phoneNumber}
                  p={3}
                  bg={isActive ? 'teal.50' : 'transparent'}
                  borderWidth="1px"
                  borderColor={isActive ? 'teal.200' : 'transparent'}
                  borderRadius="md"
                  cursor="pointer"
                  _hover={{ bg: isActive ? 'teal.50' : hoverBgColor }}
                  onClick={() => setActiveChat(chat.phoneNumber)}
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
            })}
            
            {activeChats.length === 0 && !loadingActiveChats && (
              <Box textAlign="center" py={8}>
                <Icon as={FiMessageCircle} w={8} h={8} color={secondaryTextColor} mb={2} />
                <Text fontSize="sm" color={secondaryTextColor}>
                  No active chats
                </Text>
                <Text fontSize="xs" color={secondaryTextColor} mt={1}>
                  Start a new chat to begin messaging
                </Text>
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
          </VStack>
        </Box>
      </Box>
    </Box>
  );
} 