import type { StorageType } from './item';

// category_expiry 테이블 행: (카테고리 + 보관방식)별 기본 소비기한(일수)
// (레거시) 카테고리 단위 설정 화면 전용. 자동채움은 ingredient_expiry로 전환됨.
export interface CategoryExpiry {
  id: string;
  owner_id: string;
  category: string;
  storage: StorageType;
  default_days: number;
  created_at: string;
}

// ingredient_expiry 테이블 행: (표준 재료 + 보관방식)별 기본 소비기한(일수)
// UNIQUE(owner_id, ingredient_id, storage), default_days > 0
export interface IngredientExpiry {
  id: string;
  owner_id: string;
  ingredient_id: string;
  storage: StorageType;
  default_days: number;
  created_at: string;
}
