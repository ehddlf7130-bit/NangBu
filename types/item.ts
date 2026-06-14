export type StorageType = 'fridge' | 'freezer' | 'room';

export const STORAGE_LABELS: Record<StorageType, string> = {
  fridge: '냉장',
  freezer: '냉동',
  room: '실온',
};

export interface Item {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  storage: StorageType;
  storage_tip: string | null;
  expire_date: string | null; // YYYY-MM-DD
  quantity: number;
  ingredient_id: string | null; // nullable FK → ingredient_master.id (표준 재료 선택 시 연결, 직접 입력이면 null)
  image_path: string | null; // 연결된 ingredient_master의 대표 이미지 파일명(조회 시 평탄화). 미연결·이미지 없음이면 null
  created_at: string;
}

export interface ItemFormValues {
  name: string;
  category: string;
  storage: StorageType;
  storage_tip: string;
  expire_date: string; // YYYY-MM-DD or ''
  quantity: number;
}
