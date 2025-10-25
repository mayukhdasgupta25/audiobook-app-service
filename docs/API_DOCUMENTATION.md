# AudioBook API Documentation

## Overview

The AudioBook API provides a comprehensive RESTful interface for managing audiobooks. Built with TypeScript, Express.js, and Prisma, following MVC and OOP patterns.

## Base URL

```
http://localhost:3000/api
```

## Interactive API Documentation (Swagger)

The AudioBook API includes comprehensive interactive documentation powered by Swagger/OpenAPI 3.0. This provides a user-friendly interface to explore, test, and understand all API endpoints.

### Accessing Swagger Documentation

**Swagger UI (Interactive Documentation):**

```
http://localhost:3000/api-docs
```

**OpenAPI Specification (JSON):**

```
http://localhost:3000/api-docs.json
```

### Features

- **Interactive Testing**: Try out API endpoints directly from the browser
- **Request/Response Examples**: See example requests and responses for each endpoint
- **Schema Validation**: Understand the exact structure of request and response data
- **Parameter Documentation**: Detailed information about query parameters, path parameters, and request bodies
- **Error Response Documentation**: Comprehensive error codes and response formats
- **Real-time API Testing**: Execute requests and see live responses

### Swagger UI Features

1. **Endpoint Explorer**: Browse all available endpoints organized by tags
2. **Try It Out**: Execute API calls directly from the documentation
3. **Request Builder**: Build requests with proper parameters and body content
4. **Response Viewer**: View formatted responses with status codes
5. **Schema Inspector**: Explore data models and their properties
6. **Authentication**: Ready for future JWT token integration

### Code-First Approach

The API documentation is generated using a **code-first approach**, meaning:

- Documentation is written directly in the source code using JSDoc comments
- The OpenAPI specification is automatically generated from TypeScript code
- Documentation stays synchronized with the actual implementation
- No separate documentation maintenance required

### Example Usage

1. **Navigate to Swagger UI**: Visit `http://localhost:3000/api-docs`
2. **Explore Endpoints**: Click on any endpoint to see its details
3. **Try It Out**: Click "Try it out" button to test the endpoint
4. **Fill Parameters**: Enter required parameters and request body
5. **Execute**: Click "Execute" to make the actual API call
6. **View Response**: See the response data, status code, and headers

### Quick Reference - Swagger Endpoints

| Endpoint          | Method | Description               | Swagger Path                         |
| ----------------- | ------ | ------------------------- | ------------------------------------ |
| Health Check      | GET    | API health status         | `/api/health`                        |
| List AudioBooks   | GET    | Get paginated audiobooks  | `/api/v1/audiobooks`                 |
| Get AudioBook     | GET    | Get audiobook by ID       | `/api/v1/audiobooks/{id}`            |
| Create AudioBook  | POST   | Create new audiobook      | `/api/v1/audiobooks`                 |
| Update AudioBook  | PUT    | Update existing audiobook | `/api/v1/audiobooks/{id}`            |
| Delete AudioBook  | DELETE | Delete audiobook          | `/api/v1/audiobooks/{id}`            |
| Search AudioBooks | GET    | Search audiobooks         | `/api/v1/audiobooks/search`          |
| Get by Genre      | GET    | Filter by genre           | `/api/v1/audiobooks/genre/{genre}`   |
| Get by Author     | GET    | Filter by author          | `/api/v1/audiobooks/author/{author}` |
| Get Statistics    | GET    | AudioBook statistics      | `/api/v1/audiobooks/stats`           |

## API Versioning

All endpoints are versioned using the `/v1` prefix:

```
/api/v1/audiobooks
```

## Authentication

Currently, the API does not require authentication. Future versions will implement JWT-based authentication.

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Success message",
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/audiobooks"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/audiobooks"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [ ... ],
  "message": "Success message",
  "statusCode": 200,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "path": "/api/v1/audiobooks",
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## Authentication

The API uses session-based authentication with encrypted passwords. **All audiobook endpoints now require authentication.** Users must sign up and log in to access any audiobook-related functionality.

### Authentication Requirements

- **Session Authentication**: Uses express-session cookies (`connect.sid`)
- **CSRF Protection**: Required for state-changing operations (POST, PUT, DELETE)
- **Rate Limiting**: Applied to authentication endpoints to prevent abuse
- **Password Encryption**: bcrypt with configurable salt rounds

### Public Endpoints (No Authentication Required)

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/status` - Check authentication status
- `GET /api/health` - Health check
- `GET /` - Root endpoint (API info)

### Protected Endpoints (Authentication Required)

**All audiobook endpoints now require authentication:**

- `GET /api/v1/audiobooks` - List audiobooks
- `GET /api/v1/audiobooks/search` - Search audiobooks
- `GET /api/v1/audiobooks/stats` - Get audiobook statistics
- `GET /api/v1/audiobooks/genre/:genre` - Get audiobooks by genre
- `GET /api/v1/audiobooks/author/:author` - Get audiobooks by author
- `GET /api/v1/audiobooks/:id` - Get audiobook by ID
- `POST /api/v1/audiobooks` - Create audiobook
- `PUT /api/v1/audiobooks/:id` - Update audiobook
- `DELETE /api/v1/audiobooks/:id` - Delete audiobook

**User management endpoints:**

- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/profile` - Update profile
- `PUT /api/v1/auth/change-password` - Change password
- `DELETE /api/v1/auth/account` - Delete account

**Admin-only endpoints:**

- `GET /api/v1/users` - List all users
- `GET /api/v1/users/:id` - Get user by ID

### Authentication Endpoints

#### User Signup

```http
POST /api/v1/auth/signup
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "User account created successfully",
  "statusCode": 201
}
```

#### User Login

```http
POST /api/v1/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe"
    },
    "sessionId": "session-id",
    "message": "Login successful"
  },
  "message": "Login successful",
  "statusCode": 200
}
```

#### User Logout

```http
POST /api/v1/auth/logout
```

**Headers:** Requires authentication

**Response:**

```json
{
  "success": true,
  "message": "Logout successful",
  "statusCode": 200
}
```

#### Get Current User Profile

```http
GET /api/v1/auth/me
```

**Headers:** Requires authentication

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe"
  },
  "message": "User profile retrieved successfully",
  "statusCode": 200
}
```

#### Update User Profile

```http
PUT /api/v1/auth/profile
```

**Headers:**

- Requires authentication
- `X-CSRF-Token`: CSRF token

**Request Body:**

```json
{
  "username": "newusername",
  "firstName": "Jane",
  "lastName": "Smith"
}
```

#### Change Password

```http
PUT /api/v1/auth/change-password
```

**Headers:**

- Requires authentication
- `X-CSRF-Token`: CSRF token

**Request Body:**

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

#### Delete User Account

```http
DELETE /api/v1/auth/account
```

**Headers:**

- Requires authentication
- `X-CSRF-Token`: CSRF token

**Response:**

```json
{
  "success": true,
  "message": "Account deleted successfully",
  "statusCode": 200
}
```

#### Check Authentication Status

```http
GET /api/v1/auth/status
```

**Response:**

```json
{
  "success": true,
  "data": {
    "isAuthenticated": true,
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "username": "username"
    },
    "sessionId": "session-id",
    "sessionCreatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Authentication status retrieved successfully",
  "statusCode": 200
}
```

### Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Session Management

- Sessions are created upon successful login
- Sessions are destroyed upon logout or account deletion
- Session cookies are automatically cleared on logout
- CSRF protection is enabled for state-changing operations

## Endpoints

### Health Check

```http
GET /api/health
```

Returns the health status of the API service.

### Get All AudioBooks

```http
GET /api/v1/audiobooks
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `sortBy` (optional): Sort field (title, author, createdAt, updatedAt, duration)
- `sortOrder` (optional): Sort direction (asc, desc)
- `genre` (optional): Filter by genre
- `language` (optional): Filter by language
- `author` (optional): Filter by author
- `narrator` (optional): Filter by narrator
- `isActive` (optional): Filter by active status (true/false)
- `isPublic` (optional): Filter by public status (true/false)
- `search` (optional): Search in title, author, narrator, description

**Example:**

```http
GET /api/v1/audiobooks?page=1&limit=20&genre=fiction&search=harry
```

### Get AudioBook by ID

```http
GET /api/v1/audiobooks/:id
```

**Parameters:**

- `id`: AudioBook ID (CUID format)

### Search AudioBooks

```http
GET /api/v1/audiobooks/search
```

**Query Parameters:**

- `q` (required): Search query
- `page` (optional): Page number
- `limit` (optional): Items per page

**Example:**

```http
GET /api/v1/audiobooks/search?q=fantasy&page=1&limit=10
```

### Get AudioBooks by Genre

```http
GET /api/v1/audiobooks/genre/:genre
```

**Parameters:**

- `genre`: Genre name

**Query Parameters:**

- `page` (optional): Page number
- `limit` (optional): Items per page

### Get AudioBooks by Author

```http
GET /api/v1/audiobooks/author/:author
```

**Parameters:**

- `author`: Author name (URL encoded)

**Query Parameters:**

- `page` (optional): Page number
- `limit` (optional): Items per page

### Get AudioBook Statistics

```http
GET /api/v1/audiobooks/stats
```

Returns statistics about audiobooks in the system.

### Create AudioBook

```http
POST /api/v1/audiobooks
```

**Request Body:**

```json
{
  "title": "AudioBook Title",
  "author": "Author Name",
  "narrator": "Narrator Name",
  "description": "AudioBook description",
  "duration": 3600,
  "fileSize": 52428800,
  "filePath": "/path/to/audio/file.mp3",
  "coverImage": "https://example.com/cover.jpg",
  "genre": "Fiction",
  "language": "en",
  "publisher": "Publisher Name",
  "publishDate": "2024-01-01T00:00:00.000Z",
  "isbn": "9781234567890",
  "isActive": true,
  "isPublic": true
}
```

### Update AudioBook

```http
PUT /api/v1/audiobooks/:id
```

**Parameters:**

- `id`: AudioBook ID (CUID format)

**Request Body:** Same as create, but all fields are optional.

### Delete AudioBook

```http
DELETE /api/v1/audiobooks/:id
```

**Parameters:**

- `id`: AudioBook ID (CUID format)

## Error Codes

| Status Code | Description           |
| ----------- | --------------------- |
| 200         | OK                    |
| 201         | Created               |
| 204         | No Content            |
| 400         | Bad Request           |
| 401         | Unauthorized          |
| 403         | Forbidden             |
| 404         | Not Found             |
| 409         | Conflict              |
| 422         | Unprocessable Entity  |
| 500         | Internal Server Error |

## Data Models

### AudioBook

```typescript
interface AudioBook {
  id: string;
  title: string;
  author: string;
  narrator?: string;
  description?: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  filePath: string;
  coverImage?: string;
  genre?: string;
  language: string;
  publisher?: string;
  publishDate?: Date;
  isbn?: string;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Rate Limiting

Currently, no rate limiting is implemented. Future versions will include rate limiting.

## CORS

CORS is configured to allow requests from the configured client URL.

## Security

- Helmet.js for security headers
- Input validation and sanitization
- SQL injection protection via Prisma
- XSS protection via input sanitization

## Testing

Run tests using:

```bash
npm run test
```

## Swagger Implementation Details

### Technology Stack

- **swagger-jsdoc**: Generates OpenAPI specification from JSDoc comments
- **swagger-ui-express**: Serves the interactive Swagger UI
- **OpenAPI 3.0**: Latest specification standard for API documentation

### Documentation Structure

- **Schemas**: Complete data models for AudioBook, requests, responses, and errors
- **Parameters**: Reusable parameter definitions for pagination, filtering, and path parameters
- **Responses**: Standardized response schemas for success, error, and paginated responses
- **Tags**: Organized endpoint grouping (AudioBooks, Health)

### Code Organization

```
src/
├── config/
│   └── swagger.ts          # Swagger configuration and setup
├── controllers/
│   └── AudioBookController.ts  # JSDoc comments for API endpoints
└── routes/
    └── ApiRouter.ts        # Health endpoint documentation
```

### Customization

The Swagger UI is customized with:

- Custom CSS styling (hidden topbar)
- Enhanced UI options (explorer, request duration, filtering)
- Persistent authorization for future JWT integration
- Custom site title and branding

## Development

### Start Development Server

```bash
npm run dev
```

This will start the server with Swagger documentation available at:

- **API**: `http://localhost:3000/api`
- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`

### Build for Production

```bash
npm run build
npm start
```

### View Swagger Documentation

After starting the development server, you can:

1. Open `http://localhost:3000/api-docs` in your browser
2. Explore all available endpoints
3. Test API calls directly from the interface
4. Download the OpenAPI specification for external tools
