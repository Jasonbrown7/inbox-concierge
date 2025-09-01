# Inbox Concierge API

This directory contains the backend API for the Inbox Concierge application. It is a Node.js application built with Express.js and Prisma for database interaction.

## Services

### `services/gmail.service.ts`

The `GmailService` class is responsible for all communication with the Google Gmail API.

- **`constructor(oauthClient)`**: Initializes the service with a user-authenticated Google OAuth2 client.
- **`fetchLatestThreads(options)`**: Fetches email thread metadata from the Gmail API. It retrieves a list of thread IDs and then fetches the details for each thread concurrently to improve performance. It supports an `after` option to fetch only threads newer than a given timestamp.

### `services/classification.service.ts`

This service orchestrates the entire AI-powered email classification pipeline. It uses a two-phase process to categorize threads efficiently and accurately.

- **`classifyLastN(userId, n)`**: The main entry point for the classification process. It runs in two phases:
  1.  **Phase 1 (New Threads):** Fetches only new, uncategorized threads and classifies them using a fast heuristics pass, followed by an LLM pass for any remaining ambiguous emails.
  2.  **Phase 2 (Rules Override):** Fetches all `n` recent threads (regardless of current bucket) and runs a "rules-only" pass. This ensures that any user-defined rules are always applied as the final override.

### `services/llm.service.ts`

This service is responsible for all communication with the OpenAI API. It uses the **Structured Outputs** feature to guarantee that the LLM's response adheres to a strict Zod schema.

- **`classifyWithLlm(threads)`**: Takes a batch of email threads, formats them into a compact shape for the model, sends them to the OpenAI API with a specialized prompt, and validates the returned JSON classification data using a Zod schema.

### `services/rules.service.ts` & `services/heuristics.service.ts`

These services contain the logic for the deterministic passes of the classification pipeline. They apply user-defined rules and pattern-matching to quickly classify common email types.

### `services/encryption.service.ts`

This service provides utility functions for encryption and decryption using `aes-256-gcm`. It is used to securely store sensitive data, like user refresh tokens, in the database.

## API Endpoints

All endpoints are prefixed with `/api`.

### Health Check

- **`GET /health`**
  - **Description**: A public endpoint to verify that the API server is running and responsive.
  - **Authentication**: None.

### Authentication (`/auth`)

Handles the Google OAuth 2.0 authentication flow and user session management.

- **`GET /auth/google`**
  - **Description**: Initiates the authentication process by redirecting the user to Google's OAuth consent screen.
  - **Authentication**: None.

- **`GET /auth/google/callback`**
  - **Description**: The callback URL that Google redirects to after the user grants permission. It handles user creation/lookup, establishes a session, and redirects the user back to the frontend application.
  - **Authentication**: None.

- **`GET /auth/me`**
  - **Description**: Retrieves the profile of the currently authenticated user from the session.
  - **Authentication**: Required (cookie-based session).

- **`POST /auth/logout`**
  - **Description**: Logs the user out by destroying the current session.
  - **Authentication**: Required (cookie-based session).

### Threads (`/threads`)

Handles the fetching, syncing, and retrieval of email threads.

- **`GET /`**
  - **Description**: Retrieves a list of email threads for the authenticated user that have already been synced and stored in the local database.
  - **Authentication**: Required (cookie-based session).

- **`GET /threads/:id`**
  - **Description**: Fetches the full content of a single email thread, including all message bodies, directly from the Gmail API. It processes the complex API response and returns a simplified data structure to the frontend.
  - **Authentication**: Required (cookie-based session).

- **`POST /sync`**
  - **Description**: Triggers a sync process with the Gmail API. It identifies the most recent thread stored locally and fetches only newer threads from Gmail. The fetched thread metadata is then saved (`upserted`) into the database.
  - **Authentication**: Required (cookie-based session).

### Buckets (`/buckets`)

- **`GET /`**: Retrieves the list of default and user-created buckets.

### Rules (`/rules`)

Handles the creation and management of user-defined classification rules.

- **`GET /`**: Retrieves the list of user-defined classification rules.
- **`POST /`**: Creates a new classification rule. Priority is assigned automatically based on the target bucket, with an option for a manual high-priority override.
- **`DELETE /:id`**: Deletes a specific rule.

### Classification (`/classify`)

- **`POST /run`**: Triggers the AI classification pipeline for the user's most recent threads.

## Database Migrations

Migrations are managed by Prisma and are generated from the schema file at `prisma/schema.prisma`.

### Development

After making changes to the `schema.prisma` file, run the following command to generate a new migration and apply it to your local development database:

```sh
pnpm --filter @in-concierge/api run prisma:dev
```

This will create a new migration file in `prisma/migrations` which should be committed to version control.

### Deployment

In a production or CI/CD environment, use the `deploy` command to apply any pending migrations. This command does not generate new files and will not prompt for input.

```sh
pnpm --filter @in-concierge/api run prisma:deploy
```
