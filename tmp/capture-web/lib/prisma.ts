import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma Client Configuration
 * Initializes the singleton Prisma client with a PostgreSQL adapter.
 * Uses a global cache in development to prevent Exhausting DB connections during HMR.
 */

const connectionString = `${process.env.DATABASE_URL}`;

// Initialize the PostgreSQL adapter for Prisma
const adapter = new PrismaPg({ connectionString });

// Setup a global variable to persist the Prisma instance during development (HMR)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Instantiate the client or reuse the existing one
const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

// If in development mode, save the instance to the global object
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;