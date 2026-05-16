import {
  cloudinaryClient,
  deepgramClient,
  embeddings,
  pineconeIndex,
} from "@/config";
import { GeminiModel } from "@/llm/model";
import { Document } from "@langchain/core/documents";
import { PineconeStore } from "@langchain/pinecone";
import { generateObject } from "ai";
import ffmpeg from "fluent-ffmpeg";
import { z } from "zod";

interface Word {
  start: number;
  end: number;
  word: string;
  punctuated_word?: string;
}



/**
 * Converts video to audio buffer using ffmpeg
 */
export async function videoToText(
  videoUrl: string,
  step: any
): Promise<{ transcript: string; words: Word[]; duration: number }> {
  return await step.run("video-to-text", async () => {
    try {
      // First, check if the video has an audio track
      const hasAudioTrack = await new Promise<boolean>((resolve, reject) => {
        ffmpeg.ffprobe(videoUrl, (err: unknown, metadata: unknown) => {
          if (err) {
            console.warn("Could not probe video metadata:", (err as any).message);
            // Assume no audio if we can't probe
            resolve(false);
            return;
          }

          const audioStreams =
            (metadata as any).streams?.filter(
              (stream: unknown) => (stream as any).codec_type === "audio"
            ) || [];
          const hasAudio = audioStreams.length > 0;

          console.log(
            `Video audio check: ${
              hasAudio ? "Has audio track" : "No audio track"
            }`,
            {
              totalStreams: (metadata as any).streams?.length || 0,
              audioStreams: audioStreams.length,
              duration: (metadata as any).format?.duration,
            }
          );

          resolve(hasAudio);
        });
      });

      // If no audio track, return early with empty transcript
      if (!hasAudioTrack) {
        console.log("Video has no audio track, skipping audio processing");
        return {
          transcript: "",
          words: [],
          duration: 0,
        };
      }

      // Convert video to audio buffer
      const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let hasData = false;

        ffmpeg(videoUrl)
          .outputFormat("wav")
          .outputOptions(["-ar 16000", "-ac 1"])
          .on("end", () => {
            console.log("Audio converted successfully");
            if (!hasData || chunks.length === 0) {
              reject(
                new Error(
                  "No audio data generated - video may have no audio content"
                )
              );
              return;
            }
            const audioBuffer = Buffer.concat(chunks);
            resolve(audioBuffer);
          })
          .on("error", (err: any) => {
            console.error("Error converting audio:", err);
            // If audio conversion fails, it might be a silent video or corrupted audio
            reject(new Error(`Audio conversion failed: ${err.message}`));
          })
          .on("start", (commandLine: string) => {
            console.log("FFmpeg command:", commandLine);
          })
          .pipe()
          .on("data", (chunk: Buffer) => {
            hasData = true;
            chunks.push(chunk);
          })
          .on("end", () => {
            console.log(
              `Audio conversion completed with ${chunks.length} chunks`
            );
          })
          .on("error", (err: any) => {
            reject(new Error(`Audio pipe error: ${err.message}`));
          });
      });

      // Validate audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        console.log("Empty audio buffer generated, treating as silent video");
        return {
          transcript: "",
          words: [],
          duration: 0,
        };
      }

      // Check if audio buffer contains actual audio data (not just silence)
      const hasAudioContent = await new Promise<boolean>((resolve) => {
        // Simple check: if buffer is mostly zeros or very small, it's likely silent
        if (audioBuffer.length < 1000) {
          resolve(false);
          return;
        }

        // Check if buffer has non-zero values (indicating actual audio)
        const sampleSize = Math.min(1000, Math.floor(audioBuffer.length / 10));
        let nonZeroCount = 0;

        for (let i = 0; i < sampleSize; i++) {
          if (audioBuffer[i] !== 0) {
            nonZeroCount++;
          }
        }

        const hasContent = nonZeroCount > sampleSize * 0.1; // At least 10% non-zero values
        console.log(
          `Audio content check: ${
            hasContent ? "Has audio content" : "Silent audio"
          } (${nonZeroCount}/${sampleSize} non-zero samples)`
        );
        resolve(hasContent);
      });

      if (!hasAudioContent) {
        console.log(
          "Audio buffer contains no meaningful audio content, treating as silent video"
        );
        return {
          transcript: "",
          words: [],
          duration: 0,
        };
      }

      // Convert audio buffer to text using Deepgram
      if (!deepgramClient) {
        throw new Error("Deepgram client is not initialized");
      }

      try {
        const { result, error } =
          await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
            model: "nova-3",
            smart_format: true,
          });

        if (error) {
          console.error("Deepgram API error:", error);
          // If Deepgram fails due to audio quality issues, treat as silent video
          const errorMessage = String(error);
          if (
            errorMessage.includes("corrupt") ||
            errorMessage.includes("unsupported") ||
            errorMessage.includes("Bad Request")
          ) {
            console.log(
              "Deepgram rejected audio due to quality issues, treating as silent video"
            );
            return {
              transcript: "",
              words: [],
              duration: 0,
            };
          }
          throw new Error(`Deepgram transcription error: ${error}`);
        }

        if (!result?.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
          console.warn(
            "Deepgram response structure:",
            JSON.stringify(result, null, 2)
          );
          console.warn(
            "No transcript found in Deepgram response - this usually means the video has no audio or is completely silent"
          );
          // Instead of throwing an error, return a default response for silent videos
          console.log("Returning default response for video without audio");
          return {
            transcript: "",
            words: [],
            duration: result.metadata?.duration || 0,
          };
        }

        const transcript =
          result.results.channels[0].alternatives[0].transcript;
        const words = result.results.channels[0].alternatives[0].words || [];
        const duration = result.metadata?.duration || 0;

        console.log(
          `Successfully transcribed audio: ${transcript.length} characters, ${words.length} words`
        );
        return { transcript, words, duration };
      } catch (deepgramError: any) {
        console.error("Deepgram processing error:", deepgramError);

        // If it's a known audio quality issue, treat as silent video
        if (
          deepgramError.message?.includes("corrupt") ||
          deepgramError.message?.includes("unsupported") ||
          deepgramError.message?.includes("Bad Request")
        ) {
          console.log(
            "Deepgram rejected audio due to quality issues, treating as silent video"
          );
          return {
            transcript: "",
            words: [],
            duration: 0,
          };
        }

        // Re-throw other errors
        throw deepgramError;
      }
    } catch (error) {
      console.error("Error in videoToText:", error);

      // If the error is related to audio processing, treat as silent video
      if (
        error instanceof Error &&
        (error.message.includes("Audio conversion failed") ||
          error.message.includes("No audio data generated") ||
          error.message.includes("Audio pipe error") ||
          error.message.includes("corrupt") ||
          error.message.includes("unsupported"))
      ) {
        console.log(
          "Audio processing failed, treating as silent video:",
          error.message
        );
        return {
          transcript: "",
          words: [],
          duration: 0,
        };
      }

      throw error;
    }
  });
}

/**
 * Generates a meaningful title and description for videos without audio
 */
export async function generateDefaultTitleAndDescription(
  videoId: string,
  videoData: any,
  step: any
): Promise<{ title: string; description: string }> {
  return await step.run("generate-default-title-description", async () => {
    try {
      // Try to extract meaningful information from video data
      const recordingDate = new Date();
      const dateStr = recordingDate.toLocaleDateString();
      const timeStr = recordingDate.toLocaleTimeString();

      // Check if we have video dimensions
      const hasDimensions = videoData?.width && videoData?.height;
      const resolution = hasDimensions
        ? `${videoData.width}x${videoData.height}`
        : "Unknown resolution";

      // Generate context-aware title
      let title = `Screen Recording ${dateStr}`;

      // If we have duration, add it to the title
      if (videoData?.duration && videoData.duration > 0) {
        const minutes = Math.floor(videoData.duration / 60);
        const seconds = Math.floor(videoData.duration % 60);
        const durationStr =
          minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        title += ` (${durationStr})`;
      }

      // Generate descriptive description
      const description = `Screen recording captured on ${dateStr} at ${timeStr}. This recording contains no audio content. ${
        hasDimensions ? `Resolution: ${resolution}.` : ""
      } Recording ID: ${videoId}`;

      console.log(`Generated default title/description for video ${videoId}:`, {
        title,
        description,
      });

      return { title, description };
    } catch (error) {
      console.error("Error generating default title/description:", error);
      // Fallback to basic title/description
      return {
        title: `Screen Recording ${new Date().toLocaleDateString()}`,
        description: `Screen recording with no audio content. Recording ID: ${videoId}`,
      };
    }
  });
}

export async function generateTitleAndDescription(
  transcript: string,
  step: any
): Promise<{ title: string; description: string }> {
  return await step.run("generate-title-and-description", async () => {
    try {
      const response = await generateObject({
        model: GeminiModel(),
        prompt: `You are a helpful assistant that generates a title and description for a video transcript. Generate a title and description for the following video transcript: ${transcript}. The title should be a single sentence and the description should be a single paragraph. The title and description should be in the same language as the transcript.`,
        schema: z.object({
          title: z.string().describe("The title of the video"),
          description: z.string().describe("The description of the video"),
        }),
        temperature: 0.7,
      });

      return {
        title: response.object.title,
        description: response.object.description,
      };
    } catch (error) {
      console.error("Error in generateTitleAndDescription:", error);
      throw error;
    }
  });
}

/**
 * Generates intelligent chapters based on transcript content and word timing
 */
export async function generateChapters(
  transcript: string,
  words: any[],
  videoDuration: number,
  step: any
): Promise<Array<{ startTime: number; endTime: number; title: string }>> {
  return await step.run("generate-chapters", async () => {
    try {
      // Only generate chapters if video is longer than 30 seconds
      if (videoDuration < 30) {
        console.log("Video too short for chapters, skipping");
        return [];
      }

      // Use AI to identify natural topic breaks and suggest chapter points
      const response = await generateObject({
        model: GeminiModel(),
        prompt: `You are a helpful assistant that generates video chapters based on a transcript. Analyze the following video transcript and create 3-8 meaningful chapters. Each chapter should represent a distinct topic or section. The video duration is ${videoDuration} seconds.

Transcript: ${transcript}

Generate chapters that:
1. Have meaningful titles that describe the content
2. Are based on natural topic transitions in the transcript
3. Don't create unnecessary chapters for short content
4. Have start and end times that fit within the video duration
5. Represent logical content segments

Return exactly the number of chapters that make sense for this content (minimum 3, maximum 8).`,
        schema: z.object({
          chapters: z
            .array(
              z.object({
                startTime: z
                  .number()
                  .describe("Start time in seconds (0 to video duration)"),
                endTime: z
                  .number()
                  .describe(
                    "End time in seconds (startTime to video duration)"
                  ),
                title: z.string().describe("Chapter title (max 50 characters)"),
              })
            )
            .describe("Array of video chapters with timing and titles"),
        }),
        temperature: 0.7,
      });

      const aiChapters = response.object.chapters;

      // Use word timing data to create more precise chapters
      const preciseChapters = aiChapters.map((chapter) => {
        // Find the closest word timing to the AI-suggested start time
        const startWord =
          words.find((word) => word.start >= chapter.startTime) || words[0];
        const endWord =
          words.find((word) => word.start >= chapter.endTime) ||
          words[words.length - 1];

        return {
          startTime: startWord ? startWord.start : chapter.startTime,
          endTime: endWord ? endWord.end : chapter.endTime,
          title: chapter.title.substring(0, 50),
        };
      });

      // Validate and adjust chapter timings to ensure they fit within video duration
      const validatedChapters = preciseChapters.map((chapter) => ({
        startTime: Math.max(0, Math.min(chapter.startTime, videoDuration)),
        endTime: Math.max(
          chapter.startTime + 5,
          Math.min(chapter.endTime, videoDuration)
        ),
        title: chapter.title,
      }));

      // Sort chapters by start time
      validatedChapters.sort((a, b) => a.startTime - b.startTime);

      // Ensure no overlapping chapters and minimum duration
      const finalChapters: Array<{
        startTime: number;
        endTime: number;
        title: string;
      }> = [];
      let lastEndTime = 0;

      for (const chapter of validatedChapters) {
        if (
          chapter.startTime >= lastEndTime &&
          chapter.endTime > chapter.startTime + 5
        ) {
          finalChapters.push({
            startTime: chapter.startTime,
            endTime: chapter.endTime,
            title: chapter.title,
          });
          lastEndTime = chapter.endTime;
        }
      }

      console.log(
        `Generated ${finalChapters.length} precise chapters for ${videoDuration}s video`
      );
      return finalChapters;
    } catch (error) {
      console.error("Error in generateChapters:", error);
      // Return empty array if chapters generation fails
      return [];
    }
  });
}

/**
 * Converts chapters to VTT format and uploads to Cloudinary
 */
export async function generateAndUploadChapters(
  chapters: Array<{ startTime: number; endTime: number; title: string }>,
  videoId: string,
  step: any
): Promise<string> {
  return await step.run("generate-and-upload-chapters", async () => {
    try {
      if (chapters.length === 0) {
        console.log("No chapters to generate, skipping");
        return "";
      }

      // Convert chapters to VTT format
      const vttContent = generateVTTContent(chapters);

      // Convert VTT content to buffer
      const vttBuffer = Buffer.from(vttContent, "utf-8");

      // Upload VTT file to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinaryClient.uploader
          .upload_stream(
            {
              public_id: `chapters_${videoId}_${Date.now()}`,
              format: "vtt",
              resource_type: "raw", // Upload as raw file
            },
            (error: any, result: any) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          )
          .end(vttBuffer);
      });

      if (!uploadResult?.secure_url) {
        throw new Error("Failed to get secure URL from Cloudinary upload");
      }

      console.log(
        "Chapters VTT uploaded successfully:",
        uploadResult.secure_url
      );
      return uploadResult.secure_url;
    } catch (error) {
      console.error("Error in generateAndUploadChapters:", error);
      throw error;
    }
  });
}

/**
 * Generates and uploads subtitles VTT file to Cloudinary
 */
export async function generateAndUploadSubtitles(
  words: any[],
  videoId: string,
  step: any
): Promise<string> {
  return await step.run("generate-and-upload-subtitles", async () => {
    try {
      if (!words || words.length === 0) {
        console.log("No words data for subtitles, skipping");
        return "";
      }

      // Generate subtitles from words
      const subtitles = generateSubtitles(words);

      if (subtitles.length === 0) {
        console.log("No subtitles generated, skipping");
        return "";
      }

      // Convert subtitles to VTT format
      const vttContent = generateSubtitlesVTTContent(subtitles);

      // Convert VTT content to buffer
      const vttBuffer = Buffer.from(vttContent, "utf-8");

      // Upload VTT file to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinaryClient.uploader
          .upload_stream(
            {
              public_id: `subtitles_${videoId}_${Date.now()}`,
              format: "vtt",
              resource_type: "raw", // Upload as raw file
            },
            (error: any, result: any) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          )
          .end(vttBuffer);
      });

      if (!uploadResult?.secure_url) {
        throw new Error("Failed to get secure URL from Cloudinary upload");
      }

      console.log(
        "Subtitles VTT uploaded successfully:",
        uploadResult.secure_url
      );
      return uploadResult.secure_url;
    } catch (error) {
      console.error("Error in generateAndUploadSubtitles:", error);
      throw error;
    }
  });
}

/**
 * Generates VTT format content from chapters
 */
export function generateVTTContent(
  chapters: Array<{ startTime: number; endTime: number; title: string }>
): string {
  let vttContent = "WEBVTT\n\n";

  chapters.forEach((chapter, index) => {
    const startTime = formatTime(chapter.startTime);
    const endTime = formatTime(chapter.endTime);

    vttContent += `${index + 1}\n`;
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${chapter.title}\n\n`;
  });

  return vttContent;
}

/**
 * Generates VTT format content from subtitles
 */
export function generateSubtitlesVTTContent(
  subtitles: Array<{ startTime: number; endTime: number; text: string }>
): string {
  let vttContent = "WEBVTT\n\n";

  subtitles.forEach((subtitle, index) => {
    const startTime = formatTime(subtitle.startTime);
    const endTime = formatTime(subtitle.endTime);

    vttContent += `${index + 1}\n`;
    vttContent += `${startTime} --> ${endTime}\n`;
    vttContent += `${subtitle.text}\n\n`;
  });

  return vttContent;
}

/**
 * Generates subtitles from Deepgram words array, grouping words into phrases
 */
export function generateSubtitles(
  words: any[]
): Array<{ startTime: number; endTime: number; text: string }> {
  if (!words || words.length === 0) {
    return [];
  }

  const subtitles: Array<{ startTime: number; endTime: number; text: string }> =
    [];
  let currentPhrase: string[] = [];
  let phraseStart = words[0].start;
  let phraseEnd = words[0].end;
  let wordCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const nextWord = words[i + 1];

    // Add word to current phrase
    currentPhrase.push(word.punctuated_word || word.word);
    wordCount++;

    // Determine if we should end the current phrase
    let shouldEndPhrase = false;

    // End phrase if:
    // 1. We have enough words (5-8 words per subtitle)
    // 2. There's a natural pause (gap > 0.5 seconds)
    // 3. We hit punctuation that suggests a natural break
    // 4. We're at the end of the transcript

    if (wordCount >= 8) {
      shouldEndPhrase = true;
    } else if (nextWord && nextWord.start - word.end > 0.5) {
      shouldEndPhrase = true;
    } else if (word.punctuated_word && /[.!?]/.test(word.punctuated_word)) {
      shouldEndPhrase = true;
    } else if (i === words.length - 1) {
      shouldEndPhrase = true;
    }

    if (shouldEndPhrase) {
      // Create subtitle entry
      const text = currentPhrase.join(" ").trim();
      if (text.length > 0) {
        subtitles.push({
          startTime: phraseStart,
          endTime: phraseEnd,
          text: text,
        });
      }

      // Reset for next phrase
      if (nextWord) {
        currentPhrase = [];
        phraseStart = nextWord.start;
        phraseEnd = nextWord.end;
        wordCount = 0;
      }
    } else {
      // Update phrase end time
      phraseEnd = word.end;
    }
  }

  return subtitles;
}

/**
 * Converts seconds to VTT time format (HH:MM:SS.mmm)
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Generates thumbnail from video and uploads to Cloudinary
 */
export async function generateAndUploadThumbnail(
  videoUrl: string,
  videoId: string,
  width: number,
  height: number,
  step: any
): Promise<string> {
  return await step.run("generate-and-upload-thumbnail", async () => {
    try {
      // Generate thumbnail using ffmpeg and get it as a buffer
      const thumbnailBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let hasData = false;

        // First, try to get video duration
        ffmpeg.ffprobe(videoUrl, (err, metadata) => {
          if (err) {
            console.log(
              "Could not get video metadata, using first frame:",
              err.message
            );
            // Fallback: use first frame if we can't get duration
            generateThumbnailFromFrame(0);
            return;
          }

          const duration = metadata.format.duration;
          if (duration && duration > 1) {
            // If video is longer than 1 second, seek to 20% of duration
            const seekTime = Math.max(0.5, duration * 0.2); // At least 0.5 seconds
            console.log(
              `Video duration: ${duration}s, seeking to: ${seekTime}s`
            );
            generateThumbnailFromFrame(seekTime);
          } else {
            // Very short video, use first frame
            console.log("Short video detected, using first frame");
            generateThumbnailFromFrame(0);
          }
        });

        function generateThumbnailFromFrame(seekTime: number) {
          let attempts = 0;
          const maxAttempts = 3;

          function attemptThumbnailGeneration() {
            attempts++;
            console.log(
              `Thumbnail generation attempt ${attempts}/${maxAttempts} at time ${seekTime}s`
            );

            ffmpeg(videoUrl)
              .seekInput(seekTime) // Seek to calculated time or 0 for first frame
              .frames(1) // Extract 1 frame
              .outputFormat("mjpeg") // Use mjpeg for JPEG format
              .size(`${width}x${height}`) // Use video dimensions for thumbnail
              .on("end", () => {
                console.log("Thumbnail generation completed");
                if (!hasData || chunks.length === 0) {
                  if (attempts < maxAttempts && seekTime > 0) {
                    console.log(
                      "No thumbnail data, trying first frame as fallback"
                    );
                    generateThumbnailFromFrame(0);
                  } else {
                    reject(
                      new Error(
                        "No thumbnail data generated after multiple attempts"
                      )
                    );
                  }
                  return;
                }
                const buffer = Buffer.concat(chunks);
                if (buffer.length === 0) {
                  if (attempts < maxAttempts && seekTime > 0) {
                    console.log(
                      "Empty thumbnail buffer, trying first frame as fallback"
                    );
                    generateThumbnailFromFrame(0);
                  } else {
                    reject(
                      new Error(
                        "Generated thumbnail buffer is empty after multiple attempts"
                      )
                    );
                  }
                  return;
                }
                resolve(buffer);
              })
              .on("error", (err: any) => {
                console.error(
                  `Error generating thumbnail (attempt ${attempts}):`,
                  err
                );
                // If seeking failed, try first frame as fallback
                if (seekTime > 0 && attempts < maxAttempts) {
                  console.log("Seeking failed, trying first frame as fallback");
                  generateThumbnailFromFrame(0);
                } else if (attempts < maxAttempts) {
                  // If first frame also failed, try with different settings
                  console.log(
                    "First frame failed, trying with different settings"
                  );
                  generateThumbnailWithFallbackSettings();
                } else {
                  reject(
                    new Error(
                      `Thumbnail generation failed after ${maxAttempts} attempts: ${err.message}`
                    )
                  );
                }
              })
              .on("start", (commandLine: string) => {
                console.log("FFmpeg thumbnail command:", commandLine);
              })
              .pipe()
              .on("data", (chunk: Buffer) => {
                hasData = true;
                chunks.push(chunk);
                console.log(`Received thumbnail chunk: ${chunk.length} bytes`);
              })
              .on("end", () => {
                console.log(`Total thumbnail chunks: ${chunks.length}`);
              })
              .on("error", (err: any) => {
                reject(new Error(`Thumbnail pipe error: ${err.message}`));
              });
          }

          function generateThumbnailWithFallbackSettings() {
            console.log("Using fallback thumbnail settings");
            ffmpeg(videoUrl)
              .frames(1) // Extract 1 frame
              .outputFormat("mjpeg") // Use mjpeg for JPEG format
              .size(`${Math.min(width, 640)}x${Math.min(height, 480)}`) // Use smaller size as fallback
              .on("end", () => {
                console.log("Fallback thumbnail generation completed");
                if (!hasData || chunks.length === 0) {
                  reject(
                    new Error("Fallback thumbnail generation also failed")
                  );
                  return;
                }
                const buffer = Buffer.concat(chunks);
                if (buffer.length === 0) {
                  reject(new Error("Fallback thumbnail buffer is empty"));
                  return;
                }
                resolve(buffer);
              })
              .on("error", (err: any) => {
                reject(
                  new Error(
                    `Fallback thumbnail generation failed: ${err.message}`
                  )
                );
              })
              .on("start", (commandLine: string) => {
                console.log("FFmpeg fallback thumbnail command:", commandLine);
              })
              .pipe()
              .on("data", (chunk: Buffer) => {
                hasData = true;
                chunks.push(chunk);
              })
              .on("error", (err: any) => {
                reject(
                  new Error(`Fallback thumbnail pipe error: ${err.message}`)
                );
              });
          }

          attemptThumbnailGeneration();
        }
      });

      // Validate thumbnail buffer
      if (!thumbnailBuffer || thumbnailBuffer.length === 0) {
        throw new Error("Generated thumbnail buffer is empty or invalid");
      }

      console.log(`Thumbnail buffer size: ${thumbnailBuffer.length} bytes`);

      // Validate Cloudinary configuration

      // Upload thumbnail to Cloudinary
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinaryClient.uploader
          .upload_stream(
            {
              public_id: `thumbnail_${videoId}_${Date.now()}`,
              format: "jpg",
            },
            (error: any, result: any) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          )
          .end(thumbnailBuffer);
      });

      if (!uploadResult?.secure_url) {
        throw new Error("Failed to get secure URL from Cloudinary upload");
      }

      console.log("Thumbnail uploaded successfully:", uploadResult.secure_url);
      return uploadResult.secure_url;
    } catch (error) {
      console.error("Error in generateAndUploadThumbnail:", error);
      throw error;
    }
  });
}

export async function uploadOnVectorDB(
  transcript: string,
  videoId: string,
  step: any
) {
  return await step.run("upload-to-vector-db", async () => {
    if (!pineconeIndex) {
      console.warn("Pinecone index not configured, skipping vector DB upload");
      return;
    }

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      // Maximum number of batch requests to allow at once. Each batch is 1000 vectors.
      maxConcurrency: 5,
      // You can pass a namespace here too
      // namespace: "foo",
    });

    const words = transcript.split(/\s+/); // split by whitespace
    const chunkSize = 1000;
    const documents: Document[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(" ");

      const doc = new Document({
        pageContent: chunkText,
        metadata: { videoId: videoId },
      });

      documents.push(doc);
    }

    // const texts = await textSplitter.splitDocuments(documents);

    // const textsWithMetadata = texts.map((text, index) => ({
    //   ...text,
    //   metadata: { ...text.metadata, videoId: videoId, chunkIndex: index },
    // }));

    await vectorStore.addDocuments(documents);
    console.log(
      `Successfully uploaded transcript for video ${videoId} to vector database`
    );
  });
}
