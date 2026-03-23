"use client";

import { useSession, signOut } from "next-auth/react";
import { Box, Button, Text, VStack, HStack, Avatar, Menu, MenuButton, MenuList, MenuItem, useToast } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import Link from "next/link";

export default function UserProfile() {
  const { data: session } = useSession();
  const toast = useToast();

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: "/auth/signin" });
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <Box>
      <Menu>
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost">
          <HStack spacing={2}>
            <Avatar size="sm" name={session.user.name || session.user.email} />
            <VStack spacing={0} align="start">
              <Text fontSize="sm" fontWeight="medium">
                {session.user.name || session.user.email}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {session.user.role}
              </Text>
            </VStack>
          </HStack>
        </MenuButton>
        <MenuList>
          {session.user.role === "ADMIN" && (
            <>
              <Link href="/admin/users">
                <MenuItem>User Management</MenuItem>
              </Link>
              <Link href="/admin/numbers">
                <MenuItem>Phone Number Management</MenuItem>
              </Link>
              <Link href="/admin/integrations">
                <MenuItem>Integrations</MenuItem>
              </Link>
              <Link href="/admin/templates">
                <MenuItem>Templates</MenuItem>
              </Link>
            </>
          )}
          <MenuItem onClick={handleSignOut}>
            Sign Out
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  );
} 