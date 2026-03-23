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
  ModalFooter,
  ModalCloseButton,
  VStack,
  Text,
  useToast,
  useColorModeValue,
  Badge,
  IconButton,
  Spinner,
  Center,
  HStack,
  Checkbox,
  CheckboxGroup,
  Stack,
  Divider,
} from '@chakra-ui/react';
import { EditIcon } from '@chakra-ui/icons';

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  allowedUserIds: string[];
  allowedClientIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Client {
  id: string;
  name: string;
  isActive: boolean;
}

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  
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

  // Fetch templates, users, and clients
  const fetchData = async () => {
    try {
      setLoading(true);
      const errors: string[] = [];

      // First, sync templates from WhatsApp into the database
      try {
        const syncResponse = await fetch('/api/admin/templates/sync', {
          method: 'POST',
        });

        if (!syncResponse.ok) {
          const errorData = await syncResponse.json().catch(() => ({}));
          errors.push(`Sync: ${errorData.error || 'Failed to sync templates'}`);
        }
      } catch (error) {
        errors.push('Sync: Network error');
        console.error('Error syncing templates:', error);
      }
      
      // Fetch templates
      try {
        const templatesResponse = await fetch('/api/admin/templates');
        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplates(templatesData);
        } else {
          const errorData = await templatesResponse.json().catch(() => ({}));
          errors.push(`Templates: ${errorData.error || 'Failed to fetch'}`);
        }
      } catch (error) {
        errors.push('Templates: Network error');
        console.error('Error fetching templates:', error);
      }
      
      // Fetch users
      try {
        const usersResponse = await fetch('/api/auth/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || usersData || []);
        } else {
          const errorData = await usersResponse.json().catch(() => ({}));
          errors.push(`Users: ${errorData.error || 'Failed to fetch'}`);
        }
      } catch (error) {
        errors.push('Users: Network error');
        console.error('Error fetching users:', error);
      }
      
      // Fetch clients
      try {
        const clientsResponse = await fetch('/api/admin/clients');
        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          const clientList: Client[] = Array.isArray(clientsData)
            ? clientsData
            : (clientsData?.clients || []);

          setClients(clientList.filter((c: Client) => c.isActive));
        } else {
          const errorData = await clientsResponse.json().catch(() => ({}));
          errors.push(`Clients: ${errorData.error || 'Failed to fetch'}`);
        }
      } catch (error) {
        errors.push('Clients: Network error');
        console.error('Error fetching clients:', error);
      }
      
      // Show error toast only if there were actual errors
      if (errors.length > 0) {
        toast({
          title: 'Error',
          description: errors.join(', '),
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
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
      fetchData();
    }
  }, [session]);

  // Open edit modal
  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setSelectedUserIds(template.allowedUserIds || []);
    setSelectedClientIds(template.allowedClientIds || []);
    onModalOpen();
  };

  // Handle permission update
  const handleSubmit = async () => {
    if (!editingTemplate) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/templates/${editingTemplate.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allowedUserIds: selectedUserIds,
          allowedClientIds: selectedClientIds,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Template permissions updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onModalClose();
        fetchData();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to update permissions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permissions',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'PENDING': return 'yellow';
      case 'REJECTED': return 'red';
      case 'DRAFT': return 'gray';
      default: return 'gray';
    }
  };

  const getPermissionSummary = (template: Template) => {
    const userCount = template.allowedUserIds?.length || 0;
    const clientCount = template.allowedClientIds?.length || 0;
    
    if (userCount === 0 && clientCount === 0) {
      return 'Disabled for all';
    }
    
    const parts = [];
    if (userCount > 0) parts.push(`${userCount} user${userCount > 1 ? 's' : ''}`);
    if (clientCount > 0) parts.push(`${clientCount} integration${clientCount > 1 ? 's' : ''}`);
    
    return parts.join(', ');
  };

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box p={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Template Management
          </Text>
          <Text color="gray.600" fontSize="sm" mb={2}>
            Manage which users and integrations can send each template. Empty permissions mean the template is disabled for everyone.
          </Text>
          {templates.length === 0 && !loading && (
            <Text color="orange.500" fontSize="sm" fontStyle="italic">
              Note: Templates need to be synced from WhatsApp first. Use the main chat interface to fetch templates, which will sync them to the database.
            </Text>
          )}
        </Box>

        <TableContainer bg={bgColor} borderRadius="md" borderWidth="1px" borderColor={borderColor}>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Template Name</Th>
                <Th>Language</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Permissions</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {templates.map((template) => (
                <Tr key={template.id}>
                  <Td fontWeight="medium">{template.name}</Td>
                  <Td>{template.language}</Td>
                  <Td>{template.category}</Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(template.status)}>
                      {template.status}
                    </Badge>
                  </Td>
                  <Td fontSize="sm" color="gray.600">
                    {getPermissionSummary(template)}
                  </Td>
                  <Td>
                    <IconButton
                      aria-label="Edit Permissions"
                      icon={<EditIcon />}
                      size="sm"
                      onClick={() => handleEdit(template)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        {templates.length === 0 && (
          <Center py={10}>
            <Text color="gray.500">No templates found</Text>
          </Center>
        )}
      </VStack>

      {/* Edit Permissions Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Edit Permissions: {editingTemplate?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={6} align="stretch">
              <Box>
                <Text fontWeight="medium" mb={3}>
                  Allowed Users
                </Text>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Select users who can send and see this template. Leave empty to disable this template for all non-admin users.
                </Text>
                <CheckboxGroup
                  value={selectedUserIds}
                  onChange={(values) => setSelectedUserIds(values as string[])}
                >
                  <Stack spacing={2}>
                    {users.map((user) => (
                      <Checkbox key={user.id} value={user.id}>
                        {user.name || user.email} {user.role === 'ADMIN' && '(Admin)'}
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </Box>

              <Divider />

              <Box>
                <Text fontWeight="medium" mb={3}>
                  Allowed Integrations
                </Text>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Select integrations/clients who can send and see this template. Leave empty to disable this template for all integrations.
                </Text>
                <CheckboxGroup
                  value={selectedClientIds}
                  onChange={(values) => setSelectedClientIds(values as string[])}
                >
                  <Stack spacing={2}>
                    {clients.map((client) => (
                      <Checkbox key={client.id} value={client.id}>
                        {client.name}
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Save Permissions
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
