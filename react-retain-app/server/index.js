import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { inTransaction, migrate, pool } from './db.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || '127.0.0.1';
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 14);
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim());

app.use(cors({ origin: origins }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const makeId = () => crypto.randomUUID();
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const safeUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : null,
});
const expenseDto = (row) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  amount: Number(row.amount),
  categoryId: row.category_id,
  date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10),
  paymentMethod: row.payment_method,
  notes: row.notes || '',
});
const categoryDto = (row) => ({ id: row.id, name: row.name, color: row.color, icon: row.icon });

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(`${salt}:${key.toString('hex')}`));
});

const verifyPassword = async (password, storedHash) => {
  const [salt, expected] = storedHash.split(':');
  const candidate = await hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(candidate.split(':')[1], 'hex'), Buffer.from(expected, 'hex'));
};

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = tokenHash(token);
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + ($3 * interval '1 day'))`,
    [hash, userId, SESSION_DAYS],
  );
  return token;
}

const requireAuth = asyncRoute(async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in required' });
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.date_of_birth, s.token_hash
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash(token)],
  );
  if (!result.rowCount) return res.status(401).json({ error: 'Session expired. Sign in again.' });
  req.user = safeUser(result.rows[0]);
  req.sessionHash = result.rows[0].token_hash;
  next();
});

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true, database: 'connected', name: 'Retain API' });
}));

app.post('/api/auth/signup', asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const dateOfBirth = String(req.body.dateOfBirth || '');
  const monthlyBudget = Number(req.body.monthlyBudget);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8
    || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth >= new Date().toISOString().slice(0, 10)
    || !Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    return res.status(400).json({ error: 'Enter your name, valid email, a password of at least 8 characters, date of birth, and a positive monthly budget.' });
  }
  const user = { id: makeId(), name, email, passwordHash: await hashPassword(password) };
  await pool.query(
    'INSERT INTO users (id, name, email, password_hash, date_of_birth) VALUES ($1, $2, $3, $4, $5::date)',
    [user.id, user.name, user.email, user.passwordHash, dateOfBirth],
  );
  await pool.query(
    'INSERT INTO budgets (user_id, month, amount) VALUES ($1, $2, $3)',
    [user.id, new Date().toISOString().slice(0, 7), monthlyBudget],
  );
  const token = await createSession(user.id);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: 'user', dateOfBirth } });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const result = await pool.query('SELECT * FROM users WHERE lower(email) = $1', [email]);
  const user = result.rows[0];
  if (!user || !await verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  const token = await createSession(user.id);
  res.json({ token, user: safeUser(user) });
}));

app.post('/api/auth/logout', requireAuth, asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [req.sessionHash]);
  res.status(204).end();
}));

app.get('/api/auth/me', requireAuth, (req, res) => res.json(req.user));

app.patch('/api/auth/profile', requireAuth, asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const dateOfBirth = String(req.body.dateOfBirth || '');
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) || dateOfBirth >= new Date().toISOString().slice(0, 10)) {
    return res.status(400).json({ error: 'Enter your name and a valid date of birth in the past.' });
  }
  const result = await pool.query(
    'UPDATE users SET name=$1, date_of_birth=$2::date WHERE id=$3 RETURNING id, name, email, role, date_of_birth',
    [name, dateOfBirth, req.user.id],
  );
  res.json(safeUser(result.rows[0]));
}));

app.get('/api/expenses', requireAuth, asyncRoute(async (req, res) => {
  const conditions = [];
  const values = [];
  const add = (condition, value) => { values.push(value); conditions.push(condition.replace('?', `$${values.length}`)); };
  if (req.user.role !== 'admin') add('user_id = ?', req.user.id);
  if (req.query.q) {
    const term = `%${String(req.query.q)}%`;
    values.push(term, term);
    conditions.push(`(title ILIKE $${values.length - 1} OR notes ILIKE $${values.length})`);
  }
  if (req.query.category) add('category_id = ?', String(req.query.category));
  if (req.query.payment) add('payment_method = ?', String(req.query.payment));
  if (req.query.from) add('date >= ?::date', String(req.query.from));
  if (req.query.to) add('date <= ?::date', String(req.query.to));
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortColumns = { 'date-asc': 'date ASC, id ASC', 'amount-desc': 'amount DESC, date DESC', 'amount-asc': 'amount ASC, date DESC' };
  const orderBy = sortColumns[String(req.query.sort)] || 'date DESC, id DESC';
  const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '20'), 10) || 20));
  const countResult = await pool.query(`SELECT count(*)::int AS total FROM expenses ${where}`, values);
  const total = countResult.rows[0].total;
  const result = await pool.query(
    `SELECT * FROM expenses ${where} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, (page - 1) * limit],
  );
  res.json({ items: result.rows.map(expenseDto), total, page, pages: Math.ceil(total / limit) });
}));

app.post('/api/expenses', requireAuth, asyncRoute(async (req, res) => {
  const { title, amount, categoryId, date, paymentMethod, notes } = req.body;
  if (!String(title || '').trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !date || !paymentMethod) {
    return res.status(400).json({ error: 'Title, positive amount, date, and payment method are required.' });
  }
  const result = await pool.query(
    `INSERT INTO expenses (id, user_id, title, amount, category_id, date, payment_method, notes)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8) RETURNING *`,
    [makeId(), req.user.id, String(title).trim(), Number(amount), categoryId, date, String(paymentMethod), String(notes || '').slice(0, 500)],
  );
  res.status(201).json(expenseDto(result.rows[0]));
}));

app.patch('/api/expenses/:id', requireAuth, asyncRoute(async (req, res) => {
  const existing = await pool.query('SELECT * FROM expenses WHERE id = $1', [req.params.id]);
  const expense = existing.rows[0];
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  if (req.user.role !== 'admin' && expense.user_id !== req.user.id) return res.status(403).json({ error: 'You can only update your own expenses.' });
  const fields = {
    title: req.body.title === undefined ? expense.title : String(req.body.title).trim(),
    amount: req.body.amount === undefined ? expense.amount : Number(req.body.amount),
    categoryId: req.body.categoryId === undefined ? expense.category_id : req.body.categoryId,
    date: req.body.date === undefined ? expense.date : req.body.date,
    paymentMethod: req.body.paymentMethod === undefined ? expense.payment_method : String(req.body.paymentMethod),
    notes: req.body.notes === undefined ? expense.notes : String(req.body.notes).slice(0, 500),
  };
  if (!fields.title || !Number.isFinite(Number(fields.amount)) || Number(fields.amount) <= 0 || !fields.date || !fields.paymentMethod) {
    return res.status(400).json({ error: 'Expense fields are invalid.' });
  }
  const updated = await pool.query(
    `UPDATE expenses SET title=$1, amount=$2, category_id=$3, date=$4::date, payment_method=$5, notes=$6
     WHERE id=$7 RETURNING *`,
    [fields.title, fields.amount, fields.categoryId, fields.date, fields.paymentMethod, fields.notes, req.params.id],
  );
  res.json(expenseDto(updated.rows[0]));
}));

app.delete('/api/expenses/:id', requireAuth, asyncRoute(async (req, res) => {
  const result = req.user.role === 'admin'
    ? await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id])
    : await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  if (!result.rowCount) return res.status(404).json({ error: 'Expense not found.' });
  res.status(204).end();
}));

app.get('/api/budgets/:month', requireAuth, asyncRoute(async (req, res) => {
  const result = await pool.query('SELECT month, amount FROM budgets WHERE user_id=$1 AND month=$2', [req.user.id, req.params.month]);
  res.json(result.rows[0] ? { month: result.rows[0].month, amount: Number(result.rows[0].amount) } : { month: req.params.month, amount: 0 });
}));

app.put('/api/budgets/:month', requireAuth, asyncRoute(async (req, res) => {
  const amount = Number(req.body.amount);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(req.params.month) || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Enter a valid month and a positive budget amount.' });
  }
  const result = await pool.query(
    `INSERT INTO budgets (user_id, month, amount) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, month) DO UPDATE SET amount=EXCLUDED.amount, updated_at=now()
     RETURNING month, amount`,
    [req.user.id, req.params.month, amount],
  );
  res.json({ month: result.rows[0].month, amount: Number(result.rows[0].amount) });
}));

app.get('/api/categories', requireAuth, asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT id, name, color, icon FROM categories ORDER BY name');
  res.json(result.rows.map(categoryDto));
}));

app.post('/api/categories', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required.' });
  const result = await pool.query(
    'INSERT INTO categories (id, name, color, icon) VALUES ($1, $2, $3, $4) RETURNING id, name, color, icon',
    [makeId(), name, String(req.body.color || '#8ca39a'), String(req.body.icon || 'dots')],
  );
  res.status(201).json(categoryDto(result.rows[0]));
}));

app.patch('/api/categories/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE categories SET name=COALESCE(NULLIF(trim($1), ''), name), color=COALESCE($2, color)
     WHERE id=$3 RETURNING id, name, color, icon`,
    [req.body.name ?? null, req.body.color ?? null, req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Category not found.' });
  res.json(categoryDto(result.rows[0]));
}));

app.delete('/api/categories/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  if (req.params.id === 'other') return res.status(400).json({ error: 'The Other category cannot be deleted.' });
  await inTransaction(async (client) => {
    const category = await client.query('SELECT id FROM categories WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!category.rowCount) return false;
    await client.query('UPDATE expenses SET category_id=$1 WHERE category_id=$2', ['other', req.params.id]);
    await client.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    return true;
  }).then((deleted) => {
    if (!deleted) return res.status(404).json({ error: 'Category not found.' });
    res.status(204).end();
  });
}));

app.get('/api/admin/insights', requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const [totals, categoryRows, recentExpenses, recentUsers] = await Promise.all([
    pool.query(
      `SELECT (SELECT count(*)::int FROM users) AS users,
              count(*)::int AS expenses,
              COALESCE(sum(amount), 0)::float AS total_value,
              count(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)
                AND date < date_trunc('month', CURRENT_DATE) + interval '1 month')::int AS month_expenses
       FROM expenses`,
    ),
    pool.query(
      `SELECT c.id, c.name, c.color, c.icon, count(e.id)::int AS count,
              COALESCE(sum(e.amount), 0)::float AS total
       FROM categories c LEFT JOIN expenses e ON e.category_id=c.id
       GROUP BY c.id ORDER BY count DESC, c.name ASC`,
    ),
    pool.query('SELECT * FROM expenses ORDER BY created_at DESC LIMIT 10'),
    pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10'),
  ]);
  const categories = categoryRows.rows.map((row) => ({ ...categoryDto(row), count: row.count, total: Number(row.total) }));
  const totalsRow = totals.rows[0];
  res.json({
    users: totalsRow.users,
    expenses: totalsRow.expenses,
    totalValue: Number(totalsRow.total_value),
    currentMonthExpenses: totalsRow.month_expenses,
    spendingByCategory: categories,
    topCategories: [...categories].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5),
    leastUsed: [...categories].sort((a, b) => a.count - b.count || a.name.localeCompare(b.name)).slice(0, 5),
    recentExpenses: recentExpenses.rows.map(expenseDto),
    recentUsers: recentUsers.rows.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role })),
    month,
  });
}));

app.use((error, _req, res, _next) => {
  if (error.code === '23505') return res.status(409).json({ error: 'That email or category name is already in use.' });
  if (['22P02', '22007', '23503', '23514'].includes(error.code)) return res.status(400).json({ error: 'The submitted data is invalid.' });
  console.error('Retain API error:', error.message);
  res.status(500).json({ error: 'Unexpected server error.' });
});

await migrate();
const server = app.listen(PORT, HOST, () => console.log(`Retain API listening on http://${HOST}:${PORT}`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => { await pool.end(); process.exit(0); }));
}
