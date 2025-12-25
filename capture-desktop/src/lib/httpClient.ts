import axios from "axios";
import { env } from "./env";
import { logger } from "./logger";

export const httpClient = axios.create({
  baseURL: env.VITE_WEB_URL,
});

// Add request interceptor for logging
httpClient.interceptors.request.use(
  (config) => {
    logger.debug("HTTP Request", {
      method: config.method,
      url: config.url,
    });
    return config;
  },
  (error) => {
    logger.error("HTTP Request Error", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      logger.error("HTTP Response Error", error, {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      logger.error("HTTP Request Failed", error, {
        message: "No response received from server",
      });
    } else {
      logger.error("HTTP Error", error);
    }
    return Promise.reject(error);
  }
);