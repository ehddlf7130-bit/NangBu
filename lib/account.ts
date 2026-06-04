import { supabase } from './supabase';

/**
 * 회원 탈퇴 요청.
 * SQL 함수 public.delete_own_account()가 호출자의 profiles 행을 삭제하면
 * FK CASCADE로 연결 데이터와 인증 계정까지 정리된다(void 반환).
 * rpc 호출에 현재 로그인 세션의 JWT가 자동으로 실린다.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
}
