# Audiobook Player Implementation

This document describes the implementation of the audiobook player functionality for the AudioBook backend project.

## Features Implemented

### 1. Play / Pause / Seek Controls

- **Real-time playback control** with session management
- **Seek functionality** to jump to specific positions in audiobooks or chapters
- **Playback state persistence** across sessions
- **Position tracking** with automatic progress updates

### 2. Playback Speed Control

- **Multiple speed options**: 0.5x, 0.75x, 1.0x, 1.25x, 1.5x, 1.75x, 2.0x
- **Real-time speed changes** without interrupting playback
- **Speed preference persistence** per session

### 3. Bookmarks & Notes

- **Bookmark creation** at specific positions in audiobooks or chapters
- **Note-taking functionality** with rich text support
- **Search and filtering** capabilities for bookmarks and notes
- **Position-based organization** for easy navigation

### 4. Chapter Navigation

- **Chapter-based navigation** with automatic progress tracking
- **Previous/Next chapter** navigation
- **Chapter-specific progress** tracking
- **Chapter completion status** management

### 5. Offline Listening

- **Background download processing** using Bull queues
- **Download progress tracking** with real-time updates
- **Download management** (cancel, retry, delete)
- **Offline availability** configuration per audiobook

## Architecture Overview

### Database Schema Updates

#### New Models Added:

- **Chapter**: Individual chapters within audiobooks
- **ChapterProgress**: User progress tracking per chapter
- **Bookmark**: User bookmarks for audiobooks/chapters
- **Note**: User notes for audiobooks/chapters
- **OfflineDownload**: Download tracking and management

#### Updated Models:

- **AudioBook**: Added `isOfflineAvailable` and `overallProgress` fields
- **User**: Added relations to new models

### Service Layer

#### ChapterService

- CRUD operations for chapters
- Progress tracking and calculation
- Chapter navigation logic
- Audiobook progress aggregation

#### PlaybackService

- Real-time playback session management
- Playback control handling
- Position and speed management
- Session cleanup and statistics

#### BookmarkService

- Bookmark and note management
- Search and filtering capabilities
- Statistics and analytics

#### OfflineDownloadService

- Download request processing
- Progress tracking and management
- Queue management and statistics

#### BackgroundJobService

- Progress calculation jobs
- Download processing jobs
- Cleanup and maintenance jobs

### API Endpoints

#### Chapter Management

```
GET    /api/v1/audiobooks/:audiobookId/chapters
GET    /api/v1/chapters/:id
POST   /api/v1/chapters
PUT    /api/v1/chapters/:id
DELETE /api/v1/chapters/:id
GET    /api/v1/chapters/:id/progress
PUT    /api/v1/chapters/:id/progress
GET    /api/v1/chapters/:id/with-progress
GET    /api/v1/chapters/:id/navigation
```

#### Playback Control

```
POST   /api/v1/playback/session
POST   /api/v1/playback/control
POST   /api/v1/playback/seek
POST   /api/v1/playback/speed
POST   /api/v1/playback/volume
POST   /api/v1/playback/navigate
GET    /api/v1/playback/stats
POST   /api/v1/playback/sessions/cleanup
```

#### Bookmarks & Notes

```
POST   /api/v1/bookmarks
GET    /api/v1/bookmarks
GET    /api/v1/bookmarks/:id
PUT    /api/v1/bookmarks/:id
DELETE /api/v1/bookmarks/:id
POST   /api/v1/notes
GET    /api/v1/notes
GET    /api/v1/notes/:id
PUT    /api/v1/notes/:id
DELETE /api/v1/notes/:id
GET    /api/v1/bookmarks-notes
GET    /api/v1/bookmarks-notes/stats
```

#### Offline Downloads

```
POST   /api/v1/downloads
GET    /api/v1/downloads
GET    /api/v1/downloads/:id/progress
POST   /api/v1/downloads/:id/cancel
POST   /api/v1/downloads/:id/retry
DELETE /api/v1/downloads/:id
GET    /api/v1/downloads/queue/status
GET    /api/v1/downloads/stats
PUT    /api/v1/audiobooks/:audiobookId/offline-availability
```

## Background Job Processing

### Bull Queue Configuration

- **Redis-based** queue management
- **Automatic retry** logic with exponential backoff
- **Job prioritization** and scheduling
- **Queue monitoring** and statistics

### Job Types

1. **Progress Calculation**: Updates audiobook overall progress based on chapter progress
2. **Offline Downloads**: Processes audiobook downloads in background
3. **Cleanup Jobs**: Removes inactive sessions, expired downloads, and old data

### Scheduled Jobs

- Progress calculation every 5 minutes
- Session cleanup every 6 hours
- Download cleanup daily at 2 AM
- Progress data cleanup weekly on Sunday at 3 AM

## Real-time Features

### Playback Sessions

- **In-memory session management** for real-time controls
- **Automatic session cleanup** for inactive sessions
- **Session persistence** across page refreshes
- **Multi-device session** support

### Progress Tracking

- **Real-time position updates** during playback
- **Chapter completion** detection
- **Audiobook progress** aggregation
- **Background progress** calculation

## Security & Authentication

### Authentication Requirements

- **All player endpoints** require user authentication
- **CSRF protection** for state-changing operations
- **User-specific data** isolation
- **Admin-only** endpoints for system management

### Data Validation

- **Input validation** for all API endpoints
- **Position bounds** checking
- **File size validation** for downloads
- **Speed range** validation

## Testing

### Test Coverage

- **Unit tests** for all service classes
- **Integration tests** for API endpoints
- **Mock implementations** for external dependencies
- **Error handling** test scenarios

### Test Files

- `src/tests/chapter.test.ts` - Chapter service tests
- `src/tests/playback.test.ts` - Playback service tests
- `src/tests/player-integration.test.ts` - API integration tests

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# Queue Configuration
REDIS_RETRY_DELAY=100
REDIS_MAX_RETRIES=3
REDIS_LAZY_CONNECT=true
```

### Dependencies Added

- `bull` - Background job processing
- `redis` - Redis client for queues
- `ioredis` - Advanced Redis client
- `multer` - File upload handling
- `@types/multer` - TypeScript types for multer

## Usage Examples

### Initialize Playback Session

```typescript
const session = await playbackService.initializePlaybackSession(
  userId,
  audiobookId,
  chapterId
);
```

### Control Playback

```typescript
const playbackState = await playbackService.handlePlaybackControl(userId, {
  audiobookId: "audiobook-1",
  action: "play",
});
```

### Create Bookmark

```typescript
const bookmark = await bookmarkService.createBookmark(userId, {
  audiobookId: "audiobook-1",
  title: "Important Scene",
  position: 1200,
});
```

### Request Offline Download

```typescript
const download = await offlineDownloadService.requestDownload(userId, {
  audiobookId: "audiobook-1",
  quality: "high",
});
```

## Performance Considerations

### Database Optimization

- **Indexed queries** for chapter and progress lookups
- **Efficient pagination** for large result sets
- **Batch operations** for progress updates
- **Connection pooling** for high concurrency

### Caching Strategy

- **Redis caching** for session data
- **In-memory caching** for active sessions
- **Query result caching** for frequently accessed data
- **Cache invalidation** on data updates

### Background Processing

- **Queue-based processing** for heavy operations
- **Job prioritization** for critical tasks
- **Resource management** for download processing
- **Error handling** and retry mechanisms

## Monitoring & Analytics

### Queue Monitoring

- **Job count tracking** per queue
- **Processing time** metrics
- **Error rate** monitoring
- **Queue health** status

### User Analytics

- **Playback statistics** per user
- **Chapter completion** rates
- **Bookmark usage** patterns
- **Download preferences**

### System Metrics

- **Active session** counts
- **Memory usage** tracking
- **Database performance** metrics
- **API response times**

## Future Enhancements

### Planned Features

- **Real-time synchronization** across devices
- **Advanced analytics** and reporting
- **Social features** (sharing, comments)
- **AI-powered recommendations**

### Technical Improvements

- **WebSocket support** for real-time updates
- **GraphQL API** for flexible queries
- **Microservices architecture** migration
- **Container orchestration** with Kubernetes

## Troubleshooting

### Common Issues

1. **Session not found**: Ensure user is authenticated and session is initialized
2. **Position validation errors**: Check that position is within chapter duration
3. **Download failures**: Verify audiobook is available for offline download
4. **Queue processing delays**: Check Redis connection and queue health

### Debug Tools

- **Queue statistics** endpoint for monitoring
- **Session cleanup** endpoint for maintenance
- **Redis info** endpoint for connection status
- **Comprehensive logging** for error tracking
