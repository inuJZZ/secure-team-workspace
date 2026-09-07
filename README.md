A Free Ebook Library "enuLib"

A personal web project where readers "YOU" can create an account, log in, and read ebooks for free directly on the website.

? About

I built this project to give readers a place to access ebooks online. It combines a reading experience with user accounts and authentication.

? Features

- Free Ebooks — Access the books available on the platform for free.
- Read Online — Read directly on the website.
- Reader Accounts — Create an account and log in.
- Authentication — Account access supported by backend authentication and permission checks.

? Technologies and Tools

# Frontend

- React — Builds the user interface.
- TypeScript — Adds static typing to the application.
- Vite — Provides the frontend development server and build tools.
- React Router — Handles navigation between pages.

# Backend

- Node.js — Runs the server.
- Express — Handles API requests and backend routes.
- TypeScript — Provides type checking for server code.
- JWT — Supports authenticated sessions.
- bcrypt — Hashes passwords.
- Helmet — Sets security-related HTTP headers.
- express-rate-limit — Limits repeated requests.

? Development and Testing

- npm Workspaces — Organizes the frontend and backend packages.
- Concurrently — Runs both development servers together.
- Vitest — Runs backend tests.
- Git and GitHub — Track changes and host the repository.
- Visual Studio Code — Development editor.
- Vercel : for both front and back end public server deployment

? Backend API

The project includes an Express backend for account registration, login, and protected application routes.

? Data Storage

The current development setup uses an in-memory store. Data stored in memory does not persist across server restarts.

The project also includes a PostgreSQL-ready schema for future database integration. A connection string alone does not replace the in-memory implementation.

? Run Locally

# Prerequisites

- Node.js 20 or newer
- npm 10 or newer

# Setup

1. Open a terminal in the repository root.

2. Copy the example environment file:

       copy .env.example .env

3. Configure the environment values in `.env`, including a long, random `JWT_SECRET`.

4. Install dependencies:

       npm install

5. Start the frontend and backend together:

       npm run dev

6. Open http://localhost:5173 in your browser.

? Available Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend and backend |
| `npm run build` | Build both application packages |
| `npm test` | Run backend tests |

? Project Structure

- `client/` — Frontend application
- `server/` — Backend API and authentication
- `server/src/db/` — Development data and seed logic
- `server/tests/` — Backend API tests
- `.env.example` — Example environment configuration

## 🌱 Personal Project

This is a personal project that I use to develop my full-stack programming skills while building a platform for reading ebooks online.
