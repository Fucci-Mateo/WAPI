"use client";
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  VStack,
  Text,
  useToast,
  Container,
  Heading,
  Link,
  useColorModeValue,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, ArrowBackIcon } from '@chakra-ui/icons';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No reset token provided');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`);
        const data = await response.json();

        if (response.ok) {
          setIsValidToken(true);
          setUserEmail(data.email);
          setUserName(data.name);
        } else {
          setError(data.error || 'Invalid or expired reset token');
        }
      } catch (error) {
        console.error('Error verifying token:', error);
        setError('Failed to verify reset token');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        router.push('/auth/signin');
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to reset password',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
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

  if (isVerifying) {
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
          <Center>
            <VStack spacing={4}>
              <Spinner size="xl" color="blue.500" />
              <Text>Verifying reset token...</Text>
            </VStack>
          </Center>
        </Box>
      </Container>
    );
  }

  if (!isValidToken || error) {
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
            <Alert status="error">
              <AlertIcon />
              <Box>
                <AlertTitle>Invalid Reset Link</AlertTitle>
                <AlertDescription>
                  {error || 'This password reset link is invalid or has expired.'}
                </AlertDescription>
              </Box>
            </Alert>
            
            <VStack spacing={4} w="full">
              <Button
                onClick={() => router.push('/auth/forgot-password')}
                colorScheme="blue"
                w="full"
              >
                Request New Reset Link
              </Button>
              <Button
                onClick={() => router.push('/auth/signin')}
                variant="outline"
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
            <Heading size="lg">Reset Your Password</Heading>
            <Text color="gray.600">
              Enter a new password for <strong>{userEmail}</strong>
            </Text>
          </VStack>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>New Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    size="lg"
                  />
                  <InputRightElement h="full">
                    <Button
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Confirm New Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    size="lg"
                  />
                  <InputRightElement h="full">
                    <Button
                      variant="ghost"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <Text fontSize="sm" color="gray.500">
                Password must be at least 8 characters long
              </Text>

              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                w="full"
                isLoading={isLoading}
                loadingText="Resetting..."
              >
                Reset Password
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
