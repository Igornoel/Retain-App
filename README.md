# Retain workspace

The application lives in `react-retain-app/`. The scripts here forward to it, so you can run them from this `Retain-App` directory.

1. Install: `npm run setup`
2. Start PostgreSQL: open Docker Desktop, then run `npm run db:up`
3. Start the API in terminal 1: `npm run server`
4. Start Vite in terminal 2: `npm run dev`

A local development `.env` is configured from the sample PostgreSQL settings. For production, replace `DATABASE_URL` with your managed PostgreSQL connection string and enable SSL as required by that provider. See [the app README](react-retain-app/README.md) for the database schema, API, admin setup, and deployment notes.
