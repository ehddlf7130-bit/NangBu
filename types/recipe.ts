export type RecipeSource = 'manual' | 'ai';

// AI 레시피에 부가 저장되는 메타 (recipes.ai_meta jsonb) — 수동 레시피는 null
export interface RecipeAiMeta {
  cook_time_minutes: number;
  difficulty: number;
  needed_ingredients: NeededIngredient[];
}

// recipes 테이블 행
export interface Recipe {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  source: RecipeSource;
  ai_meta: RecipeAiMeta | null;
  created_at: string;
}

// 레시피 입력 폼 값 (추가/수정 공통)
export interface RecipeFormValues {
  title: string;
  body: string;
}

// AI 추천이 사용을 제안하는, 냉장고에 없는 추가 재료
export interface NeededIngredient {
  name: string;
  amount: string; // 예: "10g", "14.8ml", "1개"
}

// AI 레시피 추천 결과 (recommend-recipe Edge Function 응답)
export interface AiRecipeResult {
  title: string;
  body: string;
  cook_time_minutes: number;
  difficulty: number; // 1~5
  used_ingredients: string[]; // 냉장고에서 사용한 재료(현재 미리보기 미표시)
  needed_ingredients: NeededIngredient[]; // 부족한 재료
}
