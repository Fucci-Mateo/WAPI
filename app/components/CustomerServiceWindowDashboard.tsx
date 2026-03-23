"use client";
import { useEffect, useState } from 'react';
import { customerServiceWindowManager, CustomerServiceWindow } from '../lib/customerServiceWindow';
import {
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Badge,
  Flex,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiClock, FiUser, FiMessageCircle } from 'react-icons/fi';

export default function CustomerServiceWindowDashboard() {
  const [activeWindows, setActiveWindows] = useState<CustomerServiceWindow[]>([]);

  useEffect(() => {
    const updateWindows = () => {
      const windows = customerServiceWindowManager.getActiveWindows();
      setActiveWindows(windows);
    };

    // Update immediately
    updateWindows();

    // Update every 60 seconds (reduced from 30s to reduce CPU)
    const interval = setInterval(updateWindows, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');

  if (activeWindows.length === 0) {
    return (
      <Box
        bg={cardBg}
        p={6}
        textAlign="center"
        borderRadius="xl"
        boxShadow="md"
        border="1px"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <VStack spacing={4}>
          <Box
            w="16"
            h="16"
            bg="gray.500"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
          >
            <Icon as={FiAlertTriangle} w={8} h={8} color="white" />
          </Box>
          <VStack spacing={2}>
            <Text fontSize="lg" fontWeight="semibold" color={textColor}>
              No Active Service Windows
            </Text>
            <Text color={secondaryTextColor} fontSize="sm">
              Customer service windows will appear here when users send messages.
            </Text>
          </VStack>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" fontWeight="semibold" color={textColor}>
        Active Service Windows ({activeWindows.length})
      </Text>
      
      {activeWindows.map((window, index) => (
        <Box
          key={index}
          bg={cardBg}
          p={4}
          borderRadius="lg"
          border="1px"
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          boxShadow="sm"
        >
          <VStack spacing={3} align="stretch">
            <Flex justify="space-between" align="center">
              <HStack spacing={2}>
                <Icon as={FiUser} color="teal.500" />
                <Text fontWeight="medium" color={textColor}>
                  {window.phoneNumber}
                </Text>
              </HStack>
              <Badge
                colorScheme={window.isOpen ? 'green' : 'red'}
                variant="subtle"
                fontSize="xs"
              >
                {window.isOpen ? 'Open' : 'Closed'}
              </Badge>
            </Flex>
            
            <HStack spacing={4} fontSize="sm" color={secondaryTextColor}>
              <HStack spacing={1}>
                <Icon as={FiClock} />
                <Text>Opened: {new Date(window.openedAt).toLocaleTimeString()}</Text>
              </HStack>
              <HStack spacing={1}>
                <Icon as={FiMessageCircle} />
                <Text>{window.messageCount} messages</Text>
              </HStack>
            </HStack>
            
            {window.lastUserMessageAt && (
              <Text fontSize="sm" color={secondaryTextColor}>
                Last message: {new Date(window.lastUserMessageAt).toLocaleTimeString()}
              </Text>
            )}
          </VStack>
        </Box>
      ))}
    </VStack>
  );
} 