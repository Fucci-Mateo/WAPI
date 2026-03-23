"use client";
import {
  Box,
  Flex,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiCheckCircle, FiMessageCircle, FiUsers, FiActivity } from 'react-icons/fi';

export default function WelcomeScreen() {
  const textColor = useColorModeValue('gray.800', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  return (
    <Flex flex={1} align="center" justify="center" bg={bgColor}>
      <Box textAlign="center" maxW="md" mx="auto" px={6}>
        <VStack spacing={8}>
          <VStack spacing={4}>
            <Text fontSize="3xl" fontWeight="bold" color="teal.500" mb={4}>
              Welcome to WhatsApp Business
            </Text>
            <Text color={secondaryTextColor} fontSize="lg">
              Start connecting with your customers through professional messaging
            </Text>
          </VStack>

          <VStack spacing={4} align="stretch">
            <HStack spacing={3} justify="center">
              <Box
                w="8"
                h="8"
                bg="blue.500"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiMessageCircle} w="4" h="4" color="white" />
              </Box>
              <Text color={textColor}>Send messages and templates</Text>
            </HStack>
            
            <HStack spacing={3} justify="center">
              <Box
                w="8"
                h="8"
                bg="purple.500"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiUsers} w="4" h="4" color="white" />
              </Box>
              <Text color={textColor}>Manage multiple business numbers</Text>
            </HStack>
            
            <HStack spacing={3} justify="center">
              <Box
                w="8"
                h="8"
                bg="pink.500"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FiActivity} w="4" h="4" color="white" />
              </Box>
              <Text color={textColor}>Track message delivery status</Text>
            </HStack>
          </VStack>
        </VStack>
      </Box>
    </Flex>
  );
} 