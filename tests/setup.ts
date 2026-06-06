// Test setup file
// IMPORTANT: Set environment variables BEFORE any imports that depend on config

process.env['NODE_ENV'] = 'test';

process.env['PORT'] = '8081';
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_audiobook_service';
process.env['SESSION_SECRET'] = 'test-session-secret';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['RABBITMQ_URL'] = 'amqp://localhost:5672';
process.env['RABBITMQ_QUEUE_PREFIX'] = 'audiobook-test';
process.env['MAX_FILE_SIZE'] = '52428800';
process.env['UPLOAD_DIR'] = './uploads';
process.env['STORAGE_PROVIDER'] = 'local';
process.env['AWS_S3_BUCKET'] = '';
process.env['AWS_S3_REGION'] = 'us-east-1';
process.env['AWS_ACCESS_KEY_ID'] = '';
process.env['AWS_SECRET_ACCESS_KEY'] = '';
process.env['AWS_S3_ENDPOINT'] = '';
process.env['AWS_SIGNED_URL_EXPIRES_IN'] = '3600';
process.env['TRANSCODING_BITRATES'] = '[64, 128, 256]';
process.env['STREAMING_CACHE_TTL'] = '3600';
process.env['STREAMING_SERVICE_STORAGE_PATH'] = './test-storage';
process.env['STREAMING_SERVICE_URL'] = 'http://localhost:8083/api/v1/stream';
process.env['AUTH_SERVICE_URL'] = 'http://localhost:8080';
process.env['JWKS_ENDPOINT'] = 'http://localhost:8080/auth/.well-known/jwks.json';
process.env['LOG_LEVEL'] = 'error';
process.env['LOG_DIR'] = './logs';
process.env['NOMINATIM_BASE_URL'] = 'https://nominatim.openstreetmap.org';
process.env['NOMINATIM_USER_AGENT'] = 'AudioBookTest/1.0';
