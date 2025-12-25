import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const getSingleAPIKey = () => {
  const rawKey = process.env.GOOGLE_API_KEY;
  if (!rawKey) {
    throw new Error("GOOGLE_API_KEY is not defined");
  }
  const apiKeys = rawKey
    .split(",")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

  const randomIndex = Math.floor(Math.random() * apiKeys.length);
  return apiKeys[randomIndex];
};

export const getModelName = () => {
  const availableModels = ["gemini-2.5-flash-lite"];

  const randomIndex = Math.floor(Math.random() * availableModels.length);
  return availableModels[randomIndex];
};

export const GeminiModel = () => {
  const apiKey = getSingleAPIKey();
  const modelName = getModelName();
  const google = createGoogleGenerativeAI({
    apiKey: apiKey,
  });
  return google(modelName);
};
