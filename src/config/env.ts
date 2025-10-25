import dotenv from "dotenv";
import path from "path";

const nodeEnv = process.env['NODE_ENV'] || 'development';
const envFile = `.env${nodeEnv !== 'development' ? `.${nodeEnv}` : ''}`;
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Load .env.local for local overrides (highest priority)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });


export const config = {
   NODE_ENV: nodeEnv,
   PORT: parseInt(process.env['PORT'] || '8081', 10),
   DATABASE_URL: process.env['DATABASE_URL'] || '',
   JWT_SECRET: process.env['JWT_SECRET'] || '',
   SESSION_SECRET: process.env['SESSION_SECRET'] || '',
   CLIENT_URL: process.env['CLIENT_URL'] || 'http://localhost:3000',

   // Database configuration
   DB_HOST: process.env['DB_HOST'] || 'localhost',
   DB_PORT: parseInt(process.env['DB_PORT'] || '5432', 10),
   DB_NAME: process.env['DB_NAME'] || 'audiobook_dev',
   DB_USER: process.env['DB_USER'] || 'postgres',
   DB_PASSWORD: process.env['DB_PASSWORD'] || '',

   // File upload settings
   MAX_FILE_SIZE: parseInt(process.env['MAX_FILE_SIZE'] || '52428800', 10), // 50MB default
   UPLOAD_DIR: process.env['UPLOAD_DIR'] || './uploads',

   // Development upload paths
   DEV_UPLOAD_DIR: nodeEnv === 'development' ? './src/uploads' : './uploads',
   DEV_IMAGE_DIR: nodeEnv === 'development' ? './src/uploads/images' : './uploads/images',
   DEV_AUDIO_DIR: nodeEnv === 'development' ? './src/uploads/audio' : './uploads/audio',

   // Security settings
   BCRYPT_ROUNDS: parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10),
   JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] || '7d',

   // Feature flags
   ENABLE_REGISTRATION: process.env['ENABLE_REGISTRATION'] === 'true',
   ENABLE_PASSWORD_RESET: process.env['ENABLE_PASSWORD_RESET'] === 'true',

   // Streaming service configuration
   STREAMING_PORT: parseInt(process.env['STREAMING_PORT'] || '3001', 10),
   HLS_SEGMENT_DURATION: parseInt(process.env['HLS_SEGMENT_DURATION'] || '10', 10), // seconds
   TRANSCODING_BITRATES: process.env['TRANSCODING_BITRATES']?.split(',').map(b => parseInt(b, 10)) || [64, 128, 256], // kbps
   STREAMING_CACHE_TTL: parseInt(process.env['STREAMING_CACHE_TTL'] || '3600', 10), // seconds

   // RabbitMQ configuration
   RABBITMQ_URL: process.env['RABBITMQ_URL'] || 'amqp://localhost:5672',
   RABBITMQ_QUEUE_PREFIX: process.env['RABBITMQ_QUEUE_PREFIX'] || 'audiobook',

   // AWS S3 configuration
   AWS_S3_BUCKET: process.env['AWS_S3_BUCKET'] || '',
   AWS_S3_REGION: process.env['AWS_S3_REGION'] || 'us-east-1',
   AWS_ACCESS_KEY_ID: process.env['AWS_ACCESS_KEY_ID'] || '',
   AWS_SECRET_ACCESS_KEY: process.env['AWS_SECRET_ACCESS_KEY'] || '',
   AWS_S3_ENDPOINT: process.env['AWS_S3_ENDPOINT'] || '', // For S3-compatible services



   // Storage provider selection
   STORAGE_PROVIDER: process.env['STORAGE_PROVIDER'] || 'local', // local, s3

   // Streaming service storage path for development
   STREAMING_SERVICE_STORAGE_PATH: process.env['STREAMING_SERVICE_STORAGE_PATH'] || 'C:\\Users\\mayuk\\Desktop\\Projects\\AudioBook\\backend\\streaming-service\\storage',

   // External streaming service URL
   STREAMING_SERVICE_URL: process.env['STREAMING_SERVICE_URL'] || 'http://localhost:8081/api/v1/stream',
};