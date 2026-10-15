# Retain

Retain is a personal expense and monthly budget manager. The responsive React and TypeScript frontend includes an overview dashboard, expense CRUD, Redux-powered search and filters, category spending, monthly budgets, and an admin view. The Express REST API is implemented alongside it, with authenticated, owner-scoped expense and budget routes and admin category and insight routes. The current frontend demonstration persists to browser local storage; it is not yet wired to the API.

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

The Vite app is available at `http://localhost:5173`. In this starter, the frontend persists account, demo expense, category, and budget data in browser local storage. Create an account to use the UI. Use different browsers or clear local storage to start over. The UI uses sample expenses and browser-local data; API integration is the next step before treating the frontend and backend as one deployed product. For the admin UI during local development, set the signed-in user's `role` to `admin` in the `retain.users` browser local-storage record.

## API server

In another terminal:

```sh
npm run server
```

The API listens on `http://localhost:3001`. It stores data in `server/data.json` (ignored by Git). Set `PORT` and `CLIENT_ORIGIN` to configure the server. Create the first admin by changing the `role` field for a registered user in `server/data.json` to `admin`, then restart the server. API sessions are in memory and expire when the server restarts. This lightweight JSON-file store is suitable for development; use a managed database and persistent session/token storage before public deployment.

### API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Health check |
| `POST` | `/api/auth/signup`, `/api/auth/login` | Public | Create account or receive bearer token |
| `POST`, `GET` | `/api/auth/logout`, `/api/auth/me` | Signed in | End session or get current user |
| `GET`, `POST` | `/api/expenses` | Signed in | List (filter/sort/page) or create own expenses |
| `PATCH`, `DELETE` | `/api/expenses/:id` | Owner/admin | Update or delete an expense |
| `GET`, `PUT` | `/api/budgets/:month` | Signed in | Read or update own monthly budget |
| `GET` | `/api/categories` | Signed in | List categories |
| `POST`, `PATCH`, `DELETE` | `/api/categories[/:id]` | Admin | Manage categories; deleted category expenses move to Other |
| `GET` | `/api/admin/insights` | Admin | Platform totals, category rankings, recent expenses and users |

Protected API requests use `Authorization: Bearer <token>`. Expense list filters include `q`, `category`, `payment`, `from`, `to`, `sort`, `page`, and `limit`.

## Technologies

- React 18, TypeScript, Vite, React Router
- Redux Toolkit and React Redux for filter, search, and sort state
- React Context for UI authentication state and protected routes
- Express 4, Node.js, JSON-file development persistence, scrypt password hashes
- Lucide icons and custom responsive CSS

## Main features

- Overview of selected-month spending, available budget, largest expense, daily average, category breakdown, and recent activity
- Create, edit, delete, filter, search, sort, and paginate expense records in the UI; the API also supports filtering, sorting, and paginated results
- Set and monitor the monthly spending limit, with approaching and over-budget states
- Admin-only category management, category spending and usage rankings, recently added expenses, and platform insights
- Responsive layouts for desktop, tablet, and mobile

## Build

```sh
npm run build
npm run preview
```

The app is ready to connect to a deployment platform that supports a static Vite frontend and a Node.js API. Add the deployed application URL here after deployment; no deployment URL has been supplied yet.
