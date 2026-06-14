import { supabase } from './supabase';
import type { Item, ItemFormValues } from '@/types/item';

/** items 행을 ItemForm이 받는 폼 값으로 변환한다 (조회·수정 화면 공통). */
export function itemToFormValues(item: Item): ItemFormValues {
  return {
    name: item.name,
    category: item.category,
    storage: item.storage,
    storage_tip: item.storage_tip ?? '',
    expire_date: item.expire_date ?? '',
    quantity: item.quantity,
  };
}

export function extractErrorMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const err = e as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.details === 'string') return err.details;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

// 임베드 조회 행 → Item으로 평탄화. 연결 마스터의 image_path를 끌어올리고 임베드 키는 제거한다.
// ingredient_master가 null(미연결)이거나 image_path가 없으면 image_path: null.
export function flattenItem(row: any): Item {
  const { ingredient_master, ...rest } = row;
  return { ...rest, image_path: ingredient_master?.image_path ?? null };
}

export async function fetchMyItems(userId: string): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*, ingredient_master(image_path)')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(flattenItem);
}

export async function fetchItem(itemId: string): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .select('*, ingredient_master(image_path)')
    .eq('id', itemId)
    .single();
  if (error) throw error;
  return flattenItem(data);
}

export async function createItem(
  userId: string,
  values: ItemFormValues,
  ingredientId?: string | null,
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .insert({
      owner_id: userId,
      name: values.name,
      category: values.category,
      storage: values.storage,
      storage_tip: values.storage_tip || null,
      expire_date: values.expire_date || null,
      quantity: values.quantity,
      ingredient_id: ingredientId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(
  itemId: string,
  values: ItemFormValues,
): Promise<Item> {
  const { data, error } = await supabase
    .from('items')
    .update({
      name: values.name,
      category: values.category,
      storage: values.storage,
      storage_tip: values.storage_tip || null,
      expire_date: values.expire_date || null,
      quantity: values.quantity,
    })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);
  if (error) throw error;
}
