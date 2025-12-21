export enum OverlayType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
}

export interface OverlayMetadata {
  id: string;
  type: OverlayType;
  content: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  start_time: number;
  end_time: number;
  width?: number;
  height?: number;
  font_size?: number;
  color?: string;
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  error?: string;
}


