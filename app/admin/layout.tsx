"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  Button,
  Container,
  HStack,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import Link from "next/link";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const activeBgColor = useColorModeValue("teal.50", "teal.900");
  const activeTextColor = "teal.500";

  // Check admin role and redirect if not admin
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/api/auth/signin");
      return;
    }

    if (session.user.role !== "ADMIN") {
      router.push("/");
    }
  }, [session, status, router]);

  // Show loading state
  if (status === "loading" || !session?.user) {
    return null;
  }

  // Redirect non-admins (will happen in useEffect)
  if (session.user.role !== "ADMIN") {
    return null;
  }

  // Determine active link
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <Box minH="100vh" bg={useColorModeValue("gray.50", "gray.900")}>
      {/* Navigation Bar */}
      <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} shadow="sm">
        <Container maxW="6xl">
          <HStack spacing={2} py={4}>
            {/* Home Button */}
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<ArrowBackIcon />}
                colorScheme={isActive("/") ? "teal" : "gray"}
              >
                Dashboard
              </Button>
            </Link>

            <Box w="1px" h="6" bg={borderColor} />

            {/* User Management Link */}
            <Link href="/admin/users">
              <Button
                variant={isActive("/admin/users") ? "solid" : "ghost"}
                size="sm"
                colorScheme={isActive("/admin/users") ? "teal" : "gray"}
                fontWeight={isActive("/admin/users") ? "semibold" : "normal"}
              >
                User Management
              </Button>
            </Link>

            {/* Phone Numbers Link */}
            <Link href="/admin/numbers">
              <Button
                variant={isActive("/admin/numbers") ? "solid" : "ghost"}
                size="sm"
                colorScheme={isActive("/admin/numbers") ? "teal" : "gray"}
                fontWeight={isActive("/admin/numbers") ? "semibold" : "normal"}
              >
                Phone Numbers
              </Button>
            </Link>

            {/* Integrations Link */}
            <Link href="/admin/integrations">
              <Button
                variant={isActive("/admin/integrations") ? "solid" : "ghost"}
                size="sm"
                colorScheme={isActive("/admin/integrations") ? "teal" : "gray"}
                fontWeight={isActive("/admin/integrations") ? "semibold" : "normal"}
              >
                Integrations
              </Button>
            </Link>

            {/* Templates Link */}
            <Link href="/admin/templates">
              <Button
                variant={isActive("/admin/templates") ? "solid" : "ghost"}
                size="sm"
                colorScheme={isActive("/admin/templates") ? "teal" : "gray"}
                fontWeight={isActive("/admin/templates") ? "semibold" : "normal"}
              >
                Templates
              </Button>
            </Link>
          </HStack>
        </Container>
      </Box>

      {/* Page Content */}
      {children}
    </Box>
  );
}
