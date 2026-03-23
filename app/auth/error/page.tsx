"use client";

import { useSearchParams } from "next/navigation";
import { Box, Button, VStack, Heading, Text, Container, Card, CardBody, useColorModeValue } from "@chakra-ui/react";
import Link from "next/link";

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "CredentialsSignin":
        return "Invalid email or password. Please try again.";
      case "AccessDenied":
        return "Access denied. You don't have permission to access this resource.";
      case "Verification":
        return "Verification failed. Please try again.";
      default:
        return "An authentication error occurred. Please try again.";
    }
  };

  return (
    <Box minH="100vh" bg={bgColor} py={10}>
      <Container maxW="md">
        <Card>
          <CardBody>
            <VStack spacing={6}>
              <Heading size="lg" color="red.500">
                Authentication Error
              </Heading>
              <Text color="gray.600" textAlign="center">
                {getErrorMessage(error)}
              </Text>
              
              <Link href="/auth/signin">
                <Button colorScheme="blue" size="lg">
                  Try Again
                </Button>
              </Link>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
} 