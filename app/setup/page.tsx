"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, FormControl, FormLabel, Input, VStack, Heading, Text, useToast, Container, Card, CardBody, useColorModeValue } from "@chakra-ui/react";

export default function Setup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Setup failed");
      }

      toast({
        title: "Setup Complete",
        description: "Admin user created successfully. You can now sign in.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      router.push("/auth/signin");
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        status: "error",
        duration: 5000,
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
              <Heading size="lg">Initial Setup</Heading>
              <Text color="gray.600" textAlign="center">
                Create the first admin user for WhatsApp Business Manager
              </Text>
              
              <Box as="form" onSubmit={handleSubmit} w="full">
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Name</FormLabel>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </FormControl>
                  
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
                      placeholder="Enter a strong password"
                    />
                  </FormControl>
                  
                  <Button
                    type="submit"
                    colorScheme="blue"
                    size="lg"
                    w="full"
                    isLoading={isLoading}
                  >
                    Create Admin User
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
} 