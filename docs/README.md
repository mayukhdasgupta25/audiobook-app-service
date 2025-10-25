# AudioBook API Documentation

Welcome to the AudioBook API documentation. This folder contains comprehensive documentation for the AudioBook backend API service.

## 📚 Documentation Files

### [API Documentation](./API_DOCUMENTATION.md)

Complete API reference documentation including:

- Endpoint specifications
- Request/response formats
- Authentication details
- Error codes and handling
- Data models and examples

### [Deployment Commands](./DEPLOYMENT_COMMANDS.md)

Comprehensive deployment guide for all environments:

- Local, Development, Staging, Test, and Production setup
- Windows and Linux/macOS commands
- Docker deployment instructions
- PM2 process management
- Database operations
- Monitoring and troubleshooting

### [Message Management](./MESSAGE_MANAGEMENT.md)

Centralized message management system documentation:

- Message handling architecture
- Usage examples and best practices
- Template variable support
- Internationalization readiness
- Development features

### [Prisma Setup](./PRISMA_SETUP.md)

Database setup and configuration guide:

- Prisma schema configuration
- Database migration instructions
- Seed data setup
- Development environment setup

## 🚀 Quick Start

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Setup Database**

   - Follow the [Prisma Setup Guide](./PRISMA_SETUP.md)
   - Run database migrations
   - Seed initial data

3. **Start Development Server**

   ```bash
   npm run dev
   ```

4. **API Endpoints**
   - Health Check: `GET /api/health`
   - AudioBooks: `GET /api/v1/audiobooks`
   - API Info: `GET /`

## 🏗️ Architecture Overview

The AudioBook API follows a robust architecture pattern:

- **MVC Pattern**: Model-View-Controller separation
- **OOP Principles**: Object-oriented design with classes and interfaces
- **Modular Design**: Reusable components and services
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Comprehensive error management
- **Validation**: Input validation and sanitization
- **Message Management**: Centralized response messages

## 📁 Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers (MVC Controllers)
├── middleware/       # Express middleware
├── models/          # Data transfer objects
├── routes/          # API routing
├── services/        # Business logic layer
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── tests/           # Test files
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Database Commands

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:reset` - Reset database
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

## 🌐 API Features

- **RESTful Design**: Standard HTTP methods and status codes
- **API Versioning**: Structured versioning with `/v1/` prefix
- **Pagination**: Built-in pagination support
- **Filtering**: Advanced filtering capabilities
- **Search**: Full-text search functionality
- **Validation**: Comprehensive input validation
- **Error Handling**: Detailed error responses
- **Type Safety**: Full TypeScript implementation

## 📝 Contributing

When contributing to this project:

1. Follow the established MVC and OOP patterns
2. Use TypeScript with strict type checking
3. Write comprehensive tests
4. Update documentation as needed
5. Follow the centralized message management system
6. Ensure all linting rules pass

## 🔒 Security

- Input validation and sanitization
- SQL injection protection via Prisma
- XSS protection
- Helmet.js security headers
- CORS configuration
- Session management

## 📊 Monitoring

- Health check endpoint for service monitoring
- Comprehensive error logging
- Request/response tracking
- Performance metrics ready

---

For detailed information about specific features, please refer to the individual documentation files listed above.
