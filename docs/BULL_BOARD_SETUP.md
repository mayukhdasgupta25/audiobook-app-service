# Bull Board Setup Guide

## Overview

Bull Board provides a web-based UI for monitoring and managing Bull queues. This setup includes authentication, queue management, and real-time monitoring capabilities.

## Installation

### 1. Install Dependencies

```bash
npm install bull-board@^4.15.0
```

### 2. Run Database Migration

```bash
npm run db:migrate
```

### 3. Start Redis Server

Make sure Redis is running on your system:

```bash
# Using Docker
docker run -d --name redis -p 6379:6379 redis:alpine

# Or using system service
redis-server
```

## Usage

### 1. Start the Server

```bash
npm run dev
```

### 2. Access Bull Board UI

Navigate to: `http://localhost:3000/admin/queues`

**Note**: Bull Board is publicly accessible - no authentication required.

### 4. Available Endpoints

| Endpoint                          | Method | Description      | Auth Required |
| --------------------------------- | ------ | ---------------- | ------------- |
| `/admin/queues`                   | GET    | Bull Board UI    | None          |
| `/admin/queues/stats`             | GET    | Queue statistics | None          |
| `/admin/queues/:queueName/pause`  | POST   | Pause queue      | None          |
| `/admin/queues/:queueName/resume` | POST   | Resume queue     | None          |
| `/admin/queues/:queueName/clean`  | POST   | Clean queue      | None          |
| `/admin/queues/:queueName/empty`  | POST   | Empty queue      | None          |

## Features

### Queue Monitoring

- **Real-time Status**: View queue status (waiting, active, completed, failed)
- **Job Details**: Inspect individual jobs and their data
- **Progress Tracking**: Monitor job progress in real-time
- **Error Logs**: View detailed error information for failed jobs

### Queue Management

- **Pause/Resume**: Control queue processing
- **Clean Jobs**: Remove completed or failed jobs
- **Empty Queue**: Clear all jobs from a queue
- **Retry Jobs**: Retry failed jobs

### Available Queues

1. **progress-calculation**: Handles audiobook progress calculations
2. **offline-download**: Manages offline download jobs
3. **cleanup**: Handles cleanup and maintenance tasks

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Session Configuration
SESSION_SECRET=your-secret-key
```

### Configuration Notes

Bull Board is now configured for public access. No authentication is required to view or manage queues.

## API Examples

### Get Queue Statistics

```bash
curl -X GET "http://localhost:3000/admin/queues/stats"
```

### Pause a Queue

```bash
curl -X POST "http://localhost:3000/admin/queues/progress-calculation/pause"
```

### Clean Completed Jobs

```bash
curl -X POST "http://localhost:3000/admin/queues/progress-calculation/clean?type=completed"
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**

   - Verify Redis server is running
   - Check Redis connection settings

2. **Queues Not Showing**
   - Ensure queues are initialized in `src/index.ts`
   - Check queue creation logs

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=bull*
```

## Security Considerations

⚠️ **Important**: Bull Board is now publicly accessible without authentication. Consider the following:

1. **Public Access**: Anyone can view and manage your queues
2. **Queue Management**: Users can pause, resume, clean, and empty queues
3. **Production Warning**: This setup is suitable for development only

### Production Recommendations

For production environments, consider:

1. **Network Security**: Restrict access using firewall rules
2. **VPN Access**: Only allow access through VPN
3. **IP Whitelisting**: Restrict access to specific IP addresses
4. **Re-enable Authentication**: Add back admin authentication for production

## Production Deployment

1. **Environment Variables**: Set secure session secrets
2. **Redis Security**: Use Redis AUTH and secure connections
3. **HTTPS**: Enable HTTPS in production
4. **Security**: Implement proper access controls (see Security Considerations above)
5. **Monitoring**: Set up proper monitoring and alerting

## Integration with Existing Queues

The Bull Board automatically detects and monitors all queues created through the `QueueManager`:

```typescript
// Queues are automatically added to Bull Board
const progressQueue = queueManager.createProgressQueue();
const downloadQueue = queueManager.createDownloadQueue();
const cleanupQueue = queueManager.createCleanupQueue();
```

## Customization

### Adding Custom Queues

```typescript
// Create custom queue
const customQueue = queueManager.createQueue("custom-queue");

// Add to Bull Board
bullBoardConfig.addQueue(customQueue);
```
