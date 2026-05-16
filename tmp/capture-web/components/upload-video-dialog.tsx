"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCaptureStore } from "@/context";
import axios from "axios";
import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UploadVideoDialogProps {
  trigger: React.ReactNode;
}

export function UploadVideoDialog({
  trigger,
}: UploadVideoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get current folder from URL
  const { addVideo } = useCaptureStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("video/")) {
        setSelectedFile(file);
      } else {
        alert("Please select a valid video file (MP4, MOV, AVI, etc.)");
      }
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith("video/")) {
          setSelectedFile(file);
        } else {
          alert("Please select a valid video file (MP4, MOV, AVI, etc.)");
        }
      }
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const { data: signature } = await axios.get("/api/cloudinary-signature");
      const uploadApi = `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`;

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("api_key", signature.apiKey);
      formData.append("timestamp", signature.timestamp);
      formData.append("folder", signature.folder);
      formData.append("signature", signature.signature);

      const { data: response } = await axios.post(uploadApi, formData, {
        onUploadProgress: (progress) => {
          setUploadProgress(
            Math.round((progress.loaded * 100) / (progress.total || 1))
          );
        },
      });

      // Create video record in database

      toast.info("Creating video record...");
      const videoData = {
          title: selectedFile.name || `capture-recording-${Date.now()}`,
            description:
              selectedFile.name ||
              `Screen recording uploaded at ${new Date().toLocaleString()}`,
        cloudinaryPublicId: response.public_id,
            url: response.secure_url,
            m3u8Url: response.playback_url,
            width: response.width,
            height: response.height,
            byteSize: response.bytes,
            duration: response.duration,
            format: response.format,
      };

      const videoResponse = await axios.post("/api/videos", videoData);

      if (videoResponse.data.newVideo) {
        // Video record created successfully
        addVideo(videoResponse.data.newVideo);
        console.log("Video record created:", videoResponse.data.newVideo);
        toast.success(
          "Video uploaded successfully! Processing will begin shortly."
        );

        // Optionally refresh the videos list or show success message
        // You can add a toast notification here
      }

      // Reset and close dialog
      setSelectedFile(null);
      setIsOpen(false);
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile]);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const resetDialog = useCallback(() => {
    setSelectedFile(null);
    setIsDragOver(false);
    setIsUploading(false);
    setUploadProgress(0);
  }, []);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          resetDialog();
        }
      }}
    >
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription>
            Upload a video file. Supported formats: MP4, MOV, AVI, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Upload className="h-8 w-8 text-primary" />
                  <span className="text-lg font-medium">File Selected</span>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words">
                        {selectedFile.name.length > 30
                          ? `${selectedFile.name.slice(0, 30)}...`
                          : selectedFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {isUploading && (
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {uploadProgress > 0
                        ? `Uploading ${Math.round(uploadProgress)}%`
                        : "Uploading..."}
                    </>
                  ) : (
                    "Upload Video"
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Drag and drop a video file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Only video files are supported (MP4, MOV, AVI, etc.)
                  </p>
                </div>

                {/* File Selection Button */}
                <div className="pt-2">
                  <input
                    type="file"
                    id="file-upload"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="file-upload">
                    <Button
                      asChild
                      variant="outline"
                      className="cursor-pointer"
                    >
                      <span>Select File</span>
                    </Button>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          {!selectedFile && (
            <div className="text-xs text-muted-foreground text-center">
              <p>You can upload 1 video file at a time</p>
              <p>Maximum file size: 500MB</p>
              <p>Only video files (MP4, MOV, AVI, etc.) are accepted</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
