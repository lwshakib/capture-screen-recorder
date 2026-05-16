import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Root Metadata for the web application.
 * Defines the default title, description, and multi-format favicon sets.
 */
export const metadata: Metadata = {
  title: "Capture - AI-Powered Screen Recorder",
  description: "Capture is a screen recorder application. Record your screen, upload, and share. Features AI-powered video analysis.",
  icons: {
    icon: [
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/favicon_io/apple-touch-icon.png' },
    ],
    other: [
      {
        rel: 'manifest',
        url: '/favicon_io/site.webmanifest',
      },
    ],
  },
};

/**
 * Root Layout Component
 * The high-level shell for the entire application.
 * 
 * Includes:
 * - ThemeProvider: Manages light/dark mode via 'next-themes'.
 * - Toaster: Shared toast notification system for user feedback.
 * - Global CSS: Injected at the root.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Main content injected here by Next.js Routing */}
          {children}
          
          {/* Toast notifications portal */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
