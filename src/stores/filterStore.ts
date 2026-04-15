import { create } from 'zustand';
import { FilterOwner } from '../types';
import { formatYearMonth } from '../lib/helpers';

interface FilterState {
  selectedOwner: FilterOwner;
  selectedMonth: string; // YYYY-MM

  setOwner: (owner: FilterOwner) => void;
  setMonth: (month: string) => void;
  prevMonth: () => void;
  nextMonth: () => void;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  selectedOwner: 'all',
  selectedMonth: formatYearMonth(),

  setOwner: (owner) => set({ selectedOwner: owner }),
  setMonth: (month) => set({ selectedMonth: month }),

  prevMonth: () => {
    const [year, month] = get().selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 2, 1); // month-2 because JS months are 0-indexed
    set({ selectedMonth: formatYearMonth(d) });
  },

  nextMonth: () => {
    const [year, month] = get().selectedMonth.split('-').map(Number);
    const d = new Date(year, month, 1);
    set({ selectedMonth: formatYearMonth(d) });
  },
}));
