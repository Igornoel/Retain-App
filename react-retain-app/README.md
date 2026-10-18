# Retain

Retain is a personal expense and monthly budget manager. The frontend uses React, TypeScript, Vite, React Router, and Redux Toolkit. The Node.js and Express API handles authentication and app data. PostgreSQL stores users, budgets, categories, expenses, and server-side sessions.

## Features

- Sign up with name, date of birth, email, password, and an initial monthly budget; sign in and sign out
- Edit profile details and monthly budget in Settings
- Add, view, edit, delete, search, filter, sort, and paginate expenses
- Review monthly spending, category breakdowns, recent transactions, and budget progress
- Switch between light and dark appearance
- Use the responsive mobile navigation, help panel, and monthly notification summary
- Admin-only platform insights and category management
- Store account and financial data in PostgreSQL; authenticate API requests with revocable server-side sessions

## Requirements

- Node.js 20 or newer and npm
- Docker Desktop (for the local PostgreSQL setup), or a reachable PostgreSQL database

## Local development

Run these commands from the repository root unless a step says otherwise.

1. Install dependencies:

   ```sh
   npm run setup
   ```

2. Create the local environment file:

   ```sh
   cp react-retain-app/.env.example react-retain-app/.env
   ```

   Adjust the values in `react-retain-app/.env` for your database and local ports. Never commit `.env`.

3. Start the local PostgreSQL database:

   ```sh
   npm run db:up
   ```

4. Start the API in one terminal:

   ```sh
   npm run server
   ```

5. Start Vite in another terminal:

   ```sh
   npm run dev
   ```

   Open the URL printed by Vite, usually `http://localhost:5173`.

The API runs at `http://localhost:3001` by default. `VITE_API_URL` selects the API base URL for the frontend. `CLIENT_ORIGIN` controls which frontend origins the API accepts. If Vite uses another port (for example, `5174` because `5173` is occupied), add that full origin to `CLIENT_ORIGIN`, comma-separated, and restart the API. The API runs SQL migrations and seeds default categories on startup.

Stop the local database with `npm run db:down`. Its Docker volume is persistent, so stopping the container does not remove database records.

## Admin account

Create a regular account, then promote it from the repository root:

```sh
npm run admin:promote -- your@email.com
```

Sign out and sign back in for the updated role to take effect. Admin routes are checked by both the frontend and API.

## API routes

Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/health` | Public; checks PostgreSQL connectivity |
| `POST` | `/api/auth/signup`, `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Signed in |
| `PATCH` | `/api/auth/profile` | Signed in; update name and date of birth |
| `POST` | `/api/auth/logout` | Signed in; revoke the current session |
| `GET`, `POST` | `/api/expenses` | Signed in; list or create expenses |
| `PATCH`, `DELETE` | `/api/expenses/:id` | Owner or admin |
| `GET`, `PUT` | `/api/budgets/:month` | Signed in; own monthly budget |
| `GET` | `/api/categories` | Signed in |
| `POST`, `PATCH`, `DELETE` | `/api/categories[/:id]` | Admin |
| `GET` | `/api/admin/insights` | Admin |

Expense list filters include `q`, `category`, `payment`, `from`, `to`, `sort`, `page`, and `limit`.

## Deploy on Render

Deploy three resources: a PostgreSQL database, a Node web service for the API, and a Static Site for the Vite frontend. Connect the services to the GitHub repository and use the `react-retain-app` directory as the root directory for both app services.

Public application: [https://retain-app-1.onrender.com](https://retain-app-1.onrender.com)

### API web service

- Build command: `npm install`
- Start command: `npm run server`
- Set `DATABASE_URL` to the managed PostgreSQL connection string (prefer the internal URL when the services share a region).
- Set `DATABASE_SSL` to the value required by the database provider.
- Set `CLIENT_ORIGIN` to the full public frontend origin, such as `https://your-frontend.onrender.com` (no trailing slash).
- Set `HOST` to `0.0.0.0`. Render supplies `PORT` automatically.
- Optional: set `SESSION_DAYS` and `DATABASE_POOL_SIZE` as needed.

The API applies database migrations and seeds default categories at startup. Set the API health check path to `/api/health`.

### Static frontend

- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Add `VITE_API_URL` with the API's public base URL ending in `/api`, for example `https://your-api.onrender.com/api`.
- Add a rewrite from `/*` to `/index.html` with status `200`, so direct links such as `/signup` and `/settings` work.

Vite embeds `VITE_API_URL` during the build. Rebuild and deploy the Static Site after changing it. Keep `DATABASE_URL` and all database secrets on the API service only; never put secrets in frontend variables. Configure the matching frontend origin in the API service's `CLIENT_ORIGIN` setting.

## Build locally

From the repository root:

```sh
npm run build
```

The frontend build output is written to `react-retain-app/dist`.
