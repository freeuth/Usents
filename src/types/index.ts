// ─────────────────────────────────────────────
// Enum-like types
// ─────────────────────────────────────────────

export type Owner = 'me' | 'spouse' | 'joint';
export type FilterOwner = 'all' | Owner;
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryType = 'income' | 'expense' | 'savings' | 'investment' | 'transfer';
export type AccountType = 'checking' | 'savings' | 'emergency' | 'investment' | 'etc';
export type CardType = 'credit' | 'debit';
export type PaymentMethodType = 'card' | 'account' | 'cash';
export type RecurringType = 'income' | 'expense';

// ─────────────────────────────────────────────
// DB models (matching Supabase tables)
// ─────────────────────────────────────────────

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  household_id: string;
  user_id: string;
  role: Owner;
  display_name: string;
  color: string;
  created_at: string;
}

export interface Account {
  id: string;
  household_id: string;
  name: string;
  bank_name: string;
  account_type: AccountType;
  current_balance: number;
  owner: Owner;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  household_id: string;
  name: string;
  card_type: CardType;
  payment_day: number;
  linked_account_id: string | null;
  owner: Owner;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // joined
  linked_account?: Account;
}

export interface Category {
  id: string;
  household_id: string | null;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  parent_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  // joined
  parent?: Category;
  children?: Category[];
}

export interface Transaction {
  id: string;
  household_id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  category_id: string;
  payment_method_type: PaymentMethodType;
  payment_method_id: string | null;
  owner: Owner;
  memo: string | null;
  is_recurring: boolean;
  recurring_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
  card?: Card;
  account?: Account;
}

export interface RecurringTransaction {
  id: string;
  household_id: string;
  type: RecurringType;
  name: string;
  amount: number;
  day_of_month: number;
  category_id: string;
  payment_method_type: PaymentMethodType;
  payment_method_id: string | null;
  owner: Owner;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  last_generated_month: string | null;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
  card?: Card;
  account?: Account;
}

export interface MonthlySnapshot {
  id: string;
  household_id: string;
  account_id: string;
  year_month: string; // YYYY-MM
  opening_balance: number;
  total_income: number;
  total_expense: number;
  closing_balance: number;
  created_at: string;
}

// ─────────────────────────────────────────────
// UI / View models
// ─────────────────────────────────────────────

export interface AccountForecast {
  account: Account;
  currentBalance: number;
  plannedIncome: number;
  plannedExpense: number;
  cardPayments: number;
  upcomingRecurringIncome: number;
  upcomingRecurringExpense: number;
  forecastBalance: number;
  isWarning: boolean;
}

export interface CardForecast {
  card: Card;
  usageAmount: number;
  forecastPaymentAmount: number;
  paymentDate: string;
  linkedAccount?: Account;
}

export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalCardPaymentDue: number;
  accounts: AccountForecast[];
  cardForecasts: CardForecast[];
}

export interface TransactionGroup {
  date: string;
  dayTotal: number;
  transactions: Transaction[];
}

// ─────────────────────────────────────────────
// Input types (for forms)
// ─────────────────────────────────────────────

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  date: string;
  category_id: string;
  payment_method_type: PaymentMethodType;
  payment_method_id: string | null;
  owner: Owner;
  memo?: string;
}

export interface AccountInput {
  name: string;
  bank_name: string;
  account_type: AccountType;
  current_balance: number;
  owner: Owner;
  display_order?: number;
}

export interface CardInput {
  name: string;
  card_type: CardType;
  payment_day: number;
  linked_account_id: string | null;
  owner: Owner;
}

export interface RecurringInput {
  type: RecurringType;
  name: string;
  amount: number;
  day_of_month: number;
  category_id: string;
  payment_method_type: PaymentMethodType;
  payment_method_id: string | null;
  owner: Owner;
  start_date: string;
  end_date?: string;
}
