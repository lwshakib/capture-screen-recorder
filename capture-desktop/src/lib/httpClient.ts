import axios from "axios";
import { env } from "./env";
import { logger } from "./logger";

/**
 * httpClient
 * Pre-configured Axios instance for making API requests to the Capture backend.
 * Includes interceptors for logging and error handling.
 */
export const httpClient = axios.create({
  baseURL: env.VITE_WEB_URL, // Use validated web URL from environment
});

// Request Interceptor: Logs every outgoing HTTP request for debugging
httpClient.interceptors.request.use(
  (config) => {
    logger.debug("HTTP Request", {
      method: config.method,
      url: config.url,
    });
    return config;
  },
  (error) => {
    // Log failures that happen before the request is even sent
    logger.error("HTTP Request Error", error);
    return Promise.reject(error);
  }
);

// Response Interceptor: centralized error logging for all incoming responses
httpClient.interceptors.response.use(
  (response) => {
    // Success - pass the response through
    return response;
  },
  (error) => {
    // Log different types of failures (Network vs Server Error)
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      logger.error("HTTP Response Error", error, {
        status: error.response.status,
        data: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received (Timeout or Network Down)
      logger.error("HTTP Request Failed", error, {
        message: "No response received from server",
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error("HTTP Error", error);
    }
    return Promise.reject(error);
  }
);