import { useAuthStore } from '../stores/authStore';

/**
 * 현재 로그인한 사용자 관점에서 owner 라벨을 반환합니다.
 * - 'me'    → 나
 * - 'spouse' → 상대방의 display_name (미가입 시 '와이프' 폴백)
 * - 'joint'  → 공동
 *
 * 와이프 입장에서는 'spouse' owner가 '나', 'me' owner가 남편 이름.
 */
export function useOwnerLabels(): Record<string, string> {
  const { member, members } = useAuthStore();
  const myRole = member?.role; // 'me' | 'spouse'

  const meMember    = members.find(m => m.role === 'me');
  const spouseMember = members.find(m => m.role === 'spouse');

  return {
    me:     myRole === 'me'     ? '나' : (meMember?.display_name    ?? '남편'),
    spouse: myRole === 'spouse' ? '나' : (spouseMember?.display_name ?? '와이프'),
    joint:  '공동',
    all:    '전체',
  };
}
