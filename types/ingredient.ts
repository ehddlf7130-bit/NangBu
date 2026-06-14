import type { StorageType } from './item';

// ingredient_master 테이블 행: 앱이 기본 제공하는 식재료 표준 보관 정보(읽기 전용). §4-3
export interface IngredientMaster {
  id: string;
  name: string;
  category: string;
  room_days: number;
  fridge_days: number;
  freezer_days: number;
  storage_tip: string | null;
  image_path: string | null; // ingredient-images 버킷 내 파일명(경로 없이). null이면 대표 이미지 없음.
  created_at: string;
}

// 보관방식 → 마스터의 권장 보관 일수. 0 = 해당 보관방식 비권장(자동 유통기한 계산에서 제외).
export function masterDaysFor(ing: IngredientMaster, storage: StorageType): number {
  switch (storage) {
    case 'fridge':
      return ing.fridge_days;
    case 'freezer':
      return ing.freezer_days;
    case 'room':
      return ing.room_days;
  }
}
