# Secure Team Workspace

A small, secure full-stack workspace for portfolio teams. It includes authentication, organizations, roles, projects, tasks, and audit logs with permission enforcement on the backend.

## Stack

- React + TypeScript + Vite
- Node.js + Express + TypeScript
- PostgreSQL-ready schema, with in-memory fixtures for local dev/testing
- JWT-based auth with role checks
- Vitest API tests

## Features

- User registration and login
- Organization membership management
- Admin/member roles
- Project creation
- Task creation
- Audit logs
- Protected API routes and auth middleware
- Responsive, accessible UI

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 14+ (optional for full schema, but required for production-ready database mode)

## Setup

1. Open a terminal in the project root.
2. Copy the example environment file:

   copy .env.example .env

3. Update `.env` values if needed.

   Example:

   PORT=4000
   JWT_SECRET=change_me_to_a_long_random_secret
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/teamworkspace
   CLIENT_URL=http://localhost:5173

4. Install dependencies:

   npm install

5. Start PostgreSQL locally and create the database:

   createdb teamworkspace

6. Start the server:

   npm run dev --workspace server

7. Start the frontend in a second terminal:

   npm run dev --workspace client

8. Open the app at http://localhost:5173

9. Demo login credentials:

   - Admin: admin@demo.com / admin123
   - Member: member@demo.com / member123

## Database note

This version is designed to work with a PostgreSQL connection string, while the in-memory store is used by default for tests and quick local runs. The server is structured so you can later swap in a real database-backed implementation without changing the public API.

## Testing

Run the backend tests:

npm test

## Security decisions

- JWTs are used for authenticated sessions.
- Authorization headers are validated on every protected route.
- Organization-level permission checks require a valid membership.
- Admin-only routes reject non-admin users with a 403 response.
- Rate limiting and security headers are enabled via Helmet and express-rate-limit.
- Passwords are never stored in plaintext; they are hashed with bcrypt.

## Project structure

- `client/` — React frontend
- `server/` — Express API
- `server/src/db/` — in-memory data and seed logic
- `server/tests/` — API tests
- `.env.example` — example environment configuration
