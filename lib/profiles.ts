import { supabase } from './supabase';
import type { Profile } from '@/types/friend';

const MY_PROFILE_COLUMNS =
  'id, username, display_name, fridge_public, notify_comments, notify_expiry, created_at';

/** 내 프로필 조회 (마이페이지 표시/설정용). */
export async function fetchMyProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select(MY_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error('프로필 정보가 없습니다. 다시 로그인하거나 관리자에게 문의해주세요.');
  }
  return data as Profile;
}

/** 회원명(display_name) 수정. */
export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId);
  if (error) throw error;
}

/** 냉장고 공개 여부 토글. */
export async function updateFridgePublic(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ fridge_public: value })
    .eq('id', userId);
  if (error) throw error;
}

/** 코멘트 알림 수신 여부 토글. */
export async function updateNotifyComments(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notify_comments: value })
    .eq('id', userId);
  if (error) throw error;
}

/** 소비기한 임박 알림 수신 여부 토글. (수신 동작은 §13-6 이후) */
export async function updateNotifyExpiry(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ notify_expiry: value })
    .eq('id', userId);
  if (error) throw error;
}

/** 비밀번호 변경 (로그인 상태에서 호출). */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
