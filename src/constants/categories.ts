import { CategoryType } from '../types';

export interface DefaultCategory {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  display_order: number;
  parent_id: string | null;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // ── 지출 ──
  { id: 'exp-food',     name: '식비',     type: 'expense', icon: '🍽️',  color: '#EF4444', display_order: 1,  parent_id: null },
  { id: 'exp-food-out', name: '외식',     type: 'expense', icon: '🍜',  color: '#F87171', display_order: 2,  parent_id: 'exp-food' },
  { id: 'exp-food-groc',name: '장보기',   type: 'expense', icon: '🛒',  color: '#FCA5A5', display_order: 3,  parent_id: 'exp-food' },
  { id: 'exp-transport',name: '교통',     type: 'expense', icon: '🚗',  color: '#F59E0B', display_order: 4,  parent_id: null },
  { id: 'exp-housing',  name: '주거',     type: 'expense', icon: '🏠',  color: '#8B5CF6', display_order: 5,  parent_id: null },
  { id: 'exp-medical',  name: '의료',     type: 'expense', icon: '🏥',  color: '#10B981', display_order: 6,  parent_id: null },
  { id: 'exp-shopping', name: '쇼핑',     type: 'expense', icon: '🛍️', color: '#EC4899', display_order: 7,  parent_id: null },
  { id: 'exp-culture',  name: '문화/여가',type: 'expense', icon: '🎮',  color: '#06B6D4', display_order: 8,  parent_id: null },
  { id: 'exp-telecom',  name: '통신',     type: 'expense', icon: '📱',  color: '#6366F1', display_order: 9,  parent_id: null },
  { id: 'exp-edu',      name: '교육',     type: 'expense', icon: '📚',  color: '#84CC16', display_order: 10, parent_id: null },
  { id: 'exp-sub',      name: '구독',     type: 'expense', icon: '📺',  color: '#0EA5E9', display_order: 11, parent_id: null },
  { id: 'exp-insurance',name: '보험',     type: 'expense', icon: '🛡️', color: '#64748B', display_order: 12, parent_id: null },
  { id: 'exp-beauty',   name: '미용',     type: 'expense', icon: '💄',  color: '#F472B6', display_order: 13, parent_id: null },
  { id: 'exp-pet',      name: '반려동물', type: 'expense', icon: '🐾',  color: '#A78BFA', display_order: 14, parent_id: null },
  { id: 'exp-etc',      name: '기타지출', type: 'expense', icon: '💸',  color: '#9CA3AF', display_order: 99, parent_id: null },

  // ── 수입 ──
  { id: 'inc-salary',   name: '급여',          type: 'income', icon: '💰', color: '#10B981', display_order: 1,  parent_id: null },
  { id: 'inc-bonus',    name: '상여/보너스',   type: 'income', icon: '🎁', color: '#34D399', display_order: 2,  parent_id: null },
  { id: 'inc-freelance',name: '부업/프리랜서', type: 'income', icon: '💼', color: '#6EE7B7', display_order: 3,  parent_id: null },
  { id: 'inc-invest',   name: '투자수익',      type: 'income', icon: '📈', color: '#A7F3D0', display_order: 4,  parent_id: null },
  { id: 'inc-etc',      name: '기타수입',      type: 'income', icon: '💵', color: '#9CA3AF', display_order: 99, parent_id: null },

  // ── 저축 ──
  { id: 'sav-savings',  name: '저축',   type: 'savings', icon: '🏦', color: '#06B6D4', display_order: 1, parent_id: null },
  { id: 'sav-emergency',name: '비상금', type: 'savings', icon: '🔒', color: '#0891B2', display_order: 2, parent_id: null },

  // ── 투자 ──
  { id: 'inv-stock', name: '주식',    type: 'investment', icon: '📊', color: '#F59E0B', display_order: 1, parent_id: null },
  { id: 'inv-fund',  name: '펀드/ETF',type: 'investment', icon: '📉', color: '#FBBF24', display_order: 2, parent_id: null },
  { id: 'inv-real',  name: '부동산',  type: 'investment', icon: '🏢', color: '#FCD34D', display_order: 3, parent_id: null },

  // ── 이체 ──
  { id: 'trf-transfer', name: '이체',    type: 'transfer', icon: '🔄', color: '#6B7280', display_order: 1, parent_id: null },
  { id: 'trf-card-pay', name: '카드결제',type: 'transfer', icon: '💳', color: '#4B5563', display_order: 2, parent_id: null },
];

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking:   '입출금',
  savings:    '저축',
  emergency:  '비상금',
  investment: '투자',
  etc:        '기타',
};

export const CARD_TYPE_LABELS: Record<string, string> = {
  credit: '신용',
  debit:  '체크',
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income:   '수입',
  expense:  '지출',
  transfer: '이체',
};
