export type RecipeSource = 'manual' | 'ai';

// recipes 테이블 행
export interface Recipe {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  source: RecipeSource;
  created_at: string;
}

// 레시피 입력 폼 값 (추가/수정 공통)
export interface RecipeFormValues {
  title: string;
  body: string;
}
