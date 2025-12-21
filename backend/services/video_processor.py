import ffmpeg
import os
from pathlib import Path
from typing import List, Callable, Optional
from models.job import OverlayMetadata, OverlayType


class VideoProcessor:
    """
    Handles video processing with ffmpeg to apply overlays.
    """

    def __init__(self):
        self.temp_dir = Path("temp")
        self.temp_dir.mkdir(exist_ok=True)

    async def process_video(
        self,
        input_video_path: str,
        overlays: List[OverlayMetadata],
        output_path: Path,
        progress_callback: Optional[Callable[[float], None]] = None,
    ) -> Path:
        """
        Process video with overlays using ffmpeg.
        
        Args:
            input_video_path: Path to input video
            overlays: List of overlay metadata
            output_path: Path for output video
            progress_callback: Optional callback for progress updates
            
        Returns:
            Path to processed video
        """
        try:
            # Get video info
            probe = ffmpeg.probe(input_video_path)
            video_info = next(s for s in probe["streams"] if s["codec_type"] == "video")
            video_width = int(video_info["width"])
            video_height = int(video_info["height"])
            duration = float(probe["format"]["duration"])

            # Add main video input
            main_input = ffmpeg.input(input_video_path)
            current_stream = main_input["v"]

            # Process each overlay
            for idx, overlay in enumerate(overlays):
                if overlay.start_time >= overlay.end_time:
                    continue

                if overlay.type == OverlayType.TEXT:
                    # Text overlay using drawtext filter
                    # Escape single quotes in text
                    escaped_text = overlay.content.replace("'", "\\'")
                    current_stream = current_stream.drawtext(
                        text=escaped_text,
                        x=f"{int(overlay.x * video_width)}",
                        y=f"{int(overlay.y * video_height)}",
                        fontsize=overlay.font_size or 24,
                        fontcolor=overlay.color or "white",
                        enable=f"between(t,{overlay.start_time},{overlay.end_time})",
                    )

                elif overlay.type == OverlayType.IMAGE:
                    # Image overlay
                    if os.path.exists(overlay.content):
                        img_input = ffmpeg.input(overlay.content, loop=1, t=duration)
                        width = int(overlay.width * video_width) if overlay.width else video_width // 4
                        height = int(overlay.height * video_height) if overlay.height else video_height // 4
                        
                        # Scale image
                        img_scaled = img_input.video.filter("scale", width, height)
                        
                        # Overlay image
                        current_stream = current_stream.overlay(
                            img_scaled,
                            x=int(overlay.x * video_width),
                            y=int(overlay.y * video_height),
                            enable=f"between(t,{overlay.start_time},{overlay.end_time})",
                        )

                elif overlay.type == OverlayType.VIDEO:
                    # Video overlay
                    if os.path.exists(overlay.content):
                        vid_input = ffmpeg.input(overlay.content)
                        width = int(overlay.width * video_width) if overlay.width else video_width // 4
                        height = int(overlay.height * video_height) if overlay.height else video_height // 4
                        
                        # Scale video
                        vid_scaled = vid_input.video.filter("scale", width, height)
                        
                        # Overlay video
                        current_stream = current_stream.overlay(
                            vid_scaled,
                            x=int(overlay.x * video_width),
                            y=int(overlay.y * video_height),
                            enable=f"between(t,{overlay.start_time},{overlay.end_time})",
                        )

            # Update progress
            if progress_callback:
                progress_callback(50.0)

            # Output video
            output = ffmpeg.output(
                current_stream,
                str(output_path),
                vcodec="libx264",
                acodec="copy",
                **{"movflags": "faststart"},
            )

            # Run ffmpeg
            ffmpeg.run(output, overwrite_output=True, quiet=True)

            if progress_callback:
                progress_callback(100.0)

            return output_path

        except Exception as e:
            raise Exception(f"Video processing failed: {str(e)}")

