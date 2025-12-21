"""
Example script to test the video editor API.

Usage:
    python example_request.py
"""

import requests
import json
import time
import sys

API_BASE_URL = "http://localhost:8000"

def upload_video(video_path: str, overlays: list):
    """Upload video with overlays."""
    url = f"{API_BASE_URL}/upload"
    
    # Prepare form data
    files = {
        'video': open(video_path, 'rb')
    }
    
    data = {
        'overlays': json.dumps(overlays)
    }
    
    print(f"Uploading video: {video_path}")
    response = requests.post(url, files=files, data=data)
    files['video'].close()
    
    if response.status_code == 200:
        result = response.json()
        print(f"Upload successful! Job ID: {result['job_id']}")
        return result['job_id']
    else:
        print(f"Upload failed: {response.status_code}")
        print(response.text)
        return None

def check_status(job_id: str):
    """Check job status."""
    url = f"{API_BASE_URL}/status/{job_id}"
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Status check failed: {response.status_code}")
        return None

def download_video(job_id: str, output_path: str):
    """Download rendered video."""
    url = f"{API_BASE_URL}/result/{job_id}"
    response = requests.get(url, stream=True)
    
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Video downloaded to: {output_path}")
        return True
    else:
        print(f"Download failed: {response.status_code}")
        print(response.text)
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python example_request.py <video_path>")
        print("Example: python example_request.py test_video.mp4")
        sys.exit(1)
    
    video_path = sys.argv[1]
    
    # Example overlays
    overlays = [
        {
            "type": "text",
            "content": "Hello World",
            "x": 0.5,
            "y": 0.1,
            "start_time": 0,
            "end_time": 5,
            "font_size": 48,
            "color": "#FF0000"
        },
        {
            "type": "text",
            "content": "Video Editor Test",
            "x": 0.5,
            "y": 0.9,
            "start_time": 2,
            "end_time": 7,
            "font_size": 32,
            "color": "#FFFFFF"
        }
    ]
    
    # Upload video
    job_id = upload_video(video_path, overlays)
    if not job_id:
        sys.exit(1)
    
    # Poll for status
    print("\nPolling for job status...")
    while True:
        status = check_status(job_id)
        if not status:
            break
        
        print(f"Status: {status['status']}", end="")
        if status.get('progress') is not None:
            print(f" - Progress: {status['progress']:.1f}%", end="")
        print()
        
        if status['status'] == 'completed':
            break
        elif status['status'] == 'failed':
            print(f"Job failed: {status.get('error', 'Unknown error')}")
            sys.exit(1)
        
        time.sleep(2)
    
    # Download video
    output_path = f"rendered_{job_id}.mp4"
    print(f"\nDownloading rendered video...")
    if download_video(job_id, output_path):
        print(f"\n✅ Success! Rendered video saved to: {output_path}")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()


