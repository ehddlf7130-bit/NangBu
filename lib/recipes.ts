import { supabase } from './supabase';
import type { Recipe, RecipeFormValues } from '@/types/recipe';

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

/** 레시피 추가 (수동 입력). */
export async function createRecipe(
  userId: string,
  values: RecipeFormValues,
): Promise<Recipe> {
  const { data, error } = await supabase
    .from('recipes')
    .insert({
      owner_id: userId,
      title: values.title,
      body: values.body,
      source: 'manual',
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
