"use client";
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { NumberOption } from './types';
import Sidebar from './Sidebar';
import WelcomeScreen from './WelcomeScreen';
import ChatArea from './ChatArea';
import NewChatForm from './NewChatForm';
import LoadingScreen from './LoadingScreen';
import UserProfile from './UserProfile';
import SSEProvider from './SSEProvider';
import packageJson from '../../package.json';
import { Badge, Flex, useColorModeValue, Box, HStack, Text, VStack } from '@chakra-ui/react';

interface WhatsAppInterfaceProps {
  numberOptions: NumberOption[];
}

export default function WhatsAppInterface({ numberOptions }: WhatsAppInterfaceProps) {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const emptyStateBg = useColorModeValue('white', 'gray.800');
  const emptyStateBorder = useColorModeValue('gray.200', 'gray.700');
  const emptyStateText = useColorModeValue('gray.600', 'gray.300');
  const appVersion = packageJson.version;

  const selectedNumber = useAppStore((state) => state.selectedNumber);
  const setSelectedNumber = useAppStore((state) => state.setSelectedNumber);
  const isLoading = useAppStore((state) => state.isLoading);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const activeChat = useAppStore((state) => state.activeChat);
  const isNewChat = useAppStore((state) => state.isNewChat);
  const newChatNumber = useAppStore((state) => state.newChatNumber);
  const setNewChatNumber = useAppStore((state) => state.setNewChatNumber);
  const setIsNewChat = useAppStore((state) => state.setIsNewChat);
  const startNewChat = useAppStore((state) => state.startNewChat);
  const cancelNewChat = useAppStore((state) => state.cancelNewChat);
  const fetchMessages = useAppStore((state) => state.fetchMessages);

  // Initialize selected number when numberOptions are available
  useEffect(() => {
    console.log('🔍 WhatsAppInterface useEffect:', { numberOptionsLength: numberOptions.length, selectedNumber });
    if (numberOptions.length > 0 && !selectedNumber) {
      console.log('🔍 Setting selectedNumber to:', numberOptions[0]);
      setSelectedNumber(numberOptions[0]);
      setIsLoading(false);
    } else if (numberOptions.length === 0) {
      setIsLoading(false);
    }
  }, [numberOptions, selectedNumber, setSelectedNumber, setIsLoading]);

  // Initial fetch on mount (SSE will handle real-time updates)
  useEffect(() => {
    if (selectedNumber) {
      fetchMessages(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNumber]); // fetchMessages is stable from Zustand store, no need in deps

  // Show loading screen while initializing
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show setup state if no number options are available.
  if (numberOptions.length === 0) {
    return (
      <Flex h="100vh" align="center" justify="center" bg={bgColor}>
        <Box
          maxW="lg"
          mx="auto"
          p={8}
          bg={emptyStateBg}
          borderWidth="1px"
          borderColor={emptyStateBorder}
          borderRadius="xl"
          boxShadow="sm"
        >
          <VStack spacing={3} align="start">
            <Text fontSize="xl" fontWeight="bold">
              No business numbers are configured
            </Text>
            <Text color={emptyStateText}>
              This app now loads WhatsApp numbers from the database instead of public environment variables.
            </Text>
            <Text color={emptyStateText} fontSize="sm">
              Add at least one active number from the admin interface at `/admin/numbers`, then reload the inbox.
            </Text>
          </VStack>
        </Box>
      </Flex>
    );
  }

  return (
    <>
      <SSEProvider />
      <Flex h="calc(100vh - 80px)" bg={bgColor}>
        {/* Sidebar */}
        <Sidebar numberOptions={numberOptions} />

      {/* Main Chat Area */}
      <Flex flex={1} flexDirection="column" bg={bgColor}>
        {/* Header with User Profile */}
        <Box p={4} borderBottom="1px" borderColor="gray.200">
          <HStack justify="space-between">
            <HStack spacing={3} align="center">
              <Text fontSize="1.5rem" fontWeight="bold" lineHeight="1">
                WhatsApp Business Manager
              </Text>
              <Badge
                colorScheme="gray"
                variant="subtle"
                borderRadius="full"
                px={2}
                py={1}
                fontSize="0.7rem"
                letterSpacing="0.08em"
                textTransform="uppercase"
              >
                v{appVersion}
              </Badge>
            </HStack>
            <UserProfile />
          </HStack>
        </Box>

        {/* Chat Content */}
        <Flex flex={1}>
          {!activeChat ? (
            <WelcomeScreen />
          ) : (
            <ChatArea />
          )}
        </Flex>
      </Flex>

      {/* New Chat Modal */}
      <NewChatForm
        isOpen={isNewChat}
        onClose={() => setIsNewChat(false)}
        newChatNumber={newChatNumber}
        onNewChatNumberChange={setNewChatNumber}
        onSubmit={(e) => {
          e.preventDefault();
          if (newChatNumber.trim()) {
            startNewChat(newChatNumber.trim());
          }
        }}
        onCancel={cancelNewChat}
      />
      </Flex>
    </>
  );
} 
