-- ============================================================
-- Usents - 부부 공동 재무관리 앱
-- Initial Schema Migration
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────

CREATE TYPE owner_type AS ENUM ('me', 'spouse', 'joint');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE category_type AS ENUM ('income', 'expense', 'savings', 'investment', 'transfer');
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'emergency', 'investment', 'etc');
CREATE TYPE card_type AS ENUM ('credit', 'debit');
CREATE TYPE payment_method_type AS ENUM ('card', 'account', 'cash');

-- ────────────────────────────────────────────────────────────
-- HOUSEHOLDS
-- ────────────────────────────────────────────────────────────

CREATE TABLE households (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  invite_code VARCHAR(20)  NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- MEMBERS
-- ────────────────────────────────────────────────────────────

CREATE TABLE members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID         NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         owner_type   NOT NULL DEFAULT 'me',
  display_name VARCHAR(50)  NOT NULL DEFAULT '나',
  color        VARCHAR(7)   NOT NULL DEFAULT '#3B82F6',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ────────────────────────────────────────────────────────────
-- ACCOUNTS (통장)
-- ────────────────────────────────────────────────────────────

CREATE TABLE accounts (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id    UUID         NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  bank_name       VARCHAR(50)  NOT NULL DEFAULT '',
  account_type    account_type NOT NULL DEFAULT 'checking',
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  owner           owner_type   NOT NULL DEFAULT 'joint',
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  display_order   INT          NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- CARDS (카드)
-- ────────────────────────────────────────────────────────────

CREATE TABLE cards (
  id                UUID      PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id      UUID      NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name              VARCHAR(100) NOT NULL,
  card_type         card_type NOT NULL DEFAULT 'credit',
  payment_day       SMALLINT  NOT NULL DEFAULT 15 CHECK (payment_day BETWEEN 1 AND 31),
  linked_account_id UUID      REFERENCES accounts(id) ON DELETE SET NULL,
  owner             owner_type NOT NULL DEFAULT 'me',
  is_active         BOOLEAN   NOT NULL DEFAULT TRUE,
  display_order     INT       NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- CATEGORIES
-- ────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id   UUID          REFERENCES households(id) ON DELETE CASCADE,  -- NULL = global default
  name           VARCHAR(50)   NOT NULL,
  type           category_type NOT NULL DEFAULT 'expense',
  icon           VARCHAR(10)   NOT NULL DEFAULT '📝',
  color          VARCHAR(7)    NOT NULL DEFAULT '#6B7280',
  parent_id      UUID          REFERENCES categories(id) ON DELETE SET NULL,
  is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
  display_order  INT           NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TRANSACTIONS (거래)
-- ────────────────────────────────────────────────────────────

CREATE TABLE transactions (
  id                  UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id        UUID                 NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type                transaction_type     NOT NULL DEFAULT 'expense',
  amount              DECIMAL(15,2)        NOT NULL CHECK (amount > 0),
  date                DATE                 NOT NULL,
  category_id         UUID                 REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_type payment_method_type  NOT NULL DEFAULT 'card',
  payment_method_id   UUID,                -- card.id or account.id
  owner               owner_type           NOT NULL DEFAULT 'me',
  memo                TEXT,
  is_recurring        BOOLEAN              NOT NULL DEFAULT FALSE,
  recurring_id        UUID,                -- references recurring_transactions
  created_by          UUID                 REFERENCES members(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_transactions_household_date    ON transactions(household_id, date DESC);
CREATE INDEX idx_transactions_household_owner   ON transactions(household_id, owner, date DESC);
CREATE INDEX idx_transactions_payment_method    ON transactions(payment_method_id, date DESC);
CREATE INDEX idx_transactions_recurring_id      ON transactions(recurring_id);

-- ────────────────────────────────────────────────────────────
-- RECURRING TRANSACTIONS (반복 거래)
-- ────────────────────────────────────────────────────────────

CREATE TABLE recurring_transactions (
  id                   UUID                 PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id         UUID                 NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  type                 transaction_type     NOT NULL DEFAULT 'expense',
  name                 VARCHAR(100)         NOT NULL,
  amount               DECIMAL(15,2)        NOT NULL CHECK (amount > 0),
  day_of_month         SMALLINT             NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  category_id          UUID                 REFERENCES categories(id) ON DELETE SET NULL,
  payment_method_type  payment_method_type  NOT NULL DEFAULT 'card',
  payment_method_id    UUID,
  owner                owner_type           NOT NULL DEFAULT 'me',
  start_date           DATE                 NOT NULL DEFAULT CURRENT_DATE,
  end_date             DATE,
  is_active            BOOLEAN              NOT NULL DEFAULT TRUE,
  last_generated_month CHAR(7),             -- YYYY-MM
  created_at           TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- MONTHLY SNAPSHOTS (월말 스냅샷)
-- ────────────────────────────────────────────────────────────

CREATE TABLE monthly_snapshots (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id    UUID          NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id      UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  year_month      CHAR(7)       NOT NULL,  -- YYYY-MM
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_income    DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_expense   DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, year_month)
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE households            ENABLE ROW LEVEL SECURITY;
ALTER TABLE members               ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_snapshots     ENABLE ROW LEVEL SECURITY;

-- Helper function: get household_id for current user
CREATE OR REPLACE FUNCTION get_my_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- HOUSEHOLDS: only members of the household can see/edit
CREATE POLICY "household_member_select" ON households
  FOR SELECT USING (id = get_my_household_id());

CREATE POLICY "household_member_update" ON households
  FOR UPDATE USING (id = get_my_household_id());

CREATE POLICY "household_insert" ON households
  FOR INSERT WITH CHECK (true); -- anyone can create a household

-- MEMBERS: see/edit own household members
CREATE POLICY "members_select" ON members
  FOR SELECT USING (household_id = get_my_household_id());

CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_update" ON members
  FOR UPDATE USING (user_id = auth.uid());

-- Generic household policy factory for other tables
CREATE POLICY "accounts_all" ON accounts
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "cards_all" ON cards
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (
    household_id IS NULL OR household_id = get_my_household_id()
  );

CREATE POLICY "categories_modify" ON categories
  FOR ALL USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "transactions_all" ON transactions
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "recurring_all" ON recurring_transactions
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());

CREATE POLICY "snapshots_all" ON monthly_snapshots
  USING (household_id = get_my_household_id())
  WITH CHECK (household_id = get_my_household_id());
