import axios from "axios";
import { Minimize2, X } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Progress } from "./components/ui/progress";
import { httpClient } from "./lib/httpClient";
import { getCloudinarySignature } from "./lib/utils";
import { logger } from "./lib/logger";

// Interface for tracking the upload status
interface UploadState {
  isUploading: boolean; // True while file is being sent to server
  progress: number; // Percentage 0-100
  error: string | null; // Error message if upload fails
  success: boolean; // True after successful upload
  filename?: string; // Name of the file being uploaded
}

export default function UploadApp() {
  // State initialization
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false,
    filename: undefined,
  });

  // Use refs to ensure proper cleanup and prevent duplicate listeners or race conditions
  const hasSetupListener = useRef(false); // Prevents attaching multiple IPC listeners
  const isProcessingUpload = useRef(false); // Prevents overlapping uploads
  const processedRecordings = useRef(new Set<string>()); // Deduplication set for recording IDs

  const handleCloseWindow = useCallback(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send("close-upload-window");
    }
  }, []);

  const handleMinimizeWindow = useCallback(() => {
    if (window.ipcRenderer) {
      window.ipcRenderer.send("minimize-upload-window");
    }
  }, []);

  // Main upload logic: Uploads file to Cloudinary and then registers it with the backend
  const handleUpload = useCallback(
    async (videoBlob: Blob, filename?: string) => {
      // Create a unique identifier for this specific recording blob to prevent duplicates
      const recordingId = `${filename}-${videoBlob.size}-${Date.now()}`;

      // Check if we're already processing an upload or if this recording was already processed
      if (
        isProcessingUpload.current ||
        processedRecordings.current.has(recordingId)
      ) {
        logger.debug(
          "Upload already in progress or recording already processed",
          { recordingId }
        );
        return;
      }

      try {
        isProcessingUpload.current = true;
        processedRecordings.current.add(recordingId);

        // Update UI to show upload starting
        setUploadState({
          isUploading: true,
          progress: 0,
          error: null,
          success: false,
          filename: filename,
        });

        // Step 1: Get Cloudinary signature using utility function
        // This is required for secure authentication with Cloudinary
        const signatureData = await getCloudinarySignature();

        // Step 2: Prepare form data for Cloudinary upload
        const formData = new FormData();
        formData.append(
          "file",
          videoBlob,
          `capture-recording-${Date.now()}.webm`
        );
        formData.append("signature", signatureData.signature);
        formData.append("timestamp", signatureData.timestamp.toString());
        formData.append("folder", signatureData.folder);
        formData.append("api_key", signatureData.apiKey);
        formData.append("cloud_name", signatureData.cloudName);

        // Step 3: Upload to Cloudinary via HTTP POST
        const uploadResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/video/upload`,
          formData,
          {
            onUploadProgress: (progressEvent) => {
              // Update progress bar
              if (progressEvent.total) {
                const progress = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadState((prev) => ({ ...prev, progress }));
              }
            },
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        // Step 4: Handle successful upload
        setUploadState({
          isUploading: false,
          progress: 100,
          error: null,
          success: true,
          filename: filename,
        });

        // Step 5: Register the video in our backend database
        // Get auth token for videos API
        const authToken = localStorage.getItem("auth-token-v2");
        if (!authToken) {
          throw new Error("Authentication token not found for videos API");
        }

        // Clean the token (remove potential extra quotes)
        const cleanToken = authToken.replace(/^["']+|["']+$/g, "");

        // Send metadata to backend
        const res = await httpClient.post(
          "/api/token/videos",
          {
            title: filename || `capture-recording-${Date.now()}`,
            description:
              filename ||
              `Screen recording uploaded at ${new Date().toLocaleString()}`,
            cloudinaryPublicId: uploadResponse.data.public_id,
            url: uploadResponse.data.secure_url,
            m3u8Url: uploadResponse.data.playback_url,
            width: uploadResponse.data.width,
            height: uploadResponse.data.height,
            byteSize: uploadResponse.data.bytes,
            duration: uploadResponse.data.duration,
            format: uploadResponse.data.format,
          },
          {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
            },
          }
        );

        logger.info("Video record created", { recordId: res.data.id });

        // Open the video URL in the browser/app user interface
        if (res.data.redirectUrl) {
          const videoUrl = res.data.redirectUrl;
          logger.info("Opening video URL", { videoUrl });
          window.ipcRenderer.send("open-url", videoUrl);
        }

        logger.info("Upload successful", {
          publicId: uploadResponse.data.public_id,
        });

      } catch (error) {
        // Handle failures (network error, auth error, etc.)
        logger.error("Upload failed", error);
        setUploadState({
          isUploading: false,
          progress: 0,
          error: error instanceof Error ? error.message : "Upload failed",
          success: false,
          filename: filename,
        });
        // Remove from processed set on error so it can be retried if needed
        processedRecordings.current.delete(recordingId);
      } finally {
        isProcessingUpload.current = false;
      }
    },
    []
  );

  // Listen for recording data from main process attached to this window
  React.useEffect(() => {
    // Only set up the listener once
    if (hasSetupListener.current) {
      return;
    }

    logger.debug("Setting up IPC listener for recording-data");
    hasSetupListener.current = true;

    // Callback that receives raw video data from Electron Main Process
    const handleRecordingData = (
      _event: Electron.IpcRendererEvent,
      ...args: unknown[]
    ) => {
      const data = args[0] as {
        type: string;
        blob: number[]; // Raw byte array (u8)
        filename: string;
        mimeType: string;
      };
      
      logger.debug("Received recording data event", {
        filename: data.filename,
        type: data.type,
      });
      
      if (data && data.type === "video-blob") {
        // Convert the array of numbers back to a Blob for upload
        const uint8Array = new Uint8Array(data.blob);
        const videoBlob = new Blob([uint8Array], { type: data.mimeType });
        
        logger.debug("Converted to Blob", {
          filename: data.filename,
          size: videoBlob.size,
        });
        
        // Trigger automatic upload
        handleUpload(videoBlob, data.filename);
      } else {
        logger.warn("Invalid data format received", { data });
      }
    };

    // Listen for IPC messages from main process
    if (window.ipcRenderer) {
      window.ipcRenderer.on("recording-data", handleRecordingData);
    }

    // Cleanup function
    return () => {
      if (window.ipcRenderer) {
        window.ipcRenderer.removeListener(
          "recording-data",
          handleRecordingData
        );
      }
      hasSetupListener.current = false;
      // Clear processed recordings on cleanup to allow re-uploads if window is reused
      processedRecordings.current.clear();
    };
  }, []); // Empty dependency array to ensure this only runs once

  return (
    <div className="min-h-screen bg-background p-6 draggable">
      <div className="max-w-md mx-auto">
        <div className="flex justify-end space-x-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMinimizeWindow}
            className="h-8 w-8 p-0 non-draggable cursor-pointer"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseWindow}
            className="h-8 w-8 p-0 non-draggable cursor-pointer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Upload Progress */}
        {uploadState.isUploading && (
          <div className="space-y-4 p-4 border rounded-lg text-center">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading to Default Workspace...</span>
                <span>{uploadState.progress}%</span>
              </div>
              <Progress value={uploadState.progress} className="w-full" />
              {uploadState.filename && (
                <p className="text-xs text-muted-foreground">
                  {uploadState.filename}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {uploadState.success && !uploadState.isUploading && (
          <div className="p-4 border rounded-lg text-center">
            <p className="text-sm text-foreground">Upload Successful</p>
            {uploadState.filename && (
              <p className="text-xs text-muted-foreground mt-1">
                {uploadState.filename}
              </p>
            )}
          </div>
        )}

        {/* Error State */}
        {uploadState.error && !uploadState.isUploading && (
          <div className="p-4 border rounded-lg text-center">
            <p className="text-sm text-foreground">Upload Failed</p>
            {uploadState.filename && (
              <p className="text-xs text-muted-foreground mt-1">
                {uploadState.filename}
              </p>
            )}
          </div>
        )}

        {/* Default State - Show when not uploading, no success, no error */}
        {!uploadState.isUploading &&
          !uploadState.success &&
          !uploadState.error && (
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Waiting for recording data...
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
