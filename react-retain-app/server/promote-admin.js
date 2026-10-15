import 'dotenv/config';
import pg from 'pg';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run admin:promote -- user@example.com');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Configure PostgreSQL in .env first.');
  process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});
try {
  const result = await pool.query('UPDATE users SET role=$1 WHERE lower(email)=$2 RETURNING email', ['admin', email]);
  if (!result.rowCount) {
    console.error(`No registered account found for ${email}.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now an admin. Sign out and back in to refresh the role.`);
  }
} finally {
  await pool.end();
}
