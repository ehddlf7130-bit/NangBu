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
