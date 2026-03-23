"use client";
import { useEffect, useState } from 'react';
import { customerServiceWindowManager } from '../lib/customerServiceWindow';
import {
  Box,
  Flex,
  Text,
  Badge,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';

interface CustomerServiceWindowStatusProps {
  phoneNumber: string;
  className?: string;
}

export default function CustomerServiceWindowStatus({ 
  phoneNumber, 
  className = "" 
}: CustomerServiceWindowStatusProps) {
  const [status, setStatus] = useState({
    isOpen: false,
    canSendFreeForm: false,
    canSendTemplate: true,
    timeRemaining: 0,
    expiresAt: new Date().toISOString()
  });

  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const updateStatus = () => {
      const windowStatus = customerServiceWindowManager.getWindowStatus(phoneNumber);
      setStatus(windowStatus);
    };

    // Update immediately
    updateStatus();

    // Update every 60 seconds (reduced from 30s to reduce CPU)
    const interval = setInterval(updateStatus, 60 * 1000);

    return () => clearInterval(interval);
  }, [phoneNumber]);

  useEffect(() => {
    const updateTimeRemaining = () => {
      if (status.isOpen) {
        const remaining = customerServiceWindowManager.getTimeRemainingFormatted(phoneNumber);
        setTimeRemaining(remaining);
      }
    };

    // Update immediately
    updateTimeRemaining();

    // Update every minute
    const interval = setInterval(updateTimeRemaining, 60 * 1000);

    return () => clearInterval(interval);
  }, [phoneNumber, status.isOpen]);

  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <HStack spacing={2} align="center" fontSize="xs">
      {/* Status indicator */}
      <Box
        w="2"
        h="2"
        borderRadius="full"
        bg={status.isOpen ? 'green.500' : 'gray.500'}
        animation={status.isOpen ? 'pulse 2s infinite' : 'none'}
      />
      
      {/* Status text */}
      <Text
        fontWeight="medium"
        color={status.isOpen ? 'green.400' : secondaryTextColor}
      >
        {status.isOpen ? 'Service Window Open' : 'Service Window Closed'}
      </Text>
      
      {/* Time remaining */}
      {status.isOpen && (
        <Text color={secondaryTextColor}>
          ({timeRemaining})
        </Text>
      )}
      
      {/* Message type indicators */}
      <HStack spacing={1}>
        <Badge
          colorScheme={status.canSendFreeForm ? 'blue' : 'gray'}
          variant="subtle"
          fontSize="xs"
          px={1.5}
          py={0.5}
        >
          Free Form
        </Badge>
        <Badge
          colorScheme={status.canSendTemplate ? 'purple' : 'gray'}
          variant="subtle"
          fontSize="xs"
          px={1.5}
          py={0.5}
        >
          Templates
        </Badge>
      </HStack>
    </HStack>
  );
}

// Compact version for use in headers
export function CompactWindowStatus({ phoneNumber }: { phoneNumber: string }) {
  const [status, setStatus] = useState({
    isOpen: false,
    canSendFreeForm: false,
    canSendTemplate: true,
    timeRemaining: 0,
    expiresAt: new Date().toISOString()
  });

  useEffect(() => {
    const updateStatus = () => {
      const windowStatus = customerServiceWindowManager.getWindowStatus(phoneNumber);
      setStatus(windowStatus);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60 * 1000);
    return () => clearInterval(interval);
  }, [phoneNumber]);

  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <HStack spacing={1} align="center" fontSize="xs">
      <Box
        w="2"
        h="2"
        borderRadius="full"
        bg={status.isOpen ? 'green.500' : 'gray.500'}
        animation={status.isOpen ? 'pulse 2s infinite' : 'none'}
      />
      <Text
        color={status.isOpen ? 'green.400' : secondaryTextColor}
        fontSize="xs"
      >
        {status.isOpen ? 'Open' : 'Closed'}
      </Text>
    </HStack>
  );
} 