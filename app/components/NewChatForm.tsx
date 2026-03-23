"use client";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  Box,
  Icon,
} from '@chakra-ui/react';
import { FiMessageCircle, FiPhone } from 'react-icons/fi';

interface NewChatFormProps {
  isOpen: boolean;
  onClose: () => void;
  newChatNumber: string;
  onNewChatNumberChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function NewChatForm({
  isOpen,
  onClose,
  newChatNumber,
  onNewChatNumberChange,
  onSubmit,
  onCancel
}: NewChatFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChatNumber.trim()) {
      onSubmit(e);
      onClose();
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(6px)" />
      <ModalContent bgGradient="linear(to-br, gray.900 95%, gray.800 95%)" borderRadius="2xl" maxW="md" mx={4}>
        <ModalHeader textAlign="center" pb={2}>
          <Box textAlign="center" mb={2}>
            <Icon as={FiMessageCircle} w={8} h={8} color="teal.300" mb={3} />
            <Text fontSize="2xl" fontWeight="bold" color="white" mb={2}>
              Start New Chat
            </Text>
            <Text color="gray.300" fontSize="sm">
              Enter a phone number to begin messaging
            </Text>
          </Box>
        </ModalHeader>

        <ModalBody pb={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="gray.300" fontSize="sm" fontWeight="medium">
                  Phone Number
                </FormLabel>
                <Input
                  type="tel"
                  value={newChatNumber}
                  onChange={(e) => onNewChatNumberChange(e.target.value)}
                  placeholder="+1234567890"
                  bg="gray.700"
                  borderColor="gray.600"
                  color="white"
                  _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px teal.400' }}
                  _placeholder={{ color: 'gray.400' }}
                  size="lg"
                />
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Include country code (e.g., +1 for US, +44 for UK)
                </Text>
              </FormControl>
            </VStack>
          </form>
        </ModalBody>

        <ModalFooter pt={0}>
          <HStack spacing={3} w="full">
            <Button
              onClick={handleCancel}
              variant="ghost"
              colorScheme="gray"
              _hover={{ bg: 'gray.700' }}
              flex={1}
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!newChatNumber.trim()}
              colorScheme="teal"
              flex={1}
              size="lg"
              _hover={{ bg: 'teal.600' }}
            >
              <HStack spacing={2}>
                <Icon as={FiPhone} />
                <Text>Start Chat</Text>
              </HStack>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 