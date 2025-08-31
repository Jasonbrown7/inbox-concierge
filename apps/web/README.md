# Inbox Concierge Web

This directory contains the frontend web application for Inbox Concierge. It is a modern single-page application built with React (Vite) and TypeScript.

## Core Technologies & Libraries

- **React**: The primary UI library for building components.
- **Vite**: A fast and modern build tool and development server.
- **TypeScript**: Provides static typing for the entire codebase.
- **React Router**: Handles all client-side routing and navigation.
- **TanStack Query (React Query)**: Manages all server state, including data fetching, caching, and synchronization. It is used for fetching user authentication status and email threads.
- **Axios**: Used for all HTTP communication with the backend API. A pre-configured instance ensures credentials are sent with every request.
- **Tailwind CSS**: A utility-first CSS framework for styling.
- **shadcn/ui**: A collection of accessible and reusable components built on top of Tailwind CSS.

## Project Structure

- **`src/pages`**: Contains the main page components that are mapped to routes.
  - `LoginPage.tsx`: The view shown to unauthenticated users.
  - `InboxPage.tsx`: The main inbox view that lists email threads.
  - `ThreadPage.tsx`: The detailed view for a single email thread.
- **`src/components`**: Contains reusable components.
  - `ui/`: Holds the components added from `shadcn/ui`.
  - `InboxPageSkeleton.tsx` / `ThreadPageSkeleton.tsx`: Custom skeleton components that provide a polished loading state for their respective pages.
  - `RuleDialog.tsx`: A dialog component for creating, viewing, and deleting classification rules.
  - `ThreadList.tsx`: A presentational component responsible for rendering the list of email threads.
- **`src/hooks`**: Contains custom React hooks.
  - `useUser.ts`: A hook to fetch and cache the current user's authentication status.
  - `useInbox.ts`: A custom hook that encapsulates all data-fetching and mutation logic for the inbox page.
- **`src/lib`**: Contains library configurations and utilities.
  - `axios.ts`: A pre-configured Axios instance for API calls.
  - `api.ts`: Centralizes all client-side API fetching functions.

## Design & Data Flow

### Authentication

The application uses an `AuthHandler` in `App.tsx` which acts as a gatekeeper. It uses the `useUser` hook to determine if a user is logged in. If they are, it renders the application's content via a React Router `<Outlet />`; otherwise, it displays the `LoginPage`.

### Data Fetching & UI Logic

- **Logic Encapsulation**: The `InboxPage`'s complex logic is encapsulated in the `useInbox` custom hook. This hook handles all data fetching (for buckets and threads), mutations (for syncing and classifying), and returns the necessary data and state to the component.
- **Initial Load**: On the initial load of the `InboxPage`, the application automatically triggers a sync with the Gmail API, followed immediately by the classification pipeline.
- **UI**: The page uses a tabbed interface to filter threads by their assigned bucket. A "Reclassify" button allows the user to re-run the classification process, and an "Add rule" button opens a dialog for managing classification rules.
- **Thread View**: When a user clicks on a thread, they are navigated to `/thread/:id`. The `ThreadPage.tsx` component then makes an on-demand request to `GET /api/threads/:id` to fetch the full content for that specific thread.
