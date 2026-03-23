"use client";
import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Switch,
  HStack,
  VStack,
  Text,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useColorModeValue,
  Badge,
  IconButton,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, AddIcon } from '@chakra-ui/icons';
import { BusinessNumberCreate, BusinessNumberUpdate } from '@/app/lib/validation';

interface BusinessNumber {
  id: string;
  label: string;
  phoneNumber: string;
  numberId: string;
  wabaId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function NumbersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  
  const [numbers, setNumbers] = useState<BusinessNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNumber, setEditingNumber] = useState<BusinessNumber | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Check admin role
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/api/auth/signin');
      return;
    }
    
    if (session.user.role !== 'ADMIN') {
      router.push('/auth/error');
      return;
    }
  }, [session, status, router]);

  // Fetch numbers
  const fetchNumbers = async () => {
    try {
      const response = await fetch('/api/admin/business-numbers');
      if (response.ok) {
        const data = await response.json();
        setNumbers(data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch business numbers',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching numbers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch business numbers',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchNumbers();
    }
  }, [session]);

  // Handle form submission
  const handleSubmit = async (formData: BusinessNumberCreate) => {
    setIsSubmitting(true);
    try {
      const url = editingNumber 
        ? `/api/admin/business-numbers/${editingNumber.id}`
        : '/api/admin/business-numbers';
      
      const method = editingNumber ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingNumber ? 'Number updated successfully' : 'Number created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onModalClose();
        setEditingNumber(null);
        fetchNumbers();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to save number',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving number:', error);
      toast({
        title: 'Error',
        description: 'Failed to save number',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const response = await fetch(`/api/admin/business-numbers/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Number deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onDeleteClose();
        setDeleteId(null);
        fetchNumbers();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to delete number',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error deleting number:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete number',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle toggle active
  const handleToggleActive = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/business-numbers/${id}/toggle`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Number status updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchNumbers();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update number status',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error toggling number:', error);
      toast({
        title: 'Error',
        description: 'Failed to update number status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <Box p={6} bg={bgColor} minH="100vh">
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">
            Business Numbers Management
          </Text>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="teal"
            onClick={() => {
              setEditingNumber(null);
              onModalOpen();
            }}
          >
            Add Number
          </Button>
        </HStack>

        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Label</Th>
                <Th>Phone Number</Th>
                <Th>Number ID</Th>
                <Th>WABA ID</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {numbers.map((number) => (
                <Tr key={number.id}>
                  <Td fontWeight="medium">{number.label}</Td>
                  <Td>{number.phoneNumber || '-'}</Td>
                  <Td fontFamily="mono" fontSize="sm">{number.numberId}</Td>
                  <Td fontFamily="mono" fontSize="sm">{number.wabaId}</Td>
                  <Td>
                    <Badge colorScheme={number.isActive ? 'green' : 'red'}>
                      {number.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="sm"
                        onClick={() => {
                          setEditingNumber(number);
                          onModalOpen();
                        }}
                      />
                      <IconButton
                        aria-label="Toggle Active"
                        size="sm"
                        onClick={() => handleToggleActive(number.id)}
                      >
                        <Switch isChecked={number.isActive} />
                      </IconButton>
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => {
                          setDeleteId(number.id);
                          onDeleteOpen();
                        }}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        {numbers.length === 0 && (
          <Center py={10}>
            <Text color="gray.500">No business numbers found</Text>
          </Center>
        )}
      </VStack>

      {/* Create/Edit Modal */}
      <NumberModal
        isOpen={isModalOpen}
        onClose={() => {
          onModalClose();
          setEditingNumber(null);
        }}
        onSubmit={handleSubmit}
        editingNumber={editingNumber}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation */}
      <AlertDialog isOpen={isDeleteOpen} onClose={onDeleteClose} leastDestructiveRef={cancelRef}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Business Number
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this business number? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>Cancel</Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

// Number Form Modal Component
function NumberModal({
  isOpen,
  onClose,
  onSubmit,
  editingNumber,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BusinessNumberCreate) => void;
  editingNumber: BusinessNumber | null;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<BusinessNumberCreate>({
    label: '',
    phoneNumber: '',
    numberId: '',
    wabaId: '',
    isActive: true,
  });

  useEffect(() => {
    if (editingNumber) {
      setFormData({
        label: editingNumber.label,
        phoneNumber: editingNumber.phoneNumber,
        numberId: editingNumber.numberId,
        wabaId: editingNumber.wabaId,
        isActive: editingNumber.isActive,
      });
    } else {
      setFormData({
        label: '',
        phoneNumber: '',
        numberId: '',
        wabaId: '',
        isActive: true,
      });
    }
  }, [editingNumber, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {editingNumber ? 'Edit Business Number' : 'Add Business Number'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Label</FormLabel>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Test Number, Live Number"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Phone Number (E.164)</FormLabel>
                <Input
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="e.g., +1234567890"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>WhatsApp Number ID</FormLabel>
                <Input
                  value={formData.numberId}
                  onChange={(e) => setFormData({ ...formData, numberId: e.target.value })}
                  placeholder="WhatsApp phone number ID"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>WABA ID</FormLabel>
                <Input
                  value={formData.wabaId}
                  onChange={(e) => setFormData({ ...formData, wabaId: e.target.value })}
                  placeholder="WhatsApp Business Account ID"
                />
              </FormControl>

              <FormControl>
                <HStack>
                  <Switch
                    isChecked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <FormLabel mb={0}>Active</FormLabel>
                </HStack>
              </FormControl>

              <HStack spacing={3} w="full">
                <Button onClick={onClose} flex={1}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorScheme="teal"
                  flex={1}
                  isLoading={isSubmitting}
                  loadingText="Saving..."
                >
                  {editingNumber ? 'Update' : 'Create'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
