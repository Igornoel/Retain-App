# Retain

Retain is a personal expense and monthly budget manager. The React frontend uses the Express API for authentication and financial data. PostgreSQL stores users, hashed passwords, expenses, monthly budgets, categories, and revocable server-side sessions.

## Local development

From the `Retain-App` directory, the root scripts below forward commands to this project. Or run the matching commands directly from `react-retain-app`.

1. Install dependencies once with `npm run setup`.
2. Copy `react-retain-app/.env.example` to `react-retain-app/.env`.
3. Start PostgreSQL. With Docker installed, run `npm run db:up` from the repository root. The compose file creates a persistent local development volume.
4. Start the API with `npm run server`.
5. In another terminal, start Vite with `npm run dev` and visit `http://localhost:5173`.

The API applies the SQL schema and seeds the default categories at startup. Local Docker credentials are only for development. Set `DATABASE_URL` to a managed PostgreSQL connection string and set `DATABASE_SSL=true` for a hosted deployment. Keep credentials in the hosting provider's secret environment variables; do not commit `.env`.

## Admin access

Create a normal account, then run `npm run admin:promote -- your@email.com`. Sign out and sign in again. The `/admin` route is protected in the React app, and the API also checks the user's admin role before serving insights or changing categories.

## Main features

- Sign up, sign in, sign out, and restore a session using React Context and server-side, expiring sessions
- Add, view, update, delete, search, filter, sort, and paginate expenses; users can only manage their own records
- Set a monthly budget and view spending, remaining amount, and budget status
- Dashboard totals, highest expense, spending by category, and recent activity
- Admin-only category create, update, delete (affected expenses move to Other), platform totals, top/bottom category usage, recent expenses, and recent registrations
- Responsive React/TypeScript UI with Redux Toolkit managing expense filtering and sorting

## API routes

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/health` | Public; checks PostgreSQL connectivity |
| `POST` | `/api/auth/signup`, `/api/auth/login` | Public |
| `POST`, `GET` | `/api/auth/logout`, `/api/auth/me` | Signed in |
| `GET`, `POST` | `/api/expenses` | Signed in; owner-scoped, with filters and pagination |
| `PATCH`, `DELETE` | `/api/expenses/:id` | Owner or admin |
| `GET`, `PUT` | `/api/budgets/:month` | Signed in; own budget only |
| `GET` | `/api/categories` | Signed in |
| `POST`, `PATCH`, `DELETE` | `/api/categories[/:id]` | Admin |
| `GET` | `/api/admin/insights` | Admin |

Send protected requests with `Authorization: Bearer <token>`. Expense list filters are `q`, `category`, `payment`, `from`, `to`, `sort`, `page`, and `limit`.

## Deploy

Deploy the static Vite frontend and Node API to hosts that support each service, provision a managed PostgreSQL database, and set `DATABASE_URL`, `DATABASE_SSL`, `CLIENT_ORIGIN`, `VITE_API_URL`, `HOST`, and `PORT` in the respective environments. Build the frontend with `npm run build`. The deployed app URL should be added here after deployment.

The API now requires PostgreSQL; it does not fall back to a local JSON database. The database credentials in Docker Compose are development-only. Use strong credentials and a managed database with backups for production.
