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
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Code,
  Select,
  Checkbox,
  CheckboxGroup,
  Stack,
  Divider,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, AddIcon, CopyIcon, ViewIcon } from '@chakra-ui/icons';
import { SCOPES } from '@/app/lib/extAuth';

interface Client {
  id: string;
  name: string;
  defaultNumberId: string | null;
  rateLimitPerMin: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  apiKeys: ApiKey[];
  _count: {
    requestLogs: number;
  };
}

interface ApiKey {
  id: string;
  isActive: boolean;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

interface RequestLog {
  id: string;
  method: string;
  path: string;
  numberId: string | null;
  status: string;
  responseCode: number;
  durationMs: number;
  ip: string | null;
  requestedAt: string;
  responseBody: any;
  error: string | null;
}

const SCOPE_OPTIONS = [
  { value: SCOPES.MESSAGES_SEND, label: 'messages:send' },
  { value: SCOPES.MESSAGES_READ, label: 'messages:read' },
  { value: SCOPES.TEMPLATES_READ, label: 'templates:read' },
];

export default function IntegrationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [requestLogs, setRequestLogs] = useState<RequestLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isKeyModalOpen, onOpen: onKeyModalOpen, onClose: onKeyModalClose } = useDisclosure();
  const { isOpen: isKeyDeleteOpen, onOpen: onKeyDeleteOpen, onClose: onKeyDeleteClose } = useDisclosure();
  const { isOpen: isLogsModalOpen, onOpen: onLogsModalOpen, onClose: onLogsModalClose } = useDisclosure();
  
  const cancelRef = useRef<HTMLButtonElement>(null);
  const keyCancelRef = useRef<HTMLButtonElement>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const pageBgColor = useColorModeValue('gray.50', 'gray.900');

  const [formData, setFormData] = useState({
    name: '',
    defaultNumberId: '',
    rateLimitPerMin: 60,
    isActive: true,
  });

  const [keyScopes, setKeyScopes] = useState<string[]>([]);

  // Check admin role
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }
    
    if (session.user.role !== 'ADMIN') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // Fetch clients
  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch clients',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch clients',
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
      fetchClients();
    }
  }, [session]);

  // Fetch API keys for a client
  const fetchApiKeys = async (clientId: string) => {
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/keys`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  };

  // Fetch request logs for a client
  const fetchRequestLogs = async (clientId: string) => {
    setLogsLoading(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/logs?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setRequestLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching request logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  // Handle client form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingClient 
        ? `/api/admin/clients/${editingClient.id}`
        : '/api/admin/clients';
      
      const method = editingClient ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingClient ? 'Client updated successfully' : 'Client created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onModalClose();
        setEditingClient(null);
        setFormData({ name: '', defaultNumberId: '', rateLimitPerMin: 60, isActive: true });
        fetchClients();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to save client',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Error',
        description: 'Failed to save client',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete client
  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      const response = await fetch(`/api/admin/clients/${deleteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Client deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onDeleteClose();
        setDeleteId(null);
        fetchClients();
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete client',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle generate API key
  const handleGenerateKey = async () => {
    if (!selectedClient) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/clients/${selectedClient.id}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopes: keyScopes }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.apiKey);
        setKeyScopes([]);
        fetchApiKeys(selectedClient.id);
        toast({
          title: 'API Key Generated',
          description: 'Copy the key now - it will not be shown again!',
          status: 'success',
          duration: 10000,
          isClosable: true,
        });
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to generate API key',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate API key',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete API key
  const handleDeleteKey = async () => {
    if (!deleteKeyId || !selectedClient) return;
    
    try {
      const response = await fetch(`/api/admin/clients/${selectedClient.id}/keys/${deleteKeyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'API key deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onKeyDeleteClose();
        setDeleteKeyId(null);
        fetchApiKeys(selectedClient.id);
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete API key',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete API key',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle toggle API key active status
  const handleToggleKey = async (keyId: string, currentStatus: boolean) => {
    if (!selectedClient) return;
    
    try {
      const response = await fetch(`/api/admin/clients/${selectedClient.id}/keys/${keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        fetchApiKeys(selectedClient.id);
      }
    } catch (error) {
      console.error('Error toggling API key:', error);
    }
  };

  // Open edit modal
  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      defaultNumberId: client.defaultNumberId || '',
      rateLimitPerMin: client.rateLimitPerMin,
      isActive: client.isActive,
    });
    onModalOpen();
  };

  // Open add modal
  const handleAdd = () => {
    setEditingClient(null);
    setFormData({ name: '', defaultNumberId: '', rateLimitPerMin: 60, isActive: true });
    onModalOpen();
  };

  // Open API keys modal
  const handleViewKeys = (client: Client) => {
    setSelectedClient(client);
    setNewApiKey(null);
    setKeyScopes([]);
    fetchApiKeys(client.id);
    onKeyModalOpen();
  };

  // Open logs modal
  const handleViewLogs = (client: Client) => {
    setSelectedClient(client);
    fetchRequestLogs(client.id);
    onLogsModalOpen();
  };

  // Copy to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: 'Copied to clipboard',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Center minH="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box minH="100vh" bg={pageBgColor}>
      <Container maxW="7xl" py={8}>
        <HStack justify="space-between" mb={6}>
          <Heading size="lg">External Integrations</Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="teal"
            onClick={handleAdd}
          >
            Add Client
          </Button>
        </HStack>

        <Alert status="info" mb={6} borderRadius="md">
          <AlertIcon />
          <AlertDescription>
            WhatsApp username support depends on Meta's contact book being enabled for the WABA.
            If it is off, phone-number conversations continue to work, but BSUID-only contacts
            may not resolve correctly.
          </AlertDescription>
        </Alert>

        <TableContainer bg={bgColor} borderRadius="md" border="1px" borderColor={borderColor}>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Default Number ID</Th>
                <Th>Rate Limit</Th>
                <Th>API Keys</Th>
                <Th>Request Logs</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {clients.map((client) => (
                <Tr key={client.id}>
                  <Td fontWeight="medium">{client.name}</Td>
                  <Td>
                    <Code fontSize="xs">{client.defaultNumberId || 'N/A'}</Code>
                  </Td>
                  <Td>{client.rateLimitPerMin}/min</Td>
                  <Td>{client.apiKeys.length}</Td>
                  <Td>{client._count.requestLogs}</Td>
                  <Td>
                    <Badge colorScheme={client.isActive ? 'green' : 'red'}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="View API keys"
                        icon={<ViewIcon />}
                        size="sm"
                        onClick={() => handleViewKeys(client)}
                      />
                      <IconButton
                        aria-label="View logs"
                        icon={<ViewIcon />}
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewLogs(client)}
                      />
                      <IconButton
                        aria-label="Edit client"
                        icon={<EditIcon />}
                        size="sm"
                        onClick={() => handleEdit(client)}
                      />
                      <IconButton
                        aria-label="Delete client"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => {
                          setDeleteId(client.id);
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

        {clients.length === 0 && !loading && (
          <Center py={8}>
            <Text color="gray.500">No clients found. Create your first client to get started.</Text>
          </Center>
        )}
      </Container>

      {/* Client Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={onModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingClient ? 'Edit Client' : 'Create Client'}</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Client name"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Default Number ID</FormLabel>
                  <Input
                    value={formData.defaultNumberId}
                    onChange={(e) => setFormData({ ...formData, defaultNumberId: e.target.value })}
                    placeholder="WhatsApp number ID"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Rate Limit (per minute)</FormLabel>
                  <Input
                    type="number"
                    value={formData.rateLimitPerMin}
                    onChange={(e) => setFormData({ ...formData, rateLimitPerMin: parseInt(e.target.value) || 60 })}
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
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onModalClose}>
                Cancel
              </Button>
              <Button colorScheme="teal" type="submit" isLoading={isSubmitting}>
                {editingClient ? 'Update' : 'Create'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Client
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This will delete the client and all associated API keys. This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* API Keys Modal */}
      <Modal isOpen={isKeyModalOpen} onClose={onKeyModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>API Keys - {selectedClient?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {newApiKey && (
              <Box mb={4} p={4} bg="yellow.50" borderRadius="md" border="1px" borderColor="yellow.200">
                <Text fontWeight="bold" mb={2}>New API Key (copy now - won't be shown again!)</Text>
                <HStack>
                  <Code flex={1} p={2} bg="white">{newApiKey}</Code>
                  <IconButton
                    aria-label="Copy"
                    icon={<CopyIcon />}
                    onClick={() => handleCopy(newApiKey)}
                  />
                </HStack>
              </Box>
            )}
            
            <VStack align="stretch" spacing={4}>
              <Box>
                <Heading size="sm" mb={2}>Generate New API Key</Heading>
                <VStack align="stretch" spacing={3}>
                  <FormControl>
                    <FormLabel>Scopes</FormLabel>
                    <CheckboxGroup value={keyScopes} onChange={(vals) => setKeyScopes(vals as string[])}>
                      <Stack spacing={2}>
                        {SCOPE_OPTIONS.map((scope) => (
                          <Checkbox key={scope.value} value={scope.value}>
                            {scope.label}
                          </Checkbox>
                        ))}
                      </Stack>
                    </CheckboxGroup>
                  </FormControl>
                  <Button
                    colorScheme="teal"
                    onClick={handleGenerateKey}
                    isLoading={isSubmitting}
                  >
                    Generate API Key
                  </Button>
                </VStack>
              </Box>

              <Divider />

              <Box>
                <Heading size="sm" mb={2}>Existing API Keys</Heading>
                <TableContainer>
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>Created</Th>
                        <Th>Last Used</Th>
                        <Th>Scopes</Th>
                        <Th>Status</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {apiKeys.map((key) => (
                        <Tr key={key.id}>
                          <Td>{new Date(key.createdAt).toLocaleDateString()}</Td>
                          <Td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</Td>
                          <Td>
                            <VStack align="start" spacing={1}>
                              {key.scopes.map((scope) => (
                                <Badge key={scope} fontSize="xs">{scope}</Badge>
                              ))}
                              {key.scopes.length === 0 && <Text fontSize="xs" color="gray.500">No scopes</Text>}
                            </VStack>
                          </Td>
                          <Td>
                            <Badge colorScheme={key.isActive ? 'green' : 'red'}>
                              {key.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={2}>
                              <Switch
                                size="sm"
                                isChecked={key.isActive}
                                onChange={() => handleToggleKey(key.id, key.isActive)}
                              />
                              <IconButton
                                aria-label="Delete key"
                                icon={<DeleteIcon />}
                                size="xs"
                                colorScheme="red"
                                onClick={() => {
                                  setDeleteKeyId(key.id);
                                  onKeyDeleteOpen();
                                }}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                {apiKeys.length === 0 && (
                  <Text color="gray.500" mt={4}>No API keys yet. Generate one above.</Text>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onKeyModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Key Confirmation */}
      <AlertDialog
        isOpen={isKeyDeleteOpen}
        leastDestructiveRef={keyCancelRef}
        onClose={onKeyDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete API Key
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This API key will be permanently deleted and cannot be recovered.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={keyCancelRef} onClick={onKeyDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteKey} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Request Logs Modal */}
      <Modal isOpen={isLogsModalOpen} onClose={onLogsModalClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Request Logs - {selectedClient?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {logsLoading ? (
              <Center py={8}>
                <Spinner />
              </Center>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Time</Th>
                      <Th>Method</Th>
                      <Th>Status</Th>
                      <Th>Response Code</Th>
                      <Th>Duration</Th>
                      <Th>IP</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {requestLogs.map((log) => (
                      <Tr key={log.id}>
                        <Td>{new Date(log.requestedAt).toLocaleString()}</Td>
                        <Td>{log.method}</Td>
                        <Td>
                          <Badge colorScheme={log.status === 'OK' ? 'green' : 'red'}>
                            {log.status}
                          </Badge>
                        </Td>
                        <Td>{log.responseCode}</Td>
                        <Td>{log.durationMs}ms</Td>
                        <Td>{log.ip || 'N/A'}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
            {!logsLoading && requestLogs.length === 0 && (
              <Center py={8}>
                <Text color="gray.500">No request logs found.</Text>
              </Center>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onLogsModalClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
