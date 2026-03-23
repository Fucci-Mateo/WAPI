"use client";
import { Spinner, Box } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "sm",
    md: "md", 
    lg: "lg",
    xl: "xl"
  };

  return (
    <Box className={className}>
      <Spinner size={sizeMap[size]} color="teal.500" thickness="3px" />
    </Box>
  );
}

// Specialized loading components
export function ButtonSpinner() {
  return <LoadingSpinner size="sm" />;
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function InlineSpinner() {
  return <LoadingSpinner size="sm" className="inline" />;
} 