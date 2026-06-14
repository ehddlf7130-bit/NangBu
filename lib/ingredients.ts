import { supabase } from './supabase';
import type { IngredientMaster } from '@/types/ingredient';

// 표준 재료 대표 이미지가 저장된 public Storage 버킷 이름.
const INGREDIENT_IMAGES_BUCKET = 'ingredient-images';

/** image_path(파일명)를 public URL로 변환. null/빈값이면 null(화면에서 placeholder). */
export function ingredientImageUrl(imagePath: string | null | undefined): string | null {
  const path = imagePath?.trim();
  if (!path) return null;
  return supabase.storage.from(INGREDIENT_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 한 카테고리의 표준 식재료 목록 조회 (등록 - 표준재료 선택 화면용). 읽기 전용 마스터. */
export async function fetchIngredientsByCategory(
  category: string,
): Promise<IngredientMaster[]> {
  const { data, error } = await supabase
    .from('ingredient_master')
    .select('*')
    .eq('category', category)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

/** 이름 부분일치로 표준 식재료 검색 (카테고리 무관, 통합 등록 화면 검색용). 인증 SELECT 정책 내 동작. */
export async function searchIngredients(keyword: string): Promise<IngredientMaster[]> {
  const kw = keyword.trim();
  if (!kw) return [];
  const { data, error } = await supabase
    .from('ingredient_master')
    .select('*')
    .ilike('name', `%${kw}%`)
    .order('name')
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

/** 표준 식재료 단건 조회 (선택 후 등록 화면 프리필용). */
export async function fetchIngredientById(id: string): Promise<IngredientMaster> {
  const { data, error } = await supabase
    .from('ingredient_master')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
