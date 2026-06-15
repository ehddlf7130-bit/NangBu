import { supabase } from './supabase';
import { colors } from '@/constants/theme';
import type { CategoryExpiry, IngredientExpiry } from '@/types/expiry';
import { masterDaysFor } from '@/types/ingredient';
import type { IngredientMaster } from '@/types/ingredient';
import type { StorageType } from '@/types/item';

// D-day 상태 임계값 (일수). 이 값 기준으로 상태 색(getDdayColor)이 갈린다.
export const DDAY_DANGER_THRESHOLD = 3;   // dday <= 3 → danger
export const DDAY_WARNING_THRESHOLD = 14; // dday <= 14 → warning

/**
 * 오늘부터 소비기한까지 남은 일수(달력 기준).
 * 양수=아직 남음, 0=오늘까지, 음수=지남.
 * 시·분 영향 없이 날짜만 비교하기 위해 둘 다 자정으로 맞춘다.
 */
export function getDday(expireDate: string): number {
  const [y, m, d] = expireDate.split('T')[0].split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

/**
 * D-day에 따른 상태 색(theme 토큰 반환).
 *   dday <= 3  → danger
 *   dday <= 14 → warning
 *   그 외       → primary
 */
export function getDdayColor(dday: number): string {
  if (dday <= DDAY_DANGER_THRESHOLD) return colors.danger;
  if (dday <= DDAY_WARNING_THRESHOLD) return colors.warning;
  return colors.primary;
}

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

// ─────────────────────────────────────────────────────────────
// ingredient_expiry: (표준 재료 + 보관방식)별 개인 소비기한 (자동채움 1순위)
// ─────────────────────────────────────────────────────────────

/** 한 표준 재료의 보관방식별 개인 소비기한 설정 전체 조회 (재료 단위 설정 화면용). */
export async function fetchIngredientExpiries(
  userId: string,
  ingredientId: string,
): Promise<IngredientExpiry[]> {
  const { data, error } = await supabase
    .from('ingredient_expiry')
    .select('*')
    .eq('owner_id', userId)
    .eq('ingredient_id', ingredientId);
  if (error) throw error;
  return data ?? [];
}

/** (재료 + 보관방식) 조합의 개인 일수 저장 (있으면 갱신). owner_id는 현재 세션 유저. */
export async function upsertIngredientExpiry(
  userId: string,
  ingredientId: string,
  storage: StorageType,
  days: number,
): Promise<void> {
  const { error } = await supabase
    .from('ingredient_expiry')
    .upsert(
      { owner_id: userId, ingredient_id: ingredientId, storage, default_days: days },
      { onConflict: 'owner_id,ingredient_id,storage' },
    );
  if (error) throw error;
}

/** (재료 + 보관방식) 조합의 개인 설정 삭제 (입력칸을 비우고 저장한 경우). */
export async function deleteIngredientExpiry(
  userId: string,
  ingredientId: string,
  storage: StorageType,
): Promise<void> {
  const { error } = await supabase
    .from('ingredient_expiry')
    .delete()
    .eq('owner_id', userId)
    .eq('ingredient_id', ingredientId)
    .eq('storage', storage);
  if (error) throw error;
}

/** (재료 + 보관방식) 조합의 개인 일수 단건 조회. 없으면 null (자동채움 내부용). */
async function fetchIngredientExpiryDays(
  userId: string,
  ingredientId: string,
  storage: StorageType,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('ingredient_expiry')
    .select('default_days')
    .eq('owner_id', userId)
    .eq('ingredient_id', ingredientId)
    .eq('storage', storage)
    .maybeSingle();
  if (error) throw error;
  return data?.default_days ?? null;
}

/**
 * 등록 시 유통기한 자동 채움용 일수 결정 — 우선순위 체인 (개별 재료 단위로 전환).
 *   ① ingredient_expiry 개인값 (표준 재료 선택 시, owner_id+ingredient_id+storage)
 *   ② ingredient_master 표준 일수(>0일 때만 — 0은 비권장이라 제외)
 *   ③ 둘 다 없으면 null → 호출부에서 유통기한 빈칸 유지
 * 직접 입력(ingredient 없음)은 ingredient_id가 없어 ①②를 건너뛰고 항상 null(수동 입력).
 * 반환 null이면 자동 채우지 않는다.
 */
export async function resolveExpiryDays(
  userId: string,
  storage: StorageType,
  ingredient?: IngredientMaster | null,
): Promise<number | null> {
  if (!ingredient) return null; // 직접 입력 — 자동채움 없음
  const personal = await fetchIngredientExpiryDays(userId, ingredient.id, storage);
  if (personal != null) return personal; // 개인값 우선
  const days = masterDaysFor(ingredient, storage);
  if (days > 0) return days; // 0 = 비권장 → 자동 계산에서 제외
  return null;
}

/** 오늘 + days 를 'YYYY-MM-DD' 문자열로 반환 (등록 시 유통기한 자동 채우기). */
export function addDaysToToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
