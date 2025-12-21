from pydantic import BaseModel
from enum import Enum
from typing import Optional, List


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class OverlayType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"


class OverlayMetadata(BaseModel):
    type: OverlayType
    content: str  # Text content, image path, or video path
    x: float  # X position (0-1 normalized or pixel)
    y: float  # Y position (0-1 normalized or pixel)
    start_time: float  # Start time in seconds
    end_time: float  # End time in seconds
    width: Optional[float] = None  # Width for image/video overlays
    height: Optional[float] = None  # Height for image/video overlays
    font_size: Optional[int] = None  # Font size for text overlays
    color: Optional[str] = None  # Color for text overlays (hex format)


class Job(BaseModel):
    job_id: str
    status: JobStatus
    video_path: str
    overlays: List[OverlayMetadata]
    output_path: Optional[str] = None
    progress: Optional[float] = 0.0
    error: Optional[str] = None


