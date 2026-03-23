"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Container,
  Heading,
  Link,
  useColorModeValue,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
        toast({
          title: 'Email sent',
          description: data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send reset email',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Container maxW="md" py={12}>
        <Box
          bg={bgColor}
          p={8}
          rounded="lg"
          shadow="lg"
          border="1px"
          borderColor={borderColor}
        >
          <VStack spacing={6} textAlign="center">
            <Heading size="lg" color="green.500">
              Check Your Email
            </Heading>
            <Text color="gray.600">
              We've sent a password reset link to <strong>{email}</strong>
            </Text>
            <Text fontSize="sm" color="gray.500">
              The link will expire in 1 hour for security reasons.
            </Text>
            <VStack spacing={4} w="full">
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                w="full"
              >
                Send Another Email
              </Button>
              <Button
                onClick={() => router.push('/auth/signin')}
                colorScheme="blue"
                w="full"
              >
                Back to Sign In
              </Button>
            </VStack>
          </VStack>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="md" py={12}>
      <Box
        bg={bgColor}
        p={8}
        rounded="lg"
        shadow="lg"
        border="1px"
        borderColor={borderColor}
      >
        <VStack spacing={6}>
          <VStack spacing={2} textAlign="center">
            <Heading size="lg">Forgot Password?</Heading>
            <Text color="gray.600">
              Enter your email address and we'll send you a link to reset your password.
            </Text>
          </VStack>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Email Address</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  size="lg"
                />
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="Sending..."
              >
                Send Reset Link
              </Button>
            </VStack>
          </form>

          <VStack spacing={2} w="full">
            <Link
              onClick={() => router.push('/auth/signin')}
              color="blue.500"
              textDecoration="none"
              _hover={{ textDecoration: 'underline' }}
            >
              <ArrowBackIcon mr={1} />
              Back to Sign In
            </Link>
          </VStack>
        </VStack>
      </Box>
    </Container>
  );
}
