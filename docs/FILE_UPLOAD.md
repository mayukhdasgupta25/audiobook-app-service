# File Upload Configuration

This document describes the file upload system implemented for the AudioBook backend.

## Overview

The file upload system is integrated directly into the AudioBook creation and update process. Audio files and cover images are uploaded as part of the AudioBook CRUD operations.

## Directory Structure

### Development Environment

```
src/
├── uploads/
│   ├── images/          # Cover image files (JPEG, PNG, GIF, WebP)
│   └── audio/           # Audio files (MP3, WAV, OGG, M4A, AAC, FLAC)
```

### Production Environment

```
uploads/
├── images/              # Cover image files
└── audio/               # Audio files
```

## Configuration

### Environment Variables

- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 50MB for images, 500MB for audio)
- `UPLOAD_DIR`: Base upload directory (default: `./uploads`)
- `NODE_ENV`: Environment mode (development/production)

### Development-Specific Settings

- Files are stored in `src/uploads/` during development
- Static file serving is enabled at `/uploads` endpoint
- Automatic directory creation on startup

## API Endpoints

### AudioBook Creation with File Upload

- `POST /api/v1/audiobooks` - Create audiobook with optional audio file and cover image

### AudioBook Update with File Upload

- `PUT /api/v1/audiobooks/{id}` - Update audiobook with optional audio file and cover image

## File Types Supported

### Images (Cover Images)

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### Audio (AudioBook Files)

- MP3 (.mp3)
- WAV (.wav)
- OGG (.ogg)
- M4A (.m4a)
- AAC (.aac)
- FLAC (.flac)

## Security Features

- File type validation
- File size limits
- Unique filename generation
- Authentication required
- CSRF protection
- Error handling for invalid files

## Usage Examples

### Create AudioBook with Files

```bash
curl -X POST http://localhost:3000/api/v1/audiobooks \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -F "title=My AudioBook" \
  -F "author=Author Name" \
  -F "description=Book description" \
  -F "audio=@audiobook.mp3" \
  -F "coverImage=@cover.jpg"
```

### Update AudioBook with New Cover Image

```bash
curl -X PUT http://localhost:3000/api/v1/audiobooks/{id} \
  -H "Authorization: Bearer <token>" \
  -H "X-CSRF-Token: <csrf-token>" \
  -F "coverImage=@new-cover.jpg"
```

## Response Format

```json
{
  "success": true,
  "data": {
    "id": "audiobook-id",
    "title": "My AudioBook",
    "author": "Author Name",
    "filePath": "/uploads/audio/audio-1234567890-123456789.mp3",
    "coverImage": "/uploads/images/image-1234567890-123456789.jpg",
    "fileSize": 52428800,
    "duration": 3600,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Audiobook created successfully",
  "statusCode": 201,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/audiobooks"
}
```

## File Handling

### Audio Files

- Field name: `audio`
- Stored in: `src/uploads/audio/` (development) or `uploads/audio/` (production)
- Database field: `filePath` and `fileSize`
- Required for audiobook creation

### Cover Images

- Field name: `coverImage`
- Stored in: `src/uploads/images/` (development) or `uploads/images/` (production)
- Database field: `coverImage`
- Optional for audiobook creation/update

## Error Handling

The system provides detailed error messages for:

- File too large
- Invalid file type
- Upload failures
- Authentication errors
- Validation errors

## Static File Serving

In development mode, uploaded files are served statically at:

- Images: `http://localhost:3000/uploads/images/<filename>`
- Audio: `http://localhost:3000/uploads/audio/<filename>`

## Database Integration

- File paths are automatically stored in the database
- File sizes are calculated and stored
- Original filenames are preserved in the upload process
- Files are organized by type in separate directories
