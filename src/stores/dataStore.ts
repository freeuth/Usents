import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  Account, Card, Category, Transaction, RecurringTransaction,
  TransactionInput, AccountInput, CardInput, RecurringInput,
  FilterOwner, AccountForecast, CardForecast,
} from '../types';

export interface CategoryInput {
  name: string;
  type: string;
  icon: string;
  color: string;
  parent_id?: string | null;
  display_order?: number;
}
import { getMonthStart, getMonthEnd, getDayInMonth, formatYearMonth } from '../lib/helpers';
import { format } from 'date-fns';

let realtimeChannel: RealtimeChannel | null = null;

interface DataState {
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  loadedYearMonth: string | null;

  // Loaders
  loadAccounts: (householdId: string) => Promise<void>;
  loadCards: (householdId: string) => Promise<void>;
  loadCategories: (householdId: string) => Promise<void>;
  loadTransactions: (householdId: string, yearMonth: string, owner?: FilterOwner) => Promise<void>;
  loadRecurring: (householdId: string) => Promise<void>;

  // Realtime
  subscribeRealtime: (householdId: string) => void;
  unsubscribeRealtime: () => void;

  // CRUD - Transactions
  createTransaction: (householdId: string, memberId: string, input: TransactionInput) => Promise<void>;
  updateTransaction: (id: string, input: Partial<TransactionInput>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // CRUD - Accounts
  createAccount: (householdId: string, input: AccountInput) => Promise<void>;
  updateAccount: (id: string, input: Partial<AccountInput>) => Promise<void>;
  updateAccountBalance: (id: string, newBalance: number) => Promise<void>;

  // CRUD - Cards
  createCard: (householdId: string, input: CardInput) => Promise<void>;
  updateCard: (id: string, input: Partial<CardInput>) => Promise<void>;

  // CRUD - Recurring
  createRecurring: (householdId: string, input: RecurringInput) => Promise<void>;
  updateRecurring: (id: string, input: Partial<RecurringInput>) => Promise<void>;
  toggleRecurring: (id: string, isActive: boolean) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;

  // CRUD - Categories
  createCategory: (householdId: string, input: CategoryInput) => Promise<void>;
  updateCategory: (id: string, input: Partial<CategoryInput>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // CRUD - delete Account/Card
  deleteAccount: (id: string) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  // Business logic
  generateMonthlyRecurring: (householdId: string, yearMonth: string) => Promise<void>;
  getAccountForecast: (accountId: string, yearMonth: string) => AccountForecast | null;
  getCardForecast: (cardId: string, yearMonth: string) => CardForecast | null;
  getFilteredTransactions: (owner: FilterOwner) => Transaction[];
  getMonthSummary: (owner: FilterOwner) => { income: number; expense: number };
}

export const useDataStore = create<DataState>((set, get) => ({
  accounts: [],
  cards: [],
  categories: [],
  transactions: [],
  recurringTransactions: [],
  isLoading: false,
  loadedYearMonth: null,

  loadAccounts: async (householdId) => {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('display_order');
    if (data) set({ accounts: data });
  },

  loadCards: async (householdId) => {
    const { data } = await supabase
      .from('cards')
      .select('*, linked_account:accounts(*)')
      .eq('household_id', householdId)
      .eq('is_active', true)
      .order('display_order');
    if (data) set({ cards: data });
  },

  loadCategories: async (householdId) => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .or(`household_id.eq.${householdId},household_id.is.null`)
      .eq('is_active', true)
      .order('display_order');
    if (data) set({ categories: data });
  },

  loadTransactions: async (householdId, yearMonth, owner = 'all') => {
    let query = supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('household_id', householdId)
      .gte('date', getMonthStart(yearMonth))
      .lte('date', getMonthEnd(yearMonth))
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (owner !== 'all') query = query.eq('owner', owner);

    const { data } = await query;

    // payment_method_id 는 FK 없는 UUID → 로컬 state에서 매핑
    const { cards, accounts } = get();
    const enriched = (data ?? []).map(tx => ({
      ...tx,
      card: tx.payment_method_type === 'card'
        ? (cards.find(c => c.id === tx.payment_method_id) ?? null)
        : null,
      account: tx.payment_method_type === 'account'
        ? (accounts.find(a => a.id === tx.payment_method_id) ?? null)
        : null,
    }));

    set({ transactions: enriched, loadedYearMonth: yearMonth });
  },

  loadRecurring: async (householdId) => {
    const { data } = await supabase
      .from('recurring_transactions')
      .select('*, category:categories(*), card:cards(name), account:accounts(name)')
      .eq('household_id', householdId)
      .order('day_of_month');
    if (data) set({ recurringTransactions: data });
  },

  // ─── Transaction CRUD ───────────────────────────────────

  createTransaction: async (householdId, memberId, input) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        household_id: householdId,
        created_by: memberId,
        ...input,
      })
      .select('*, category:categories(*)')
      .single();
    if (error) throw error;

    // 카드/통장 로컬 매핑 후 prepend
    if (data) {
      const { cards, accounts } = get();
      const enriched = {
        ...data,
        card: input.payment_method_type === 'card'
          ? (cards.find(c => c.id === input.payment_method_id) ?? null)
          : null,
        account: input.payment_method_type === 'account'
          ? (accounts.find(a => a.id === input.payment_method_id) ?? null)
          : null,
      };
      set(s => ({ transactions: [enriched, ...s.transactions] }));
    }

    // If direct account payment, update balance
    if (input.payment_method_type === 'account' && input.payment_method_id) {
      const account = get().accounts.find(a => a.id === input.payment_method_id);
      if (account) {
        const delta = input.type === 'income' ? input.amount : -input.amount;
        await get().updateAccountBalance(account.id, account.current_balance + delta);
      }
    }
  },

  updateTransaction: async (id, input) => {
    const { data, error } = await supabase
      .from('transactions')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single();
    if (error) throw error;
    if (data) {
      const { cards, accounts } = get();
      const enriched = {
        ...data,
        card: data.payment_method_type === 'card'
          ? (cards.find(c => c.id === data.payment_method_id) ?? null)
          : null,
        account: data.payment_method_type === 'account'
          ? (accounts.find(a => a.id === data.payment_method_id) ?? null)
          : null,
      };
      set(s => ({ transactions: s.transactions.map(t => t.id === id ? enriched : t) }));
    }
  },

  deleteTransaction: async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    set(s => ({ transactions: s.transactions.filter(t => t.id !== id) }));
  },

  // ─── Account CRUD ───────────────────────────────────────

  createAccount: async (householdId, input) => {
    const maxOrder = Math.max(0, ...get().accounts.map(a => a.display_order));
    const { data, error } = await supabase
      .from('accounts')
      .insert({ household_id: householdId, display_order: maxOrder + 1, ...input })
      .select()
      .single();
    if (error) throw error;
    if (data) set(s => ({ accounts: [...s.accounts, data] }));
  },

  updateAccount: async (id, input) => {
    const { data, error } = await supabase
      .from('accounts')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (data) set(s => ({ accounts: s.accounts.map(a => a.id === id ? data : a) }));
  },

  updateAccountBalance: async (id, newBalance) => {
    await supabase
      .from('accounts')
      .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', id);
    set(s => ({
      accounts: s.accounts.map(a => a.id === id ? { ...a, current_balance: newBalance } : a),
    }));
  },

  // ─── Card CRUD ──────────────────────────────────────────

  createCard: async (householdId, input) => {
    const maxOrder = Math.max(0, ...get().cards.map(c => c.display_order));
    const { data, error } = await supabase
      .from('cards')
      .insert({ household_id: householdId, display_order: maxOrder + 1, ...input })
      .select('*, linked_account:accounts(*)')
      .single();
    if (error) throw error;
    if (data) set(s => ({ cards: [...s.cards, data] }));
  },

  updateCard: async (id, input) => {
    const { data, error } = await supabase
      .from('cards')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, linked_account:accounts(*)')
      .single();
    if (error) throw error;
    if (data) set(s => ({ cards: s.cards.map(c => c.id === id ? data : c) }));
  },

  // ─── Recurring CRUD ────────────────────────────────────

  createRecurring: async (householdId, input) => {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert({ household_id: householdId, ...input })
      .select('*, category:categories(*)')
      .single();
    if (error) throw error;
    if (data) set(s => ({ recurringTransactions: [...s.recurringTransactions, data] }));
  },

  updateRecurring: async (id, input) => {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, category:categories(*)')
      .single();
    if (error) throw error;
    if (data) set(s => ({
      recurringTransactions: s.recurringTransactions.map(r => r.id === id ? data : r),
    }));
  },

  toggleRecurring: async (id, isActive) => {
    await get().updateRecurring(id, { is_active: isActive } as any);
  },

  deleteRecurring: async (id) => {
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', id);
    if (error) throw error;
    set(s => ({ recurringTransactions: s.recurringTransactions.filter(r => r.id !== id) }));
  },

  // ─── Category CRUD ──────────────────────────────────────

  createCategory: async (householdId, input) => {
    const maxOrder = Math.max(0, ...get().categories
      .filter(c => c.type === input.type && !c.parent_id)
      .map(c => c.display_order));
    const { data, error } = await supabase
      .from('categories')
      .insert({ household_id: householdId, display_order: maxOrder + 1, is_active: true, ...input })
      .select()
      .single();
    if (error) throw error;
    if (data) set(s => ({ categories: [...s.categories, data] }));
  },

  updateCategory: async (id, input) => {
    const { data, error } = await supabase
      .from('categories')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (data) set(s => ({ categories: s.categories.map(c => c.id === id ? data : c) }));
  },

  deleteCategory: async (id) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
    set(s => ({ categories: s.categories.filter(c => c.id !== id) }));
  },

  // ─── Account/Card delete ─────────────────────────────────

  deleteAccount: async (id) => {
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
    set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));
  },

  deleteCard: async (id) => {
    const { error } = await supabase
      .from('cards')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw error;
    set(s => ({ cards: s.cards.filter(c => c.id !== id) }));
  },

  // ─── Business Logic ────────────────────────────────────

  generateMonthlyRecurring: async (householdId, yearMonth) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = getMonthStart(yearMonth);
    const monthEnd = getMonthEnd(yearMonth);
    const { recurringTransactions } = get();

    const toGenerate = recurringTransactions.filter(r => {
      if (!r.is_active) return false;
      if (r.start_date > monthEnd) return false;
      if (r.end_date && r.end_date < monthStart) return false;
      if (r.last_generated_month === yearMonth) return false;
      return true;
    });

    for (const r of toGenerate) {
      const txDate = getDayInMonth(yearMonth, r.day_of_month);
      await supabase.from('transactions').insert({
        household_id: householdId,
        type: r.type,
        amount: r.amount,
        date: txDate,
        category_id: r.category_id,
        payment_method_type: r.payment_method_type,
        payment_method_id: r.payment_method_id,
        owner: r.owner,
        memo: r.name,
        is_recurring: true,
        recurring_id: r.id,
        created_by: null,
      });

      await supabase
        .from('recurring_transactions')
        .update({ last_generated_month: yearMonth })
        .eq('id', r.id);
    }
  },

  getAccountForecast: (accountId, yearMonth) => {
    const { accounts, transactions, cards, recurringTransactions } = get();
    const account = accounts.find(a => a.id === accountId);
    if (!account) return null;

    const today = format(new Date(), 'yyyy-MM-dd');
    const monthEnd = getMonthEnd(yearMonth);

    // Planned future direct-account transactions this month
    const futureAccountTx = transactions.filter(t =>
      t.payment_method_type === 'account' &&
      t.payment_method_id === accountId &&
      t.date > today &&
      t.date <= monthEnd
    );

    const plannedIncome = futureAccountTx
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const plannedExpense = futureAccountTx
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Card payments from linked cards due this month
    const linkedCards = cards.filter(c => c.linked_account_id === accountId);
    let cardPayments = 0;
    for (const card of linkedCards) {
      const payDate = getDayInMonth(yearMonth, card.payment_day);
      if (payDate > today && payDate <= monthEnd) {
        // Sum card usage from billing period (simplified: this month's usage)
        const usage = transactions
          .filter(t =>
            t.payment_method_type === 'card' &&
            t.payment_method_id === card.id &&
            t.type === 'expense'
          )
          .reduce((sum, t) => sum + t.amount, 0);
        cardPayments += usage;
      }
    }

    // Upcoming recurring not yet generated
    const upcomingRecurring = recurringTransactions.filter(r => {
      if (!r.is_active) return false;
      if (r.payment_method_type !== 'account' || r.payment_method_id !== accountId) return false;
      const txDate = getDayInMonth(yearMonth, r.day_of_month);
      return txDate > today && txDate <= monthEnd;
    });

    const upcomingRecurringIncome = upcomingRecurring
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const upcomingRecurringExpense = upcomingRecurring
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    const forecastBalance =
      account.current_balance +
      plannedIncome - plannedExpense -
      cardPayments +
      upcomingRecurringIncome - upcomingRecurringExpense;

    return {
      account,
      currentBalance: account.current_balance,
      plannedIncome,
      plannedExpense,
      cardPayments,
      upcomingRecurringIncome,
      upcomingRecurringExpense,
      forecastBalance,
      isWarning: forecastBalance < 0,
    };
  },

  getCardForecast: (cardId, yearMonth) => {
    const { cards, accounts, transactions } = get();
    const card = cards.find(c => c.id === cardId);
    if (!card) return null;

    const today = format(new Date(), 'yyyy-MM-dd');
    const paymentDate = getDayInMonth(yearMonth, card.payment_day);

    // This month card usage
    const usageAmount = transactions
      .filter(t =>
        t.payment_method_type === 'card' &&
        t.payment_method_id === cardId &&
        t.type === 'expense'
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const linkedAccount = card.linked_account_id
      ? accounts.find(a => a.id === card.linked_account_id)
      : undefined;

    return {
      card,
      usageAmount,
      forecastPaymentAmount: usageAmount,
      paymentDate,
      linkedAccount,
    };
  },

  getFilteredTransactions: (owner) => {
    const { transactions } = get();
    if (owner === 'all') return transactions;
    return transactions.filter(t => t.owner === owner);
  },

  getMonthSummary: (owner) => {
    const txs = get().getFilteredTransactions(owner);
    return {
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  },

  subscribeRealtime: (householdId) => {
    get().unsubscribeRealtime();

    const channel = supabase
      .channel(`household:${householdId}`)

      // ── Transactions ──────────────────────────────────────
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions',
        filter: `household_id=eq.${householdId}`,
      }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          set(s => ({ transactions: s.transactions.filter(t => t.id !== (payload.old as any).id) }));
          return;
        }

        const txId = (payload.new as any).id;
        const txDate: string = (payload.new as any).date ?? '';

        // 현재 로드된 월 범위 밖이면 무시
        const { loadedYearMonth } = get();
        if (loadedYearMonth) {
          const start = getMonthStart(loadedYearMonth);
          const end = getMonthEnd(loadedYearMonth);
          if (txDate < start || txDate > end) return;
        }

        const { data } = await supabase
          .from('transactions')
          .select('*, category:categories(*)')
          .eq('id', txId)
          .single();

        if (!data) return;

        const { cards, accounts } = get();
        const enriched = {
          ...data,
          card: data.payment_method_type === 'card'
            ? (cards.find(c => c.id === data.payment_method_id) ?? null)
            : null,
          account: data.payment_method_type === 'account'
            ? (accounts.find(a => a.id === data.payment_method_id) ?? null)
            : null,
        };

        if (payload.eventType === 'INSERT') {
          // 내가 직접 추가한 경우 이미 로컬에 있음 → 중복 방지
          set(s => s.transactions.some(t => t.id === enriched.id)
            ? s
            : { transactions: [enriched, ...s.transactions] }
          );
        } else {
          set(s => ({ transactions: s.transactions.map(t => t.id === txId ? enriched : t) }));
        }
      })

      // ── Accounts ──────────────────────────────────────────
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'accounts',
        filter: `household_id=eq.${householdId}`,
      }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          set(s => ({ accounts: s.accounts.filter(a => a.id !== (payload.old as any).id) }));
          return;
        }

        const { data } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', (payload.new as any).id)
          .single();

        if (!data) return;

        if (!data.is_active) {
          set(s => ({ accounts: s.accounts.filter(a => a.id !== data.id) }));
        } else if (payload.eventType === 'INSERT') {
          set(s => s.accounts.some(a => a.id === data.id)
            ? s
            : { accounts: [...s.accounts, data] }
          );
        } else {
          set(s => ({ accounts: s.accounts.map(a => a.id === data.id ? data : a) }));
        }
      })

      // ── Cards ─────────────────────────────────────────────
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'cards',
        filter: `household_id=eq.${householdId}`,
      }, async (payload) => {
        if (payload.eventType === 'DELETE') {
          set(s => ({ cards: s.cards.filter(c => c.id !== (payload.old as any).id) }));
          return;
        }

        const { data } = await supabase
          .from('cards')
          .select('*, linked_account:accounts(*)')
          .eq('id', (payload.new as any).id)
          .single();

        if (!data) return;

        if (!data.is_active) {
          set(s => ({ cards: s.cards.filter(c => c.id !== data.id) }));
        } else if (payload.eventType === 'INSERT') {
          set(s => s.cards.some(c => c.id === data.id)
            ? s
            : { cards: [...s.cards, data] }
          );
        } else {
          set(s => ({ cards: s.cards.map(c => c.id === data.id ? data : c) }));
        }
      })

      .subscribe();

    realtimeChannel = channel;
  },

  unsubscribeRealtime: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },
}));
