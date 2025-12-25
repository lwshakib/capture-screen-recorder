import { createClient } from "@deepgram/sdk";
import { TaskType } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { v2 as cloudinary } from "cloudinary";
import { validateEnv } from "../schemas/env";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { getSingleAPIKey } from "@/llm/model";

const env = validateEnv(process.env);

export const cloudinaryApiKey = env.CLOUDINARY_API_KEY;
export const cloudinaryApiSecret = env.CLOUDINARY_API_SECRET;
export const cloudinaryCloudName = env.CLOUDINARY_CLOUD_NAME;
export const cloudinaryFolder = "capture-screen-recordings";
export const deepgramApiKey = env.DEEPGRAM_API_KEY;
export const googleApiKey = getSingleAPIKey() as string;
export const pineconeApiKey = process.env.PINECONE_API_KEY;

// Validation handled by Zod via validateEnv above

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
  secure: true,
});

export const deepgramClient = createClient(deepgramApiKey);
export const cloudinaryClient = cloudinary;

// Initialize embeddings
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004", // 768 dimensions
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
  apiKey: googleApiKey,
});

export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 50,
});

export const pinecone = new PineconeClient();
// Will automatically read the PINECONE_API_KEY and PINECONE_ENVIRONMENT env vars
// Only initialize index if API key and index name are provided
export const pineconeIndex =
  pineconeApiKey && process.env.PINECONE_INDEX
    ? pinecone.Index(process.env.PINECONE_INDEX)
    : null;
