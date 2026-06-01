import type { StorageType } from './item';

// category_expiry 테이블 행: (카테고리 + 보관방식)별 기본 소비기한(일수)
export interface CategoryExpiry {
  id: string;
  owner_id: string;
  category: string;
  storage: StorageType;
  default_days: number;
  created_at: string;
}
