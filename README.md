# Retain

Retain is a personal expense and monthly budget manager. It has a React and TypeScript frontend, a Node.js and Express API, and PostgreSQL storage.

The application and full setup guide are in [`react-retain-app/`](react-retain-app/README.md). The commands below can be run from this repository root.

## Run locally

1. Install dependencies with `npm run setup`.
2. Copy `react-retain-app/.env.example` to `react-retain-app/.env` and adjust values if needed.
3. Start Docker Desktop and run `npm run db:up` to start the development PostgreSQL database.
4. In one terminal, run `npm run server`.
5. In another terminal, run `npm run dev` and open the Vite URL printed in the terminal (usually `http://localhost:5173`).

If Vite selects a different port because the usual one is busy, add that origin to `CLIENT_ORIGIN` in `react-retain-app/.env` (comma-separated) and restart the API. Do not commit `.env` or use its local database credentials for production.

See the [application README](react-retain-app/README.md) for features, admin setup, API routes, and deployment configuration.

## Deploy on Render

Deploy three resources: a PostgreSQL database, a Node web service for the API, and a Static Site for the Vite frontend. Connect the services to the GitHub repository and use the `react-retain-app` directory as the root directory for both app services.

Public application: [https://retain-app-1.onrender.com](https://retain-app-1.onrender.com)
