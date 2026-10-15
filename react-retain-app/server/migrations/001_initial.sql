CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  color TEXT NOT NULL DEFAULT '#9ca3af',
  icon TEXT NOT NULL DEFAULT 'dots',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_lower_unique ON categories (lower(name));

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expenses_user_date_idx ON expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses (category_id);

CREATE TABLE IF NOT EXISTS budgets (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);

INSERT INTO categories (id, name, color, icon) VALUES
  ('food', 'Food & drink', '#e9a77d', 'fork'),
  ('transport', 'Transport', '#86a8a3', 'car'),
  ('shopping', 'Shopping', '#b7a0c9', 'bag'),
  ('bills', 'Bills & utilities', '#e0c16f', 'bolt'),
  ('health', 'Health', '#d88c91', 'heart'),
  ('entertainment', 'Entertainment', '#7f9ac5', 'play'),
  ('home', 'Home', '#91ad78', 'home'),
  ('other', 'Other', '#9ca3af', 'dots')
ON CONFLICT (id) DO NOTHING;
