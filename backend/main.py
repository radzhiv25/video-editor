from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
import json
import asyncio
from pathlib import Path
import aiofiles
from enum import Enum

from services.video_processor import VideoProcessor
from models.job import JobStatus, Job, OverlayMetadata

app = FastAPI(title="Video Editor API", version="1.0.0")

# CORS middleware for React Native
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage directories
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# In-memory job storage (in production, use Redis or database)
jobs: dict[str, Job] = {}

# Video processor instance
video_processor = VideoProcessor()


class UploadResponse(BaseModel):
    job_id: str
    message: str


class StatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: Optional[float] = None
    error: Optional[str] = None


@app.post("/upload", response_model=UploadResponse)
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    overlays: str = Form(...),
):
    """
    Upload video file and overlay metadata.
    Returns a job_id for tracking the processing status.
    """
    try:
        # Parse overlays JSON
        try:
            overlays_data = json.loads(overlays)
            overlay_metadata = [OverlayMetadata(**overlay) for overlay in overlays_data]
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid overlays JSON: {str(e)}")

        # Generate unique job_id
        job_id = str(uuid.uuid4())

        # Save uploaded video
        video_path = UPLOAD_DIR / f"{job_id}_{video.filename}"
        async with aiofiles.open(video_path, "wb") as f:
            content = await video.read()
            await f.write(content)

        # Create job record
        job = Job(
            job_id=job_id,
            status=JobStatus.PENDING,
            video_path=str(video_path),
            overlays=overlay_metadata,
            output_path=None,
        )
        jobs[job_id] = job

        # Start background processing
        background_tasks.add_task(process_video, job_id)

        return UploadResponse(job_id=job_id, message="Video uploaded successfully")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.get("/status/{job_id}", response_model=StatusResponse)
async def get_status(job_id: str):
    """
    Get the processing status for a given job.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    return StatusResponse(
        job_id=job_id,
        status=job.status,
        progress=job.progress,
        error=job.error,
    )


@app.get("/result/{job_id}")
async def get_result(job_id: str):
    """
    Get the downloadable link to the final rendered video.
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400, detail=f"Job is not completed. Current status: {job.status}"
        )

    if not job.output_path or not os.path.exists(job.output_path):
        raise HTTPException(status_code=404, detail="Rendered video not found")

    return FileResponse(
        job.output_path,
        media_type="video/mp4",
        filename=f"rendered_{job_id}.mp4",
    )


async def process_video(job_id: str):
    """
    Background task to process video with overlays.
    """
    try:
        job = jobs[job_id]
        job.status = JobStatus.PROCESSING
        job.progress = 0.0

        # Process video with overlays
        output_path = await video_processor.process_video(
            job.video_path,
            job.overlays,
            OUTPUT_DIR / f"{job_id}_output.mp4",
            progress_callback=lambda p: update_job_progress(job_id, p),
        )

        job.output_path = str(output_path)
        job.status = JobStatus.COMPLETED
        job.progress = 100.0

    except Exception as e:
        job = jobs[job_id]
        job.status = JobStatus.FAILED
        job.error = str(e)
        job.progress = 0.0


def update_job_progress(job_id: str, progress: float):
    """
    Update job progress.
    """
    if job_id in jobs:
        jobs[job_id].progress = progress


@app.get("/")
async def root():
    return {"message": "Video Editor API", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


