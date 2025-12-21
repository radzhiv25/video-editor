# Video Editor - Full Stack Assignment

A full-stack video editor application built with React Native + Expo (frontend) and FastAPI + ffmpeg (backend). Users can upload videos, add overlays (text, images, video clips), and get the final rendered video back from the backend.

## Project Structure

```
video-editor/
├── frontend/          # React Native + Expo application
├── backend/           # FastAPI + ffmpeg server
└── docker-compose.yml # Docker orchestration
```

## Prerequisites

- Node.js (v18 or higher)
- Python (v3.11 or higher)
- ffmpeg (must be installed on your system)
- Docker (optional, for containerized deployment)

### Installing ffmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH.

## Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create necessary directories:
```bash
mkdir -p uploads outputs temp
```

5. Run the server:
```bash
python main.py
```

The backend will be available at `http://localhost:8000`

### Backend API Endpoints

- `POST /upload` - Upload video file and overlay metadata
  - Request: multipart/form-data with `video` (file) and `overlays` (JSON string)
  - Response: `{ "job_id": "uuid", "message": "..." }`

- `GET /status/{job_id}` - Get processing status
  - Response: `{ "job_id": "uuid", "status": "pending|processing|completed|failed", "progress": 0-100, "error": null }`

- `GET /result/{job_id}` - Download rendered video
  - Response: Video file (MP4)

### Example Request

```bash
curl -X POST "http://localhost:8000/upload" \
  -F "video=@/path/to/video.mp4" \
  -F 'overlays=[{"type":"text","content":"Hello World","x":0.5,"y":0.5,"start_time":0,"end_time":5,"font_size":24,"color":"#FFFFFF"}]'
```

## Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. **Important for Expo Go on physical devices**: Update the API URL in `services/api.ts`:
   - For iOS Simulator/Android Emulator: Keep `http://localhost:8000`
   - For physical device: Replace `localhost` with your computer's IP address
   - Find your IP: macOS/Linux: `ifconfig | grep "inet "`, Windows: `ipconfig`
   - Example: `"http://192.168.1.100:8000"`

4. Start the Expo development server:
```bash
npm start
```

5. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

### Frontend Features

- Video selection from device storage
- Add text overlays with customizable position, timing, font size, and color
- Add image overlays with position, timing, and size controls
- Add video clip overlays
- Drag and drop positioning of overlays on video preview
- Real-time preview of video with overlays
- Submit video for backend processing
- Poll job status and download final rendered video

## Docker Setup (Optional)

### Using Docker Compose

1. Build and start all services:
```bash
docker-compose up --build
```

2. Backend will be available at `http://localhost:8000`
3. Frontend Expo server will be available on ports 19000-19002

### Individual Docker Containers

**Backend:**
```bash
cd backend
docker build -t video-editor-backend .
docker run -p 8000:8000 -v $(pwd)/uploads:/app/uploads -v $(pwd)/outputs:/app/outputs video-editor-backend
```

**Frontend:**
```bash
cd frontend
docker build -t video-editor-frontend .
docker run -p 19000:19000 -p 19001:19001 -p 19002:19002 video-editor-frontend
```

## Usage Flow

1. **Upload Video**: Select a video from your device storage
2. **Add Overlays**: 
   - Click "Add Text" to add text overlays
   - Click "Add Image" to add image overlays
   - Click "Add Video" to add video clip overlays
3. **Position Overlays**: Drag overlays on the video preview to position them
4. **Configure Timing**: Select an overlay to edit its start_time and end_time
5. **Submit**: Click "Submit for Processing" to send video and overlays to backend
6. **Monitor Progress**: The app will poll the backend for processing status
7. **Download**: Once processing is complete, the video will be automatically downloaded

## Overlay Metadata Format

Each overlay should include:
- `type`: "text" | "image" | "video"
- `content`: Text content (for text), file path/URI (for image/video)
- `x`: X position (0-1 normalized, where 0 is left, 1 is right)
- `y`: Y position (0-1 normalized, where 0 is top, 1 is bottom)
- `start_time`: Start time in seconds
- `end_time`: End time in seconds
- `width`: Optional width (0-1 normalized) for image/video overlays
- `height`: Optional height (0-1 normalized) for image/video overlays
- `font_size`: Optional font size for text overlays
- `color`: Optional color (hex format) for text overlays

## Example Overlays JSON

```json
[
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
    "type": "image",
    "content": "/path/to/image.png",
    "x": 0.3,
    "y": 0.5,
    "start_time": 2,
    "end_time": 8,
    "width": 0.2,
    "height": 0.2
  }
]
```

## Troubleshooting

### Backend Issues

- **ffmpeg not found**: Make sure ffmpeg is installed and available in PATH
- **Port 8000 already in use**: Change the port in `main.py` or stop the conflicting service
- **Permission errors**: Ensure uploads/, outputs/, and temp/ directories are writable

### Frontend Issues

- **Cannot connect to backend**: 
  - Check that backend is running on `http://localhost:8000`
  - For physical devices, use your computer's IP address instead of localhost
  - Update `API_BASE_URL` in `frontend/services/api.ts`
- **Video not playing**: Ensure you have proper video codec support
- **Overlays not appearing**: Check that overlay positions are within video bounds (0-1 range)

### Docker Issues

- **Volume mounting errors**: Ensure paths exist and have proper permissions
- **Port conflicts**: Modify ports in `docker-compose.yml` if needed

## Development Notes

- Backend uses in-memory job storage. For production, consider using Redis or a database
- Video processing is done asynchronously using FastAPI BackgroundTasks
- Progress tracking is implemented but may not be 100% accurate for all video types
- Large video files may take significant time to process

## Testing

### Test Backend API

```bash
# Upload a video
curl -X POST "http://localhost:8000/upload" \
  -F "video=@test_video.mp4" \
  -F 'overlays=[{"type":"text","content":"Test","x":0.5,"y":0.5,"start_time":0,"end_time":5}]'

# Check status (replace JOB_ID with actual job_id from upload response)
curl "http://localhost:8000/status/JOB_ID"

# Download result (replace JOB_ID)
curl "http://localhost:8000/result/JOB_ID" --output rendered_video.mp4
```

## License

This project is created for the buttercut.ai full-stack assignment.

