"use client";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Spinner,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiLoader } from 'react-icons/fi';

export default function LoadingScreen() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');

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
        borderColor={useColorModeValue('gray.200', 'gray.700')}
      >
        <VStack spacing={6}>
          <Box
            w="16"
            h="16"
            bg="teal.500"
            borderRadius="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
          >
            <Spinner size="lg" color="white" thickness="3px" />
          </Box>
          
          <VStack spacing={2}>
            <Text fontSize="xl" fontWeight="bold" color={textColor}>
              Anjuman Khuddam
            </Text>
            <Text color={secondaryTextColor} fontSize="sm">
              Initializing WhatsApp Business API
            </Text>
          </VStack>

          <HStack spacing={2}>
            <Box
              w="2"
              h="2"
              bg="teal.500"
              borderRadius="full"
              animation="pulse 1.5s ease-in-out infinite"
            />
            <Box
              w="2"
              h="2"
              bg="blue.500"
              borderRadius="full"
              animation="pulse 1.5s ease-in-out infinite"
              sx={{ animationDelay: '0.2s' }}
            />
            <Box
              w="2"
              h="2"
              bg="purple.500"
              borderRadius="full"
              animation="pulse 1.5s ease-in-out infinite"
              sx={{ animationDelay: '0.4s' }}
            />
          </HStack>
        </VStack>
      </Box>
    </Flex>
  );
} 