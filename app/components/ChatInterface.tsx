"use client";
import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Flex,
  Text,
  Input,
  Button,
  Avatar,
  Badge,
  VStack,
  HStack,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiSend, FiCheck, FiSmile, FiPaperclip } from 'react-icons/fi';
import { useToast } from '@chakra-ui/react';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  isIncoming: boolean;
  status: 'sent' | 'delivered' | 'read';
  sender: string;
}

interface ChatContact {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

export default function ChatInterface() {
  const toast = useToast();
  
  // Move all useColorModeValue hooks to the top
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const chatBg = useColorModeValue('white', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.500', 'gray.400');
  const primaryColor = 'teal.500';
  const messageReceivedBg = useColorModeValue('gray.100', 'gray.700');
  const searchBg = useColorModeValue('gray.100', 'gray.700');
  const searchFocusBg = useColorModeValue('white', 'gray.600');
  const selectedContactBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const messageBg = useColorModeValue('gray.100', 'gray.700');
  const messageFocusBg = useColorModeValue('white', 'gray.600');
  const dividerBg = useColorModeValue('gray.200', 'gray.700');

  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock data - replace with real data from your API
  const contacts: ChatContact[] = [
    {
      id: '1',
      name: 'John Doe',
      phone: '+1234567890',
      avatar: 'JD',
      lastMessage: 'Hey, how are you?',
      lastMessageTime: '2:30 PM',
      unreadCount: 2,
      isOnline: true,
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '+0987654321',
      avatar: 'JS',
      lastMessage: 'Thanks for the update!',
      lastMessageTime: '1:45 PM',
      unreadCount: 0,
      isOnline: false,
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: '1',
      text: 'Hey, how are you?',
      timestamp: '2:30 PM',
      isIncoming: true,
      status: 'read',
      sender: 'John Doe',
    },
    {
      id: '2',
      text: 'I\'m doing great, thanks! How about you?',
      timestamp: '2:32 PM',
      isIncoming: false,
      status: 'read',
      sender: 'You',
    },
  ];

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      // Add message to state or send to API
      console.log('Sending message:', messageText);
      setMessageText('');
      toast({
        title: 'Message sent',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    return <Icon as={FiCheck} color={status === 'read' ? "teal.400" : "gray.400"} />;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <Flex h="100vh" bg={bgColor}>
      {/* Sidebar */}
      <Box w="320px" bg={sidebarBg} borderRight="1px" borderColor={borderColor} display="flex" flexDirection="column">
        {/* Search */}
        <Box p={4}>
          <Input
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg={searchBg}
            border="none"
            _focus={{
              bg: searchFocusBg,
              boxShadow: 'outline',
            }}
          />
        </Box>

        {/* Chat List */}
        <Box flex={1} overflowY="auto">
          {contacts.map((contact) => (
            <Box
              key={contact.id}
              w="full"
              p={4}
              cursor="pointer"
              bg={selectedContact?.id === contact.id ? selectedContactBg : 'transparent'}
              _hover={{ bg: hoverBg }}
              onClick={() => setSelectedContact(contact)}
              transition="all 0.2s"
            >
              <Flex align="center" gap={3}>
                <Box position="relative">
                  <Avatar
                    name={contact.avatar}
                    bg={primaryColor}
                    color="white"
                    size="md"
                  />
                  {contact.isOnline && (
                    <Box
                      position="absolute"
                      bottom="-2px"
                      right="-2px"
                      w="4"
                      h="4"
                      bg="green.500"
                      borderRadius="full"
                      border="2px"
                      borderColor={sidebarBg}
                    />
                  )}
                </Box>

                <Box flex={1} minW={0}>
                  <Flex justify="space-between" align="center">
                    <Text fontWeight="medium" color={textColor} noOfLines={1}>
                      {contact.name}
                    </Text>
                    <Text fontSize="xs" color={secondaryTextColor}>
                      {contact.lastMessageTime}
                    </Text>
                  </Flex>
                  
                  <Flex align="center" mt={1}>
                    <Box
                      w="2"
                      h="2"
                      bg="green.500"
                      borderRadius="full"
                      mr={2}
                    />
                    <Text fontSize="sm" color={secondaryTextColor} noOfLines={1}>
                      {contact.lastMessage}
                    </Text>
                  </Flex>
                </Box>

                {contact.unreadCount > 0 && (
                  <Badge
                    bg={primaryColor}
                    color="white"
                    borderRadius="full"
                    px={2}
                    py={1}
                    fontSize="xs"
                  >
                    {contact.unreadCount}
                  </Badge>
                )}
              </Flex>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box flex={1} bg={chatBg} display="flex" flexDirection="column">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <Box p={4} borderBottom="1px" borderColor={borderColor} bg={sidebarBg}>
              <Flex align="center" justify="space-between">
                <Flex align="center" flex={1}>
                  <Avatar
                    name={selectedContact.avatar}
                    bg={primaryColor}
                    color="white"
                    size="md"
                    mr={3}
                  />
                  <Box>
                    <Text fontWeight="medium" color={textColor}>
                      {selectedContact.name}
                    </Text>
                    <Text fontSize="sm" color={secondaryTextColor}>
                      {selectedContact.isOnline ? 'Online' : 'Offline'}
                    </Text>
                  </Box>
                </Flex>
              </Flex>
            </Box>

            {/* Messages */}
            <Box flex={1} overflowY="auto" p={4}>
              <VStack spacing={4} align="stretch">
                {messages.map((message) => (
                  <Flex
                    key={message.id}
                    justify={message.isIncoming ? 'flex-start' : 'flex-end'}
                  >
                    <Box
                      maxW="70%"
                      bg={message.isIncoming ? messageReceivedBg : primaryColor}
                      color={message.isIncoming ? textColor : 'white'}
                      p={3}
                      borderRadius="lg"
                      position="relative"
                    >
                      <Text fontSize="sm">{message.text}</Text>
                      <Flex align="center" justify="space-between" mt={2}>
                        <Text fontSize="xs" opacity={0.7}>
                          {formatTime(message.timestamp)}
                        </Text>
                        {!message.isIncoming && getStatusIcon(message.status || undefined)}
                      </Flex>
                    </Box>
                  </Flex>
                ))}
                <Box ref={messagesEndRef} />
              </VStack>
            </Box>

            {/* Message Input */}
            <Box p={4} borderTop="1px" borderColor={borderColor} bg={sidebarBg}>
              <Flex align="center" gap={2}>
                <Button
                  size="sm"
                  variant="ghost"
                  color={secondaryTextColor}
                  _hover={{ bg: messageBg }}
                >
                  <Icon as={FiPaperclip} />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  bg={messageBg}
                  border="none"
                  _focus={{
                    bg: messageFocusBg,
                    boxShadow: 'outline',
                  }}
                  flex={1}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  color={secondaryTextColor}
                  _hover={{ bg: messageBg }}
                >
                  <Icon as={FiSmile} />
                </Button>
                <Button
                  colorScheme="teal"
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  <Icon as={FiSend} />
                </Button>
              </Flex>
            </Box>
          </>
        ) : (
          <Flex flex={1} align="center" justify="center">
            <Text color={secondaryTextColor}>Select a chat to start messaging</Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
} 