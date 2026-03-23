"use client";
import { useState, useRef } from 'react';
import { Template } from './types';
import { useAppStore } from '../store/useAppStore';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Flex,
  Box,
  IconButton,
  Input,
  VStack,
  HStack,
  Textarea,
  Alert,
  AlertIcon,
  useColorModeValue,
  Icon,
  Spinner,
  Image,
  CloseButton,
} from '@chakra-ui/react';
import { FiSend, FiFileText, FiX, FiPaperclip, FiImage, FiMusic, FiFile } from 'react-icons/fi';

interface MessageInputProps {
  text: string;
  onTextChange: (text: string) => void;
  onSend: (e: React.FormEvent) => void;
  sending: boolean;
  error: string;
  onFetchTemplates: () => void;
  loadingTemplates: boolean;
  showTemplates: boolean;
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template | null) => void;
  templateVariables: Record<string, string>;
  onTemplateVariableChange: (variables: Record<string, string>) => void;
  onSendTemplate: () => void;
  sendingTemplate: boolean;
  templateError: string;
  onCloseTemplates: () => void;
}

export default function MessageInput({
  text,
  onTextChange,
  onSend,
  sending,
  error,
  onFetchTemplates,
  loadingTemplates,
  showTemplates,
  templates,
  selectedTemplate,
  onTemplateSelect,
  templateVariables,
  onTemplateVariableChange,
  onSendTemplate,
  sendingTemplate,
  templateError,
  onCloseTemplates
}: MessageInputProps) {
  const { activeChat, windowStatus, selectedNumber, sendMediaMessage } = useAppStore();

  const canSendFreeForm = windowStatus?.canSendFreeForm ?? false;
  const canSendTemplate = windowStatus?.canSendTemplate ?? true;

  // Handle Enter key: send message, Shift+Enter: new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && canSendFreeForm && text.trim()) {
      e.preventDefault();
      // Create a synthetic form event to call onSend
      const syntheticEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
      } as React.FormEvent;
      onSend(syntheticEvent);
    }
    // Shift+Enter will allow default behavior (new line)
  };

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const inputBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const templateMediaInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string>('');
  const [uploadingTemplateMedia, setUploadingTemplateMedia] = useState<string | null>(null); // Track which parameter is uploading

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - must match server validation exactly
    const mimeType = file.type;
    const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
    const AUDIO_TYPES = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'];
    const DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    const isImage = IMAGE_TYPES.includes(mimeType);
    const isAudio = AUDIO_TYPES.includes(mimeType);
    const isDocument = DOCUMENT_TYPES.includes(mimeType);

    if (!isImage && !isAudio && !isDocument) {
      setMediaError(`Unsupported file type. Supported: images (${IMAGE_TYPES.join(', ')}), audio (${AUDIO_TYPES.join(', ')}), documents (PDF, Word, Excel, PowerPoint).`);
      return;
    }

    // Validate file size
    const maxSize = isImage ? 5 * 1024 * 1024 : isAudio ? 16 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      setMediaError(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setSelectedFile(file);
    setMediaError('');

    // Create preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setMediaError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedNumber || !activeChat) return;

    setUploadingMedia(true);
    setMediaError('');

    try {
      // Step 1: Upload file to get media ID
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('numberId', selectedNumber.numberId);

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Failed to upload media');
      }

      const uploadData = await uploadRes.json();
      const { mediaId, mediaType, fileName, mimeType } = uploadData;

      // Step 2: Send message with media ID and metadata
      // Don't send caption for audio files (WhatsApp doesn't support audio captions)
      const caption = mediaType === 'audio' ? undefined : (text || undefined);
      const success = await sendMediaMessage(mediaId, mediaType, caption, fileName, mimeType);

      // Only clear file selection and text if send was successful
      if (success) {
        handleRemoveFile();
        onTextChange('');
      }
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : 'Failed to send media');
    } finally {
      setUploadingMedia(false);
    }
  };

  const [currentUploadingParam, setCurrentUploadingParam] = useState<{componentType: string, paramIndex: number} | null>(null);

  const handleTemplateMediaButtonClick = (componentType: string, paramIndex: number) => {
    if (!selectedNumber) return;
    setCurrentUploadingParam({ componentType, paramIndex });
    templateMediaInputRef.current?.click();
  };

  const handleTemplateMediaFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNumber || !currentUploadingParam) return;

    const { componentType, paramIndex } = currentUploadingParam;
    const paramKey = `${componentType}_${paramIndex}`;
    setUploadingTemplateMedia(paramKey);

    try {
      // Upload file to get media ID
      const formData = new FormData();
      formData.append('file', file);
      formData.append('numberId', selectedNumber.numberId);

      const uploadRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.error || 'Failed to upload media');
      }

      const uploadData = await uploadRes.json();
      const { mediaId } = uploadData;

      // Update the template variable with the media ID
      const newVariables = { ...templateVariables };
      newVariables[paramKey] = mediaId;
      onTemplateVariableChange(newVariables);
    } catch (error) {
      console.error('Template media upload error:', error);
      // You could show a toast here if needed
    } finally {
      setUploadingTemplateMedia(null);
      setCurrentUploadingParam(null);
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  return (
    <>
      <Box p={4} borderTop="1px" borderColor={borderColor} bg={bgColor}>
        <Box as="form" onSubmit={onSend}>
          <VStack spacing={3}>
            <Flex gap={3} w="full">
              <Textarea
                placeholder={
                  canSendFreeForm
                    ? "Type your message... (Press Enter to send, Shift+Enter for new line)"
                    : "Customer service window closed. Use templates only."
                }
                value={text}
                onChange={e => onTextChange(e.target.value)}
                onKeyDown={handleKeyDown}
                bg={inputBg}
                borderColor={borderColor}
                color={textColor}
                _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px teal.400' }}
                _placeholder={{ color: useColorModeValue('gray.400', 'gray.500') }}
                resize="none"
                rows={2}
                isRequired
                isDisabled={!canSendFreeForm}
                opacity={!canSendFreeForm ? 0.5 : 1}
                cursor={!canSendFreeForm ? 'not-allowed' : 'text'}
                flex={1}
              />
              <HStack spacing={2}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,audio/aac,audio/mp4,audio/mpeg,audio/amr,audio/ogg,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <IconButton
                  aria-label="Attach file"
                  icon={<Icon as={FiPaperclip} />}
                  onClick={() => fileInputRef.current?.click()}
                  isDisabled={!canSendFreeForm || uploadingMedia}
                  variant="outline"
                  colorScheme="teal"
                  opacity={!canSendFreeForm ? 0.5 : 1}
                  cursor={!canSendFreeForm ? 'not-allowed' : 'pointer'}
                />
                <IconButton
                  aria-label="Templates"
                  icon={loadingTemplates ? <Spinner size="sm" /> : <Icon as={FiFileText} />}
                  onClick={onFetchTemplates}
                  isDisabled={loadingTemplates || !canSendTemplate}
                  variant="outline"
                  colorScheme="teal"
                  opacity={!canSendTemplate ? 0.5 : 1}
                  cursor={!canSendTemplate ? 'not-allowed' : 'pointer'}
                />
                {selectedFile ? (
                  <Button
                    type="button"
                    onClick={handleSendMedia}
                    isDisabled={uploadingMedia || !canSendFreeForm}
                    colorScheme="teal"
                    isLoading={uploadingMedia}
                    loadingText="Sending..."
                  >
                    <HStack spacing={2}>
                      <Icon as={FiSend} />
                      <Text>Send</Text>
                    </HStack>
                  </Button>
                ) : (
                <Button
                  type="submit"
                  isDisabled={sending || !text.trim() || !canSendFreeForm}
                  colorScheme="teal"
                  opacity={!canSendFreeForm ? 0.5 : 1}
                  cursor={!canSendFreeForm ? 'not-allowed' : 'pointer'}
                >
                  {sending ? (
                    <HStack spacing={2}>
                      <Spinner size="sm" />
                      <Text>Sending...</Text>
                    </HStack>
                  ) : (
                    <HStack spacing={2}>
                      <Icon as={FiSend} />
                      <Text>Send</Text>
                    </HStack>
                  )}
                </Button>
                )}
              </HStack>
            </Flex>
            
            {/* File Preview */}
            {selectedFile && (
              <Box
                w="full"
                p={3}
                bg={inputBg}
                border="1px"
                borderColor={borderColor}
                borderRadius="md"
                position="relative"
              >
                <CloseButton
                  size="sm"
                  onClick={handleRemoveFile}
                  position="absolute"
                  top={2}
                  right={2}
                  zIndex={1}
                />
                {filePreview ? (
                  <>
                    <Image src={filePreview} alt="Preview" maxH="200px" borderRadius="md" />
                    <Textarea
                      placeholder="Add a caption (optional)"
                      value={text}
                      onChange={e => onTextChange(e.target.value)}
                      mt={2}
                      size="sm"
                      rows={2}
                    />
                  </>
                ) : (
                  <>
                    <HStack spacing={3}>
                      <Icon
                        as={selectedFile.type.startsWith('audio/') ? FiMusic : FiFile}
                        boxSize={8}
                        color="teal.500"
                      />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {selectedFile.name}
                        </Text>
                        <Text fontSize="xs" color={useColorModeValue('gray.500', 'gray.400')}>
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </Text>
                      </VStack>
                    </HStack>
                    {/* Show caption textarea for documents only (audio doesn't support captions) */}
                    {!selectedFile.type.startsWith('audio/') && (
                      <Textarea
                        placeholder="Add a caption (optional)"
                        value={text}
                        onChange={e => onTextChange(e.target.value)}
                        mt={2}
                        size="sm"
                        rows={2}
                      />
                    )}
                  </>
                )}
              </Box>
            )}
            
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{error}</Text>
              </Alert>
            )}

            {mediaError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{mediaError}</Text>
              </Alert>
            )}
          </VStack>
        </Box>
      </Box>

      {/* Templates Popup Modal */}
      <Modal isOpen={showTemplates} onClose={onCloseTemplates} size="6xl" isCentered>
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent 
          bg={useColorModeValue('white', 'gray.800')} 
          borderRadius="xl" 
          maxW="6xl" 
          w="full" 
          maxH="90vh" 
          overflow="hidden"
          boxShadow="2xl"
        >
          {/* Header */}
          <ModalHeader 
            p={6} 
            borderBottomWidth="1px" 
            borderColor={useColorModeValue('gray.200', 'gray.600')} 
            bg={useColorModeValue('gray.50', 'gray.700')}
          >
            <Flex align="center" justify="space-between">
              <Box>
                <Flex align="center" mb={2}>
                  <Icon 
                    as={FiFileText} 
                    color="teal.500" 
                    mr={3} 
                    w={6} 
                    h={6} 
                  />
                  <Text 
                    fontSize="2xl" 
                    fontWeight="bold" 
                    color={useColorModeValue('gray.800', 'white')}
                  >
                    Message Templates
                  </Text>
                </Flex>
                <Text 
                  color={useColorModeValue('gray.600', 'gray.300')} 
                  fontSize="sm"
                >
                  {templates.length} templates available
                </Text>
              </Box>
              <IconButton
                aria-label="Close"
                icon={<Icon as={FiX} />}
                onClick={onCloseTemplates}
                variant="ghost"
                colorScheme="gray"
                _hover={{ bg: useColorModeValue('gray.100', 'gray.600') }}
                size="lg"
              />
            </Flex>
          </ModalHeader>

          <ModalBody p={6}>
            {templates.length === 0 ? (
              <Box textAlign="center" py={12}>
                <Box 
                  w={16} 
                  h={16} 
                  mx="auto" 
                  mb={4} 
                  bg={useColorModeValue('gray.100', 'gray.700')} 
                  borderRadius="full" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                >
                  <Icon 
                    as={FiFileText} 
                    w={8} 
                    h={8} 
                    color={useColorModeValue('gray.400', 'gray.500')} 
                  />
                </Box>
                <Text 
                  color={useColorModeValue('gray.600', 'gray.300')} 
                  fontSize="lg"
                >
                  No templates available
                </Text>
                <Text 
                  color={useColorModeValue('gray.500', 'gray.500')} 
                  fontSize="sm" 
                  mt={2}
                >
                  Templates will appear here once configured
                </Text>
              </Box>
            ) : (
              <Box 
                display="grid" 
                gridTemplateColumns={{ base: '1fr', lg: '1fr 1fr' }} 
                gap={4} 
                maxH="24rem" 
                overflowY="auto" 
                pr={2}
                sx={{
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    background: useColorModeValue('gray.100', 'gray.700'),
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    background: useColorModeValue('gray.300', 'gray.500'),
                    borderRadius: '3px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: useColorModeValue('gray.400', 'gray.400'),
                  },
                }}
              >
                {templates.map((template) => (
                  <Box
                    key={template.id}
                    bg={useColorModeValue('white', 'gray.700')}
                    borderWidth={selectedTemplate?.id === template.id ? '2px' : '1px'}
                    borderColor={selectedTemplate?.id === template.id ? 'teal.500' : useColorModeValue('gray.200', 'gray.600')}
                    borderRadius="xl"
                    cursor="pointer"
                    transition="all 0.2s"
                    boxShadow={selectedTemplate?.id === template.id ? 'lg' : 'sm'}
                    _hover={{
                      boxShadow: 'md',
                      transform: 'translateY(-1px)',
                    }}
                    p={4}
                    onClick={() => onTemplateSelect(template)}
                  >
                    <Flex align="center" justify="space-between" mb={3}>
                      <Text 
                        fontWeight="semibold" 
                        color={useColorModeValue('gray.800', 'white')} 
                        fontSize="lg"
                      >
                        {template.name}
                      </Text>
                      <Box 
                        as="span" 
                        fontSize="xs" 
                        px={3} 
                        py={1} 
                        borderRadius="full" 
                        fontWeight="medium" 
                        borderWidth="1px"
                        bg={template.status === 'APPROVED' ? 'green.100' : template.status === 'PENDING' ? 'yellow.100' : 'red.100'}
                        color={template.status === 'APPROVED' ? 'green.800' : template.status === 'PENDING' ? 'yellow.800' : 'red.800'}
                        borderColor={template.status === 'APPROVED' ? 'green.200' : template.status === 'PENDING' ? 'yellow.200' : 'red.200'}
                      >
                        {template.status}
                      </Box>
                    </Flex>
                    <VStack spacing={2} align="start">
                      <Flex align="center" fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')}>
                        <Icon as={FiFileText} mr={2} />
                        Language: {template.language}
                      </Flex>
                      <Flex align="center" fontSize="sm" color={useColorModeValue('gray.600', 'gray.300')}>
                        <Icon as={FiFileText} mr={2} />
                        Category: {template.category}
                      </Flex>
                    </VStack>
                  </Box>
                ))}
              </Box>
            )}
          </ModalBody>

          {/* Template Variables Section */}
          {selectedTemplate && (
            <ModalBody 
              p={6} 
              borderTopWidth="1px" 
              borderColor={useColorModeValue('gray.200', 'gray.600')} 
              bg={useColorModeValue('gray.50', 'gray.700')}
            >
              <Box mb={6}>
                <Text 
                  fontSize="xl" 
                  fontWeight="semibold" 
                  color={useColorModeValue('gray.800', 'white')} 
                  mb={4} 
                  display="flex" 
                  alignItems="center"
                >
                  <Icon as={FiFileText} mr={2} color="teal.500" />
                  Template Variables
                </Text>
                <VStack spacing={6}>
                  {selectedTemplate.components && selectedTemplate.components.length > 0 ? (
                    selectedTemplate.components.map((component: any, compIndex: number) => (
                    <Box 
                      key={compIndex} 
                      bg={useColorModeValue('white', 'gray.600')} 
                      borderWidth="1px" 
                      borderColor={useColorModeValue('gray.200', 'gray.500')} 
                      borderRadius="lg"
                      boxShadow="sm"
                    >
                      <Box p={4}>
                        <Text 
                          fontSize="lg" 
                          fontWeight="medium" 
                          color={useColorModeValue('gray.800', 'white')} 
                          mb={4} 
                          display="flex" 
                          alignItems="center"
                        >
                          <Icon as={FiFileText} mr={2} color="teal.500" />
                          {String(component.type || '').toUpperCase()} Variables
                        </Text>
                        {component.parameters && component.parameters.length > 0 ? (
                          <Box display="grid" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                            {component.parameters.map((param: any, paramIndex: number) => {
                              const paramKey = `${component.type}_${paramIndex}`;
                              const isMediaType = param.type === 'image' || param.type === 'video' || param.type === 'document';
                              const isUploading = uploadingTemplateMedia === paramKey;
                              
                              return (
                                <Box key={paramIndex}>
                                  <Text 
                                    fontSize="sm" 
                                    fontWeight="medium" 
                                    color={useColorModeValue('gray.700', 'gray.300')} 
                                    mb={2}
                                  >
                                    {param.text || param.example || `Variable ${paramIndex + 1}`}
                                  </Text>
                                  <HStack spacing={2}>
                                    <Input
                                      type="text"
                                      value={templateVariables[paramKey] || ''}
                                      onChange={(e) => {
                                        const newVariables = { ...templateVariables };
                                        newVariables[paramKey] = e.target.value;
                                        onTemplateVariableChange(newVariables);
                                      }}
                                      placeholder={isMediaType ? 'Media ID will appear here after upload' : (param.example || 'Enter value')}
                                      bg={useColorModeValue('white', 'gray.700')}
                                      borderColor={useColorModeValue('gray.300', 'gray.500')}
                                      color={useColorModeValue('gray.800', 'white')}
                                      _focus={{ 
                                        borderColor: 'teal.500', 
                                        boxShadow: '0 0 0 1px teal.500' 
                                      }}
                                      _placeholder={{ 
                                        color: useColorModeValue('gray.400', 'gray.400') 
                                      }}
                                      isReadOnly={isMediaType}
                                      flex={1}
                                    />
                                    {isMediaType && (
                                      <Button
                                        size="md"
                                        colorScheme="teal"
                                        onClick={() => handleTemplateMediaButtonClick(component.type, paramIndex)}
                                        isLoading={isUploading}
                                        loadingText="Uploading..."
                                        leftIcon={<Icon as={FiPaperclip} />}
                                        isDisabled={!selectedNumber}
                                      >
                                        Upload
                                      </Button>
                                    )}
                                  </HStack>
                                </Box>
                              );
                            })}
                          </Box>
                        ) : (
                          <Text 
                            fontSize="sm" 
                            color={useColorModeValue('gray.500', 'gray.400')} 
                            fontStyle="italic"
                          >
                            No variables required for this component
                          </Text>
                        )}
                      </Box>
                    </Box>
                    ))
                  ) : (
                    <Box 
                      bg={useColorModeValue('white', 'gray.600')} 
                      borderWidth="1px" 
                      borderColor={useColorModeValue('gray.200', 'gray.500')} 
                      borderRadius="lg"
                      p={4}
                      textAlign="center"
                    >
                      <Text 
                        fontSize="sm" 
                        color={useColorModeValue('gray.500', 'gray.400')} 
                        fontStyle="italic"
                      >
                        This template has no variable components. You can send it directly.
                      </Text>
                    </Box>
                  )}
                </VStack>
              </Box>

              <ModalFooter p={0} borderTopWidth="1px" borderColor={useColorModeValue('gray.200', 'gray.600')}>
                <HStack spacing={4} pt={4} w="full">
                  <Button
                    onClick={() => onTemplateSelect(null)}
                    variant="outline"
                    colorScheme="gray"
                    _hover={{ bg: useColorModeValue('gray.50', 'gray.600') }}
                    flex={1}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={onSendTemplate}
                    isDisabled={sendingTemplate || !canSendTemplate}
                    colorScheme="teal"
                    flex={1}
                    _hover={{ bg: 'teal.600' }}
                  >
                    {sendingTemplate ? (
                      <HStack spacing={2}>
                        <Spinner size="sm" />
                        <Text>Sending...</Text>
                      </HStack>
                    ) : (
                      <HStack spacing={2}>
                        <Icon as={FiSend} />
                        <Text>Send Template</Text>
                      </HStack>
                    )}
                  </Button>
                </HStack>
              </ModalFooter>
            </ModalBody>
          )}

          {/* Selection Prompt */}
          {!selectedTemplate && templates.length > 0 && (
            <ModalBody 
              p={6} 
              borderTopWidth="1px" 
              borderColor={useColorModeValue('gray.200', 'gray.600')} 
              bg={useColorModeValue('gray.50', 'gray.700')}
            >
              <Box textAlign="center" py={12}>
                <Box 
                  w={12} 
                  h={12} 
                  mx="auto" 
                  mb={3} 
                  bg={useColorModeValue('gray.100', 'gray.600')} 
                  borderRadius="full" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                >
                  <Icon as={FiFileText} w={6} h={6} color="teal.500" />
                </Box>
                <Text 
                  color={useColorModeValue('gray.600', 'gray.300')} 
                  fontSize="lg" 
                  fontWeight="medium"
                >
                  Select a template to continue
                </Text>
                <Text 
                  color={useColorModeValue('gray.500', 'gray.500')} 
                  fontSize="sm" 
                  mt={1}
                >
                  Click on any template above to configure and send
                </Text>
              </Box>
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
      
      {/* Hidden file input for template media uploads */}
      <input
        ref={templateMediaInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleTemplateMediaFileSelect}
        accept="image/jpeg,image/jpg,image/png,video/mp4,video/3gpp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      />
    </>
  );
} 