import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { OverlayMetadata } from "../types";

// For Expo Go on physical devices, replace 'localhost' with your computer's IP address
// Find your IP: macOS/Linux: `ifconfig | grep "inet "`, Windows: `ipconfig`
// Example: "http://192.168.1.100:8000"
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Use localhost for simulator/emulator
    // For physical device testing, use your computer's IP address
    // Detected IP: 192.168.1.2 (update if different)
    // For iOS Simulator: use "http://localhost:8000"
    // For Android Emulator: use "http://10.0.2.2:8000"
    // For physical device: use "http://192.168.1.2:8000"
    return "http://192.168.1.2:8000"; // Change to localhost if using simulator
  }
  return "http://your-production-url.com";
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export interface UploadResponse {
  job_id: string;
  message: string;
}

export interface StatusResponse {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  error?: string;
}

export const uploadVideo = async (
  videoUri: string,
  overlays: OverlayMetadata[],
  onUploadProgress?: (progress: number) => void
): Promise<UploadResponse> => {
  try {
    // Read video file
    const fileInfo = await FileSystem.getInfoAsync(videoUri);
    if (!fileInfo.exists) {
      throw new Error("Video file not found");
    }

    // Get file name from URI
    const fileName = videoUri.split("/").pop() || "video.mp4";
    const fileType = "video/mp4";

    // Create form data
    const formData = new FormData();
    formData.append("video", {
      uri: videoUri,
      type: fileType,
      name: fileName,
    } as any);

    // Remove id from overlays before sending
    const overlaysForApi = overlays.map(({ id, ...rest }) => rest);
    formData.append("overlays", JSON.stringify(overlaysForApi));

    const response = await api.post<UploadResponse>("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Upload error:", error);
    
    // Provide helpful error messages
    if (error.code === "ERR_NETWORK" || error.message?.includes("Network Error")) {
      throw new Error(
        `Network Error: Cannot connect to backend at ${API_BASE_URL}. ` +
        `Make sure:\n` +
        `1. Backend is running (cd backend && python main.py)\n` +
        `2. Your phone and computer are on the same Wi-Fi network\n` +
        `3. Update the API URL in services/api.ts if your IP changed`
      );
    }
    
    throw new Error(error.response?.data?.detail || error.message || "Failed to upload video");
  }
};

export const getJobStatus = async (jobId: string): Promise<StatusResponse> => {
  try {
    const response = await api.get<StatusResponse>(`/status/${jobId}`);
    return response.data;
  } catch (error: any) {
    console.error("Status error:", error);
    throw new Error(error.response?.data?.detail || "Failed to get job status");
  }
};

export const downloadVideo = async (jobId: string): Promise<string> => {
  try {
    // Get download URL
    const downloadUrl = `${API_BASE_URL}/result/${jobId}`;
    
    // Download file using expo-file-system
    const fileUri = `${FileSystem.documentDirectory}rendered_${jobId}.mp4`;
    const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
    
    if (downloadResult.status !== 200) {
      throw new Error("Failed to download video");
    }

    return downloadResult.uri;
  } catch (error: any) {
    console.error("Download error:", error);
    throw new Error(error.message || "Failed to download video");
  }
};

