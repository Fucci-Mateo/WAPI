import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ChakraProvider } from '@chakra-ui/react'
import StoreProvider from './components/StoreProvider';
import SessionProvider from './components/SessionProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WhatsApp Business Manager",
  description: "Professional messaging platform for WhatsApp Business API",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ChakraProvider>
          <ErrorBoundary>
            <SessionProvider>
              <StoreProvider>
                {children}
              </StoreProvider>
            </SessionProvider>
          </ErrorBoundary>
        </ChakraProvider>
      </body>
    </html>
  );
}
