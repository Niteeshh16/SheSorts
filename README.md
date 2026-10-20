# SheSorts Authentication Backend

A production-grade, modular Authentication API built with **Node.js**, **TypeScript**, **Express.js**, and **PostgreSQL** using native `pg` connection pooling.

Supports **Dual Authentication** (HTTP-only Cookies & `Authorization: Bearer` Tokens) for seamless integration with Web Apps (Next.js/React/Vue), Mobile Apps (React Native/Flutter), and API clients (Postman/Curl).

---

## 🚀 Features

- **User Registration**: Strong password validation, password hashing with `bcryptjs` (salt rounds: 12), and duplicate email conflict detection.
- **User Login**: Credential verification, generation of short-lived Access Tokens (15m) & long-lived Refresh Tokens (7d).
- **User Logout**: Secure revocation and deletion of refresh tokens from PostgreSQL and clearing of cookies.
- **Token Refresh & Rotation**: Replaces old refresh token with a new pair on every refresh to prevent replay attacks.
- **Protected Profile Route (`/api/auth/me`)**: Validates JWT from either HTTP-only cookie or `Authorization: Bearer <token>` header.
- **Database Connection Pooling**: Built with native `pg` pool, auto-reconnection, and automatic schema migration.
- **Security & Hardening**:
  - `helmet` for secure HTTP headers.
  - `cors` with origin restriction and credentials support.
  - `zod` for strict request payload validation with detailed field errors.
  - Hashed refresh tokens stored in database (SHA-256).
  - HTTP-only, SameSite cookies to protect against XSS and CSRF.

---

## 📁 Project Structure

```
├── src/
│   ├── config/
│   │   ├── db.ts               # PostgreSQL connection pool & health checker
│   │   └── env.ts              # Zod-validated environment variables
│   ├── controllers/
│   │   └── auth.controller.ts  # Register, login, logout, refresh, me handlers
│   ├── db/
│   │   ├── migrate.ts          # Automatic DB creation and migration runner
│   │   └── schema.sql          # PostgreSQL DDL table and index definitions
│   ├── middleware/
│   │   ├── auth.middleware.ts  # Dual JWT auth middleware (Bearer + Cookie)
│   │   ├── error.middleware.ts # Centralized error handler & custom AppError
│   │   └── validate.middleware.ts # Zod schema request validation middleware
│   ├── routes/
│   │   ├── auth.routes.ts      # Authentication endpoints router
│   │   └── index.ts            # Main API router & health check
│   ├── schemas/
│   │   └── auth.schema.ts      # Zod validation schemas for auth payloads
│   ├── services/
│   │   ├── token.service.ts    # JWT token signing, verification & DB storage
│   │   └── user.service.ts     # User database operations
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces & Express augmentation
│   ├── utils/
│   │   ├── cookies.ts          # Auth cookie setters & clear helpers
│   │   └── hash.ts             # Password hashing and token hash helpers
│   ├── app.ts                  # Express application configuration
│   ├── server.ts               # Server bootstrap & graceful shutdown
│   └── test-auth.ts            # Automated end-to-end integration test suite
├── docker-compose.yml          # Optional local PostgreSQL container
├── tsconfig.json               # TypeScript configuration
├── package.json
├── .env.example
└── .env
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** (v18+ recommended, v24 supported)
- **PostgreSQL** running locally OR via **Docker**

### 2. Database Setup (Optional via Docker)
If you do not have PostgreSQL running locally, launch it with:
```bash
docker compose up -d
```

### 3. Environment Configuration
Check or modify `.env` (a starter `.env` has already been generated):
```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shesorts_db
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=shesorts_db

JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_change_in_production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000
COOKIE_SECURE=false
```

### 4. Run Migrations
Creates the database if it doesn't exist, and initializes the `users` and `refresh_tokens` tables and indexes:
```bash
npm run db:migrate
```

### 5. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5000`.

### 6. Run Integration Tests
Run the comprehensive end-to-end automated test suite:
```bash
npm test
```

### 7. Production Build
```bash
npm run build
npm start
```

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

### 1. Health Check
- **Endpoint**: `GET /health`
- **Response** (`200 OK`):
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-20T14:20:53.107Z",
    "database": "connected"
  }
  ```

---

### 2. User Registration
- **Endpoint**: `POST /auth/register`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!",
    "name": "Jane Doe"
  }
  ```
- **Response** (`201 Created`):
  - Sets HTTP-only cookies: `accessToken` and `refreshToken`
  - Returns tokens in body:
  ```json
  {
    "status": "success",
    "message": "Account created successfully",
    "data": {
      "user": {
        "id": "83e929d8-be27-489a-a1e6-45e2d1fa52e1",
        "email": "jane@example.com",
        "name": "Jane Doe",
        "created_at": "2026-10-20T14:20:53.885Z",
        "updated_at": "2026-10-20T14:20:53.885Z"
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

---

### 3. User Login
- **Endpoint**: `POST /auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`):
  - Sets HTTP-only cookies: `accessToken` and `refreshToken`
  - Returns:
  ```json
  {
    "status": "success",
    "message": "Logged in successfully",
    "data": {
      "user": {
        "id": "83e929d8-be27-489a-a1e6-45e2d1fa52e1",
        "email": "jane@example.com",
        "name": "Jane Doe",
        "created_at": "2026-10-20T14:20:53.885Z",
        "updated_at": "2026-10-20T14:20:53.885Z"
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

---

### 4. Current User Profile (Protected)
- **Endpoint**: `GET /auth/me`
- **Authentication**: Either send `Authorization: Bearer <accessToken>` header OR send the `accessToken` HTTP-only cookie.
- **Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "data": {
      "user": {
        "id": "83e929d8-be27-489a-a1e6-45e2d1fa52e1",
        "email": "jane@example.com",
        "name": "Jane Doe",
        "created_at": "2026-10-20T14:20:53.885Z",
        "updated_at": "2026-10-20T14:20:53.885Z"
      }
    }
  }
  ```

---

### 5. Refresh Access Token
- **Endpoint**: `POST /auth/refresh`
- **Headers**: `Content-Type: application/json`
- **Body** (optional if `refreshToken` cookie is provided):
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "status": "success",
    "message": "Tokens refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

---

### 6. User Logout
- **Endpoint**: `POST /auth/logout`
- **Headers**: `Content-Type: application/json`
- **Body** (optional if `refreshToken` cookie is provided):
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response** (`200 OK`):
  - Clears `accessToken` and `refreshToken` cookies
  - Deletes token record from database
  ```json
  {
    "status": "success",
    "message": "Logged out successfully"
  }
  ```

---

## 🔒 Security Best Practices Implemented

1. **Password Hashing**: `bcryptjs` with salt round 12. Plaintext passwords are never logged or stored.
2. **Safe Serialization**: `password_hash` is explicitly excluded from user queries and response payloads.
3. **Token Revocation & Hashing**: Refresh tokens in the database are hashed with SHA-256 to protect against database leak scenarios.
4. **Token Rotation**: Each refresh request invalidates the previous refresh token and issues a fresh pair, preventing replay attacks.
5. **Dual Token Delivery**:
   - Web frontends use HTTP-only, `sameSite` cookies (immune to JavaScript XSS token theft).
   - Mobile and REST clients can use the Bearer token in the `Authorization` header.
6. **Graceful Shutdown**: Handles OS termination signals (`SIGINT`, `SIGTERM`) to cleanly finish in-flight HTTP requests and close PostgreSQL client pool connections.
