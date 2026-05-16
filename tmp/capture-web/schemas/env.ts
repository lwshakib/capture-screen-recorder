import { z } from "zod";

export const envSchema = z.object({
  // Cloudinary
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  
  // AI Services
  DEEPGRAM_API_KEY: z.string().min(1),
  GOOGLE_API_KEY: z.string().min(1),
  
  // Pinecone (optional for development)
  PINECONE_API_KEY: z.string().min(1).optional(),
  PINECONE_INDEX: z.string().min(1).optional(),
  
  // Inngest
  INNGEST_EVENT_KEY: z.string().min(1).optional(),
  
  // Clerk
  CLERK_JWT_KEY: z.string().min(1).optional(),
  
  // Public URLs
  NEXT_PUBLIC_DESKTOP_ORIGIN: z.string().url().optional(),
  NEXT_PUBLIC_WEB_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(env: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const missing = Object.keys(result.error.flatten().fieldErrors);
    console.error("Missing required environment variables:");
    for (const key of Object.keys(envSchema.shape)) {
      const present = env[key as keyof typeof env] as string | undefined;
      console.error(`${key}:`, present ? "✓ Set" : "✗ Missing");
    }
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ", "
      )}. Please check ENVIRONMENT_SETUP.md`
    );
  }
  return result.data;
}
