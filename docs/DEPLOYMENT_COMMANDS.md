# Deployment Commands Guide

This guide provides commands to run the AudioBook Express server across different environments and platforms.

## 📋 Prerequisites

### Required Software

- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- **PostgreSQL** database
- **Git** (for version control)
- **bcryptjs** (for password encryption)
- **express-session** (for session management)

### Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Setup database (see [Prisma Setup Guide](./PRISMA_SETUP.md))
4. Configure environment variables

## 🔧 Environment Variables

Create appropriate `.env` files for each environment:

### Local Development (.env.local)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/audiobook_dev"
SESSION_SECRET="your-local-session-secret"
CLIENT_URL="http://localhost:3000"
```

### Development (.env.development)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://username:password@dev-db-host:5432/audiobook_dev"
SESSION_SECRET="your-dev-session-secret"
CLIENT_URL="https://dev-api.audiobook.com"
```

### Staging (.env.staging)

```env
NODE_ENV=staging
PORT=3000
DATABASE_URL="postgresql://username:password@staging-db-host:5432/audiobook_staging"
SESSION_SECRET="your-staging-session-secret"
CLIENT_URL="https://staging-api.audiobook.com"
```

### Test (.env.test)

```env
NODE_ENV=test
PORT=3001
DATABASE_URL="postgresql://username:password@test-db-host:5432/audiobook_test"
SESSION_SECRET="your-test-session-secret"
CLIENT_URL="http://localhost:3001"
```

### Production (.env.production)

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://username:password@prod-db-host:5432/audiobook_prod"
SESSION_SECRET="your-production-session-secret"
CLIENT_URL="https://api.audiobook.com"
```

## 🚀 Deployment Commands

### Windows (PowerShell/CMD)

#### Local Development

```powershell
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Start development server with hot reload
npm run dev

# Alternative: Start with specific environment
$env:NODE_ENV="development"; npm run dev
```

#### Development Environment

```powershell
# Build the application
npm run build

# Start development server
npm start

# With environment variable
$env:NODE_ENV="development"; npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

#### Staging Environment

```powershell
# Build for staging
npm run build

# Start staging server
$env:NODE_ENV="staging"; npm start

# Run staging tests
$env:NODE_ENV="test"; npm test

# Database operations for staging
$env:NODE_ENV="staging"; npm run db:migrate
$env:NODE_ENV="staging"; npm run db:seed
```

#### Test Environment

```powershell
# Run test suite
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Start test server
$env:NODE_ENV="test"; npm start
```

#### Production Environment

```powershell
# Build for production
npm run build

# Start production server
$env:NODE_ENV="production"; npm start

# Production with PM2 (if installed)
pm2 start dist/index.js --name "audiobook-api" --env production

# Production with PM2 ecosystem file
pm2 start ecosystem.config.js --env production

# Database operations for production
$env:NODE_ENV="production"; npm run db:migrate
```

### Linux/macOS (Bash/Zsh)

#### Local Development

```bash
# Install dependencies
npm install

# Setup database
npm run db:generate
npm run db:push
npm run db:seed

# Start development server with hot reload
npm run dev

# Alternative: Start with specific environment
NODE_ENV=development npm run dev
```

#### Development Environment

```bash
# Build the application
npm run build

# Start development server
npm start

# With environment variable
NODE_ENV=development npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

#### Staging Environment

```bash
# Build for staging
npm run build

# Start staging server
NODE_ENV=staging npm start

# Run staging tests
NODE_ENV=test npm test

# Database operations for staging
NODE_ENV=staging npm run db:migrate
NODE_ENV=staging npm run db:seed
```

#### Test Environment

```bash
# Run test suite
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Start test server
NODE_ENV=test npm start
```

#### Production Environment

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production npm start

# Production with PM2 (if installed)
pm2 start dist/index.js --name "audiobook-api" --env production

# Production with PM2 ecosystem file
pm2 start ecosystem.config.js --env production

# Database operations for production
NODE_ENV=production npm run db:migrate
```

## 🐳 Docker Deployment

### Docker Commands (Cross-platform)

#### Build Docker Image

```bash
# Build for development
docker build -t audiobook-api:dev --target development .

# Build for production
docker build -t audiobook-api:prod --target production .
```

#### Run Docker Container

```bash
# Development
docker run -p 3000:3000 --env-file .env.local audiobook-api:dev

# Staging
docker run -p 3000:3000 --env-file .env.staging audiobook-api:prod

# Production
docker run -p 3000:3000 --env-file .env.production audiobook-api:prod
```

#### Docker Compose

```bash
# Start all services (development)
docker-compose -f docker-compose.dev.yml up

# Start all services (production)
docker-compose -f docker-compose.prod.yml up

# Start in background
docker-compose up -d
```

## 🔄 Process Management

### PM2 Configuration (ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: "audiobook-api",
      script: "dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: "staging",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

### PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js

# Start specific environment
pm2 start ecosystem.config.js --env staging
pm2 start ecosystem.config.js --env production

# Monitor application
pm2 monit

# View logs
pm2 logs audiobook-api

# Restart application
pm2 restart audiobook-api

# Stop application
pm2 stop audiobook-api

# Delete application
pm2 delete audiobook-api
```

## 🗄️ Database Commands

### Prisma Commands (Cross-platform)

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset

# Seed database
npm run db:seed

# Open Prisma Studio
npm run db:studio
```

### Environment-specific Database Operations

```bash
# Development
NODE_ENV=development npm run db:migrate
NODE_ENV=development npm run db:seed

# Staging
NODE_ENV=staging npm run db:migrate
NODE_ENV=staging npm run db:seed

# Production
NODE_ENV=production npm run db:migrate
```

## 🔍 Monitoring & Debugging

### Health Check

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check API info
curl http://localhost:3000/
```

### Log Monitoring

```bash
# View application logs (PM2)
pm2 logs audiobook-api

# View logs with timestamps
pm2 logs audiobook-api --timestamp

# View error logs only
pm2 logs audiobook-api --err
```

### Performance Monitoring

```bash
# Monitor PM2 processes
pm2 monit

# Show process information
pm2 show audiobook-api

# Show process list
pm2 list
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000
kill -9 <PID>
```

#### Database Connection Issues

```bash
# Check database connection
npm run db:studio

# Reset database connection
npm run db:reset
npm run db:push
```

#### Build Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
npx tsc --build --clean
npm run build
```

## 📊 Environment-Specific Notes

### Local Development

- Uses hot reload with `nodemon`
- Connects to local PostgreSQL instance
- Enables detailed error logging
- Uses development database

### Development

- Mirrors production environment
- Uses development database
- Enables debugging features
- Runs comprehensive tests

### Staging

- Production-like environment
- Uses staging database
- Limited debugging features
- Runs integration tests

### Test

- Isolated test environment
- Uses test database
- Runs full test suite
- Enables test-specific logging

### Production

- Optimized for performance
- Uses production database
- Minimal logging
- Cluster mode with PM2
- SSL/HTTPS enabled
- Security headers enabled

## 🔐 Security Considerations

### Production Security

```bash
# Use strong session secrets
# Enable HTTPS
# Configure proper CORS
# Use environment variables for secrets
# Enable security headers
# Regular security updates
```

### Environment Variables Security

- Never commit `.env` files
- Use different secrets for each environment
- Rotate secrets regularly
- Use secure secret management tools

---

For detailed setup instructions, see the [Prisma Setup Guide](./PRISMA_SETUP.md) and [API Documentation](./API_DOCUMENTATION.md).

#### Express Routing Issues

```bash
# Error: Missing parameter name at index 1: *
# This occurs when using invalid wildcard patterns in Express routes

# Fix: Use proper catch-all middleware instead of '*'
# Instead of: app.use('*', handler)
# Use: app.use((req, res) => handler(req, res))
```
