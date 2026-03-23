"use client";
import React, { Component } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiAlertTriangle } from 'react-icons/fi';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // In production, you would send this to a logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToLoggingService(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error }: { error?: Error }) {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Flex h="100vh" align="center" justify="center" bg={bgColor}>
      <Box
        bg={cardBg}
        p={8}
        maxW="sm"
        w="full"
        mx={4}
        textAlign="center"
        borderRadius="2xl"
        boxShadow="xl"
        border="1px"
        borderColor={borderColor}
      >
        <VStack spacing={6}>
          <Box
            w="16"
            h="16"
            bg="red.500"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
          >
            <Icon as={FiAlertTriangle} w={8} h={8} color="white" />
          </Box>
          
          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="bold" color="red.500">
              Something went wrong
            </Text>
            <Text color={secondaryTextColor} fontSize="sm">
              {error?.message || 'An unexpected error occurred'}
            </Text>
          </VStack>

          <Button
            onClick={() => window.location.reload()}
            colorScheme="teal"
            size="lg"
            _hover={{ bg: 'teal.600' }}
          >
            Refresh Page
          </Button>
        </VStack>
      </Box>
    </Flex>
  );
} 