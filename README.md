# Inbox Concierge

Inbox Concierge is a full-stack web application designed to help users manage their Gmail inbox with an intelligent, AI-powered classification system. This README provides a high-level overview of the project's architecture and technical design.

## Architecture Overview

The project is structured as a `pnpm` monorepo, which provides a single source of truth for all code and simplifies dependency management and tooling across the different parts of the application.

The monorepo contains two primary applications:

- `apps/api`: A Node.js/Express backend that handles business logic, data persistence, and communication with the Google Gmail API.
- `apps/web`: A React/Vite frontend that provides the user interface.

## Core Design & Data Flow

### Authentication

User authentication is handled via a secure Google OAuth 2.0 flow managed by the backend using Passport.js.

1.  The user initiates the login from the frontend, which redirects them to Google's consent screen.
2.  Upon successful authentication, Google redirects back to the API with an authorization code.
3.  The backend exchanges this code for an access token and a refresh token.
4.  A `User` record is created or updated in the database. The sensitive `refreshToken` is encrypted using `aes-256-gcm` before being stored.
5.  A secure, `httpOnly` session cookie is sent to the user's browser to manage their authenticated state for subsequent API requests.

### Data Storage & Synchronization

The application employs a hybrid approach to data management to ensure a fast user experience while maintaining data integrity and efficiency.

- **Database**: The backend uses a database (SQLite for development) managed by the Prisma ORM.
- **What is Stored**: The database only stores lightweight metadata for email threads (e.g., thread ID, subject, sender, snippet, date). The full body content of emails is never stored locally.
- **Synchronization**: A dedicated `/api/threads/sync` endpoint intelligently fetches this metadata from the Gmail API. On the first run, it fetches the user's most recent threads. On subsequent runs, it only fetches threads that are newer than the last one stored, minimizing redundant API calls.

### AI Classification Pipeline

On initial load, the application automatically syncs the user's latest email metadata from Gmail. Immediately following the sync, a multi-stage classification pipeline runs on the backend:

1.  **Heuristics:** Fast, deterministic checks identify common email types like newsletters and transactional messages.
2.  **LLM Classification:** Any remaining uncategorized emails are sent in batches to a Large Language Model (e.g., GPT-4o-mini) for nuanced classification into buckets like "Important" or "Can wait".
3.  **Rules Engine:** After classification, a "rules override" pass is performed. This pass applies any user-created rules (e.g., "emails from `domain.com` are always Important"), ensuring user preferences are the final word. This entire process is triggered on load and can be manually re-run by the user.

### Backend & Frontend Interaction

The frontend and backend communicate via a RESTful API.

- The frontend uses a pre-configured Axios instance to make authenticated requests to the backend, automatically including the session cookie.
- Server state on the frontend is managed by TanStack Query (React Query), which handles data fetching, caching, and state synchronization (e.g., automatically refetching threads after a sync operation).
- To view the full content of an email thread, the frontend makes an on-demand "lazy-loading" request to a dedicated backend endpoint (`GET /api/threads/:id`). The backend then fetches the full content for that single thread directly from the Gmail API and returns it. This ensures the main inbox view remains fast and that heavy data is only transferred when explicitly needed.
