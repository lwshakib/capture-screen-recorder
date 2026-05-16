import axios from "axios";
import { Camera, Circle, Download, Pause, Play, Square, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getWebUrlOrNull } from "../../utils/env";
import { logger } from "../../utils/logger";

/**
 * RecordingCard Component
 * The primary controller for the capture process. Handles screen sharing,
 * audio mixing, media recording, and final file uploads.
 */

type RecorderState = "idle" | "recording" | "paused";

function RecordingCard() {
  const [state, setState] = useState<RecorderState>("idle");
  const [error, setError] = useState<string | null>(null);
  
  // Media pipeline refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  
  // Post-recording state
  const [showModal, setShowModal] = useState(false);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  
  // Upload status and progress tracking
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);

  // Timer state for the recording status indicator
  const timerIntervalRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  /**
   * Screen Recording Orchestration:
   * 1. Request Display Media (Chrome Screen Picker).
   * 2. (Optional) Request Microphone Access.
   * 3. Mix screen audio + mic audio into a single MediaStream.
   * 4. Initialize MediaRecorder with the mixed stream.
   * 5. Start chunk collection.
   */
  const startRecording = async () => {
    try {
      // Step 1: Capture screen/window with requested resolution
      const resJSON = localStorage.getItem("capture_resolution_selected");
      const res = resJSON ? JSON.parse(resJSON) : { width: 1280, height: 720 };
      
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: res.width, height: res.height },
        audio: true, // Enable system audio capture
      });

      // Step 2: Capture Microphone
      let micStream: MediaStream | null = null;
      const micId = localStorage.getItem("capture_audioinput_selected");
      if (micId) {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: micId } },
        }).catch(() => null);
      }

      // Step 3: Mix Audio and Video
      const combined = new MediaStream();
      displayStream.getVideoTracks().forEach(t => combined.addTrack(t));
      
      // Preference: Mic audio > Display audio
      const audioTrack = micStream?.getAudioTracks()[0] || displayStream.getAudioTracks()[0];
      if (audioTrack) combined.addTrack(audioTrack);
      
      combinedStreamRef.current = combined;

      // Step 4: Initialize Recorder
      const recorder = new MediaRecorder(combined, { mimeType: "video/webm;codecs=vp9,opus" });
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        setRecordedVideoBlob(finalBlob);
        setRecordedVideoUrl(URL.createObjectURL(finalBlob));
        setShowModal(true); // Open preview modal
        cleanup();
      };

      // Handle user clicking "Stop Sharing" in Chrome's native bar
      displayStream.getVideoTracks()[0].onended = () => stopRecording();

      recorder.start(1000); // Sample every 1s
      setState("recording");
      startedAtRef.current = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedMs(accumulatedMsRef.current + (Date.now() - (startedAtRef.current || 0)));
      }, 200);

    } catch (err: any) {
      setError(err.message || "Failed to start");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setState("idle");
  };

  const cleanup = () => {
    combinedStreamRef.current?.getTracks().forEach(t => t.stop());
    window.clearInterval(timerIntervalRef.current || 0);
  };

  /**
   * Secure Upload Flow:
   * 1. Fetch Cloudinary signature from self-hosted API (requires Auth).
   * 2. Perform direct upload to Cloudinary.
   * 3. Notify backend API of the new video record.
   */
  const uploadToCloud = async () => {
    if (!recordedVideoBlob) return;
    setIsUploading(true);
    
    try {
      const { authToken } = await chrome.storage.local.get("authToken");
      const webUrl = getWebUrlOrNull();

      // Get signed request parameters
      const sigRes = await fetch(`${webUrl}/api/token/cloudinary-signature`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const sigData = await sigRes.json();

      const formData = new FormData();
      formData.append("file", recordedVideoBlob);
      formData.append("signature", sigData.signature);
      formData.append("timestamp", sigData.timestamp);
      formData.append("api_key", sigData.apiKey);

      // Raw upload to Cloudinary
      const cloudRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, 
        formData,
        { onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1))) }
      );

      // Register with internal DB
      await fetch(`${webUrl}/api/token/videos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ videoData: cloudRes.data })
      });

      setUploadSuccess(true);
    } catch (e) {
      setError("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="recording-card">
       {/* Widget UI with Play/Stop/Pause buttons and elapsed time */}
       <div className="controls">
          {state === "idle" ? <Play onClick={startRecording} /> : <Square onClick={stopRecording} />}
          <span>{elapsedMs}ms</span>
       </div>

       {/* Overlay Modal for Preview and Post-recording Actions */}
       {showModal && (
         <div className="modal">
            <video src={recordedVideoUrl || ''} controls />
            <div className="actions">
               <button onClick={uploadToCloud}>{isUploading ? 'Uploading...' : 'Upload to Cloud'}</button>
            </div>
         </div>
       )}
    </div>
  );
}

export default RecordingCard;
