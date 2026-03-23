"use client";
import { Message } from './types';
import {
  Box,
  Flex,
  Text,
  HStack,
  VStack,
  Button,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiCheck, FiX, FiClock, FiFileText } from 'react-icons/fi';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sent': 
        // Single gray checkmark
        return <Icon as={FiCheck} boxSize="14px" strokeWidth={3} />;
      case 'delivered': 
        // Double gray checkmarks (WhatsApp style)
        return (
          <HStack spacing={-1.5}>
            <Icon as={FiCheck} boxSize="14px" strokeWidth={3} />
            <Icon as={FiCheck} boxSize="14px" strokeWidth={3} />
          </HStack>
        );
      case 'read': 
        // Double blue checkmarks (WhatsApp style)
        return (
          <HStack spacing={-1.5}>
            <Icon as={FiCheck} boxSize="14px" strokeWidth={3} />
            <Icon as={FiCheck} boxSize="14px" strokeWidth={3} />
          </HStack>
        );
      case 'failed': return <Icon as={FiX} boxSize="14px" strokeWidth={3} />;
      default: return <Icon as={FiClock} boxSize="14px" strokeWidth={3} />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'sent': 
        // Light gray for sent (WhatsApp style)
        return 'lightgray';
      case 'delivered': 
        // Light gray for delivered (WhatsApp style)
        return 'lightgray';
      case 'read': 
        // Deep sky blue for read (WhatsApp style)
        return 'deepskyblue';
      case 'failed': return 'red.500';
      default: return 'gray.500';
    }
  };

  const isSent = message.type === 'sent';
  const bgColor = isSent ? 'teal.500' : useColorModeValue('gray.100', 'gray.700');
  const textColor = isSent ? 'white' : useColorModeValue('gray.800', 'white');
  const timeColor = isSent ? 'teal.100' : useColorModeValue('gray.500', 'gray.400');

  return (
    <Flex justify={isSent ? 'flex-end' : 'flex-start'}>
      <Box
        maxW={{ base: 'xs', lg: 'md' }}
        bg={bgColor}
        color={textColor}
        px={4}
        py={2}
        borderRadius="lg"
        position="relative"
      >
        {/* Show username for sent messages */}
        {isSent && message.userName && (
          <Text fontSize="xs" opacity={0.8} mb={1} fontWeight="medium">
            Sent by {message.userName}
          </Text>
        )}
        {message.media?.kind === 'image' ? (
          <Box>
            <Box as="img" src={message.media.url || `/api/media/${message.media.id}`} alt="image" borderRadius="md" maxW="100%" />
            {message.text && (
              <Text fontSize="sm" mt={2} whiteSpace="pre-wrap">{message.text}</Text>
            )}
          </Box>
        ) : message.media?.kind === 'audio' ? (
          <Box>
            <audio controls src={message.media.url || `/api/media/${message.media.id}`} style={{ width: '100%' }} />
            {message.text && (
              <Text fontSize="sm" mt={2} whiteSpace="pre-wrap">{message.text}</Text>
            )}
          </Box>
        ) : message.media?.kind === 'document' ? (
          <Box>
            <HStack spacing={2} p={2} bg={isSent ? 'teal.600' : useColorModeValue('gray.200', 'gray.600')} borderRadius="md">
              <Icon as={FiFileText} />
              <VStack align="start" spacing={0} flex={1}>
                <Text fontSize="sm" fontWeight="medium">
                  {message.media.fileName || 'Document'}
                </Text>
                <Text fontSize="xs" opacity={0.8}>
                  {message.media.mimeType || 'File'}
                </Text>
              </VStack>
              <Button
                as="a"
                href={message.media.url || `/api/media/${message.media.id}`}
                download
                size="xs"
                colorScheme={isSent ? 'whiteAlpha' : 'teal'}
                variant="solid"
              >
                Download
              </Button>
            </HStack>
            {message.text && (
              <Text fontSize="sm" mt={2} whiteSpace="pre-wrap">{message.text}</Text>
            )}
          </Box>
        ) : (
          <Text fontSize="sm" whiteSpace="pre-wrap">
            {(() => {
              // Check if this is a template message and user doesn't have permission to view it
              const templateMatch = message.text?.match(/\[Template:\s*([^\]]+)\]/);
              if (templateMatch && message.canViewTemplate === false) {
                // Show placeholder for restricted template
                return `[Template: ${templateMatch[1]}]`;
              }
              // Show actual message text
              return message.text;
            })()}
          </Text>
        )}
        <HStack spacing={1} mt={2} fontSize="xs" color={timeColor} align="center">
          <Text>{new Date(message.timestamp).toLocaleTimeString()}</Text>
          {isSent && (
            <Box 
              color={getStatusColor(message.status)} 
              display="flex" 
              alignItems="center"
              opacity={0.9}
            >
              {getStatusIcon(message.status)}
            </Box>
          )}
        </HStack>
      </Box>
    </Flex>
  );
} 