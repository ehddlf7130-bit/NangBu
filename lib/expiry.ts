import { supabase } from './supabase';
import type { CategoryExpiry } from '@/types/expiry';
import { masterDaysFor } from '@/types/ingredient';
import type { IngredientMaster } from '@/types/ingredient';
import type { StorageType } from '@/types/item';

/** 한 카테고리의 보관방식별 소비기한 설정 전체 조회 (설정 화면용). */
export async function fetchCategoryExpiries(
  userId: string,
  category: string,
): Promise<CategoryExpiry[]> {
  const { data, error } = await supabase
    .from('category_expiry')
    .select('*')
    .eq('owner_id', userId)
    .eq('category', category);
  if (error) throw error;
  return data ?? [];
}

/** (카테고리 + 보관방식) 조합의 기본 일수 조회. 없으면 null (등록 자동 채우기용). */
export async function fetchExpiryDays(
  userId: string,
  category: string,
  storage: StorageType,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('category_expiry')
    .select('default_days')
    .eq('owner_id', userId)
    .eq('category', category)
    .eq('storage', storage)
    .maybeSingle();
  if (error) throw error;
  return data?.default_days ?? null;
}

/** (카테고리 + 보관방식) 조합의 일수 저장 (있으면 갱신). */
export async function upsertCategoryExpiry(
  userId: string,
  category: string,
  storage: StorageType,
  days: number,
): Promise<void> {
  const { error } = await supabase
    .from('category_expiry')
    .upsert(
      { owner_id: userId, category, storage, default_days: days },
      { onConflict: 'owner_id,category,storage' },
    );
  if (error) throw error;
}

/** (카테고리 + 보관방식) 조합의 설정 삭제 (입력칸을 비우고 저장한 경우). */
export async function deleteCategoryExpiry(
  userId: string,
  category: string,
  storage: StorageType,
): Promise<void> {
  const { error } = await supabase
    .from('category_expiry')
    .delete()
    .eq('owner_id', userId)
    .eq('category', category)
    .eq('storage', storage);
  if (error) throw error;
}

/**
 * 등록 시 유통기한 자동 채움용 일수 결정 — 우선순위 체인 (§13-7).
 *   ① category_expiry 개인값(있으면 0 포함하여 우선 — 사용자 명시 의도)
 *   ② ingredient_master 표준 일수(>0일 때만 — 0은 비권장이라 제외)
 *   ③ 둘 다 없으면 null → 호출부에서 유통기한 빈칸 유지
 * 반환 null이면 자동 채우지 않는다(사용자가 직접 입력).
 */
export async function resolveExpiryDays(
  userId: string,
  category: string,
  storage: StorageType,
  ingredient?: IngredientMaster | null,
): Promise<number | null> {
  const personal = await fetchExpiryDays(userId, category, storage);
  if (personal != null) return personal; // 개인값 우선 (0 = '오늘까지'도 유효한 설정)
  if (ingredient) {
    const days = masterDaysFor(ingredient, storage);
    if (days > 0) return days; // 0 = 비권장 → 자동 계산에서 제외
  }
  return null;
}

/** 오늘 + days 를 'YYYY-MM-DD' 문자열로 반환 (등록 시 유통기한 자동 채우기). */
export function addDaysToToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
