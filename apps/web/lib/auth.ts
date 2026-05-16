import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";

/**
 * Better Auth Configuration
 * Configures the primary authentication engine for the web application.
 * 
 * Features:
 * - Prisma Adapter: Stores users/sessions in PostgreSQL via Prisma.
 * - Social Login: Google OAuth integration.
 * - Extension Support: `bearer()` plugin allows authentication via Authorization headers.
 * - Next.js Integration: `nextCookies()` for SSR session handling.
 */
export const auth = betterAuth({
  // Use Prisma as the storage layer for user and session data
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Standard email/password credentials
  emailAndPassword: {
    enabled: true,
  },

  // OAuth providers for third-party login
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  // Plugins to extend functionality
  plugins: [
    nextCookies(), // Enables session cookie management in Next.js Server Actions/Routes
    bearer(),      // Enables Bearer Token auth for API requests (used by the Chrome Extension)
  ],

  // Session configuration
  session: {
    cookieCache: { enabled: true }, // Performance optimization for session lookups
  },
});
