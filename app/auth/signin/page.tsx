"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast, Container, Card, CardBody, useColorModeValue, Link } from "@chakra-ui/react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Authentication failed",
          description: "Invalid email or password",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: "Success",
          description: "Signed in successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        router.push("/");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg={bgColor} py={10}>
      <Container maxW="md">
        <Card>
          <CardBody>
            <VStack spacing={6}>
              <Heading size="lg">Sign In</Heading>
              <Text color="gray.600" textAlign="center">
                Welcome to WhatsApp Business Manager
              </Text>
              
              <Box as="form" onSubmit={handleSubmit} w="full">
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </FormControl>
                  
                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </FormControl>
                  
                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    w="full"
                    isLoading={isLoading}
                  >
                    Sign In
                  </Button>
                  
                  <Link
                    href="/auth/forgot-password"
                    color="blue.500"
                    textDecoration="none"
                    _hover={{ textDecoration: 'underline' }}
                    fontSize="sm"
                  >
                    Forgot your password?
                  </Link>
                </VStack>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
} 