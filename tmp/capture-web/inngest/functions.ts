import prisma from "@/lib/prisma";
import { inngest } from "./client";
import { NonRetriableError } from "inngest";

// Define Video interface based on Prisma schema to ensure proper handling
interface Video {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  cloudinaryPublicId: string;
  m3u8Url?: string | null;
  byteSize?: number | null;
  format?: string | null;
}

import {
  generateAndUploadChapters,
  generateAndUploadSubtitles,
  generateAndUploadThumbnail,
  generateChapters,
  generateDefaultTitleAndDescription,
  generateTitleAndDescription,
  uploadOnVectorDB,
  videoToText,
} from "./helpers";

interface ProcessVideoEvent {
  data: {
    video: Video;
  };
}

/**
 * Main function to process video and extract text
 */
export const processVideo = inngest.createFunction(
  { id: "process-video" },
  { event: "video.processed" },
  async ({ event, step }: { event: ProcessVideoEvent; step: any }) => {
    try {
      const { video } = event.data;

      // Validate input
      if (!video?.url) {
        throw new NonRetriableError("Invalid video data: missing videoUrl");
      }

      // Convert video to audio
      console.log(`Processing video ${video.id} for audio content...`);
      const { transcript, words, duration } = await videoToText(
        video.url,
        step
      );

      console.log(`Audio processing result for video ${video.id}:`, {
        hasTranscript: !!transcript,
        transcriptLength: transcript?.length || 0,
        wordCount: words?.length || 0,
        duration: duration || 0,
      });

      // Check if we have a transcript (video has audio)
      if (transcript && transcript.trim() !== "") {
        // Process transcript-related tasks only if we have audio
        await uploadOnVectorDB(transcript, video.id, step);

        const { title, description } = await generateTitleAndDescription(
          transcript,
          step
        );

        // Generate chapters
        const chapters = await generateChapters(
          transcript,
          words,
          video.duration || duration || 0,
          step
        );

        // Generate and upload chapters VTT file
        const chaptersVttUrl = await generateAndUploadChapters(
          chapters,
          video.id,
          step
        );

        // Generate and upload subtitles VTT file
        const subtitlesVttUrl = await generateAndUploadSubtitles(
          words,
          video.id,
          step
        );

        // Generate and upload thumbnail
        const thumbnailUrl = await generateAndUploadThumbnail(
          video.url,
          video.id,
          video.width || 320, // Use video width or default to 320
          video.height || 240, // Use video height or default to 240
          step
        );

        // Update database with transcript, thumbnail, and chapters
        await step.run("update-database", async () => {
          try {
            await prisma.video.update({
              where: { id: video.id },
              data: {
                transcript,
                title,
                description,
                thumbnail: thumbnailUrl,
                chapters: chapters,
                chapters_url: chaptersVttUrl,
                subtitles_url: subtitlesVttUrl,
              },
            });
          } catch (dbError) {
            console.error("Database update failed:", dbError);
            // Don't fail the entire process if DB update fails
          }
        });

        return {
          success: true,
          videoId: video.id,
          transcript,
          thumbnail_url: thumbnailUrl,
          chapters: chapters,
          chapters_url: chaptersVttUrl,
          subtitles_url: subtitlesVttUrl,
          message: `Video ${video.id} processed successfully with audio`,
        };
      } else {
        // Handle videos without audio - only process thumbnail
        console.log(
          `Video ${video.id} has no audio, processing thumbnail only`
        );

        // Generate and upload thumbnail
        const thumbnailUrl = await generateAndUploadThumbnail(
          video.url,
          video.id,
          video.width || 320, // Use video width or default to 320
          video.height || 240, // Use video height or default to 240
          step
        );

        // Generate better default title and description for videos without audio
        const { title: defaultTitle, description: defaultDescription } =
          await generateDefaultTitleAndDescription(video.id, video, step);

        // Update database for videos without audio
        await step.run("update-database-no-audio", async () => {
          try {
            await prisma.video.update({
              where: { id: video.id },
              data: {
                transcript: null, // No transcript available
                title: defaultTitle,
                description: defaultDescription,
                thumbnail: thumbnailUrl,
                chapters: {},
                chapters_url: null,
                subtitles_url: null,
              },
            });
          } catch (dbError) {
            console.error(
              "Database update failed for no-audio video:",
              dbError
            );
            // Don't fail the entire process if DB update fails
          }
        });

        return {
          success: true,
          videoId: video.id,
          transcript: null,
          thumbnail_url: thumbnailUrl,
          chapters: null,
          chapters_url: null,
          subtitles_url: null,
          message: `Video ${video.id} processed successfully without audio`,
        };
      }
    } catch (error) {
      console.error("Error in processVideo:", error);

      // Try to determine if this is an audio-related error that we can recover from
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isAudioError =
        errorMessage.includes("corrupt") ||
        errorMessage.includes("unsupported") ||
        errorMessage.includes("Bad Request") ||
        errorMessage.includes("Audio conversion failed") ||
        errorMessage.includes("No audio data generated");

      if (isAudioError) {
        console.log(
          `Audio processing error detected for video ${event.data.video.id}, attempting to process as silent video`
        );

        try {
          // Try to process as a video without audio
          const thumbnailUrl = await generateAndUploadThumbnail(
            event.data.video.url,
            event.data.video.id,
            event.data.video.width || 320,
            event.data.video.height || 240,
            step
          );

          const { title: defaultTitle, description: defaultDescription } =
            await generateDefaultTitleAndDescription(
              event.data.video.id,
              event.data.video,
              step
            );

          // Update database as completed (no audio)
          await step.run("recovery-update-database", async () => {
            try {
              await prisma.video.update({
                where: { id: event.data.video.id },
                data: {
                  transcript: null,
                  title: defaultTitle,
                  description: defaultDescription,
                  thumbnail: thumbnailUrl,
                  chapters: {},
                  chapters_url: null,
                  subtitles_url: null,
                },
              });
            } catch (dbError) {
              console.error(
                "Failed to update database during recovery:",
                dbError
              );
            }
          });

          console.log(
            `Successfully recovered video ${event.data.video.id} as silent video`
          );
          return {
            success: true,
            videoId: event.data.video.id,
            transcript: null,
            thumbnail_url: thumbnailUrl,
            chapters: null,
            chapters_url: null,
            subtitles_url: null,
            message: `Video ${event.data.video.id} recovered and processed as silent video`,
          };
        } catch (recoveryError) {
          console.error("Recovery attempt failed:", recoveryError);
          // Fall through to normal error handling
        }
      }

      throw error;
    }
  }
);
