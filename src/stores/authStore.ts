import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Household, Member } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  household: Household | null;
  member: Member | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setHousehold: (household: Household | null) => void;
  setMember: (member: Member | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  loadHousehold: (userId: string) => Promise<void>;
  updateMember: (memberId: string, input: { display_name?: string; color?: string }) => Promise<void>;
  updateHousehold: (householdId: string, input: { name?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  household: null,
  member: null,
  isLoading: false,
  isInitialized: false,

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  setHousehold: (household) => set({ household }),
  setMember: (member) => set({ member }),

  initialize: async () => {
    set({ isLoading: true });
    try {
      // AsyncStorage에서 세션 복원
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ session, user: session.user });
        await get().loadHousehold(session.user.id);
      } else {
        // 세션 없으면 명시적으로 null 처리
        set({ session: null, user: null, household: null, member: null });
      }
    } catch (error) {
      console.error('Auth init error:', error);
      set({ session: null, user: null, household: null, member: null });
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  loadHousehold: async (userId: string) => {
    try {
      const { data: member, error: memberErr } = await supabase
        .from('members')
        .select('*, households(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberErr) {
        console.error('loadHousehold error:', memberErr.message, memberErr.code);
        return;
      }
      if (!member) {
        // 가구 없음 - SetupHousehold 화면으로 이동
        set({ household: null, member: null });
        return;
      }

      set({
        member: {
          id: member.id,
          household_id: member.household_id,
          user_id: member.user_id,
          role: member.role,
          display_name: member.display_name,
          color: member.color,
          created_at: member.created_at,
        },
        household: member.households as Household,
      });
    } catch (error) {
      console.error('loadHousehold exception:', error);
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, household: null, member: null });
  },

  updateMember: async (memberId, input) => {
    const { data, error } = await supabase
      .from('members')
      .update(input)
      .eq('id', memberId)
      .select()
      .single();
    if (error) throw error;
    if (data) set(s => ({ member: s.member ? { ...s.member, ...data } : null }));
  },

  updateHousehold: async (householdId, input) => {
    const { data, error } = await supabase
      .from('households')
      .update(input)
      .eq('id', householdId)
      .select()
      .single();
    if (error) throw error;
    if (data) set(s => ({ household: s.household ? { ...s.household, ...data } : null }));
  },
}));
