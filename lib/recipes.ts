import { supabase } from './supabase';
import { extractErrorMessage } from './items';
import type { Item } from '@/types/item';
import type {
  AiRecipeResult,
  Recipe,
  RecipeFormValues,
  RecipeSource,
} from '@/types/recipe';

/** 본인 레시피 목록 조회 (최신순). */
export async function fetchMyRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** 레시피 단건 조회. */
export async function fetchRecipe(recipeId: string): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', recipeId)
    .single();
  if (error) throw error;
  return data;
}

/** 레시피 추가 (source 기본값은 수동 입력). */
export async function createRecipe(
  userId: string,
  values: RecipeFormValues,
  source: RecipeSource = 'manual',
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      owner_id: userId,
      title: values.title,
      body: values.body,
      source,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** 레시피 수정 (제목/내용). */
export async function updateRecipe(
  recipeId: string,
  values: RecipeFormValues,
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .update({ title: values.title, body: values.body })
    .eq('id', recipeId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** 레시피 삭제. */
export async function deleteRecipe(recipeId: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
  if (error) throw error;
}

/**
 * AI 레시피 추천 요청.
 * 냉장고 재료에서 name/category/expire_date만 추려 recommend-recipe Edge Function을 호출한다.
 * invoke가 현재 로그인 세션의 JWT를 Authorization 헤더에 자동으로 실어준다.
 */
export async function requestAiRecipe(items: Item[]): Promise<AiRecipeResult> {
  const payload = items.map((item) => ({
    name: item.name,
    category: item.category,
    expire_date: item.expire_date,
  }));

  const { data, error } = await supabase.functions.invoke<AiRecipeResult>(
    'recommend-recipe',
    { body: { items: payload } },
  );

  if (error) throw new Error(extractErrorMessage(error));
  if (!data) throw new Error('레시피 추천 결과를 받지 못했습니다.');
  return data;
}
