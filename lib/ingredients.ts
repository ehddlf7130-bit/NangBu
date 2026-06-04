import { supabase } from './supabase';
import type { IngredientMaster } from '@/types/ingredient';

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
