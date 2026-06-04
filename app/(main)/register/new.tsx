import ItemForm from '@/components/ItemForm';
import { useAuth } from '@/contexts/AuthContext';
import { resolveExpiryDays } from '@/lib/expiry';
import { fetchIngredientById } from '@/lib/ingredients';
import { createItem } from '@/lib/items';
import type { IngredientMaster } from '@/types/ingredient';
import { masterDaysFor } from '@/types/ingredient';
import type { ItemFormValues, StorageType } from '@/types/item';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

// 권장 보관방식(일수>0) 중 첫 번째를 기본 선택할 때의 우선순위.
const STORAGE_ORDER: StorageType[] = ['fridge', 'freezer', 'room'];

export default function RegisterNewScreen() {
  const { category, ingredientId } = useLocalSearchParams<{
    category: string;
    ingredientId?: string;
  }>();
  const { user } = useAuth();
  const [ingredient, setIngredient] = useState<IngredientMaster | null>(null);
  const [loading, setLoading] = useState(!!ingredientId);

  // 표준 재료를 골라서 들어온 경우에만 마스터 행을 로드(프리필·자동 유통기한용).
  useEffect(() => {
    if (!ingredientId) return;
    let active = true;
    fetchIngredientById(ingredientId)
      .then((ing) => {
        if (active) setIngredient(ing);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ingredientId]);

  async function handleSubmit(values: ItemFormValues) {
    if (!user) throw new Error('로그인이 필요합니다.');
    await createItem(user.id, values, ingredient?.id ?? null);
    router.replace('/(main)' as never);
  }

  // 유통기한 자동 채움: ① 개인값 → ② 마스터 일수(>0) → ③ 빈칸 (§13-7).
  const resolveExpiry = useCallback(
    (cat: string, storage: StorageType) =>
      user
        ? resolveExpiryDays(user.id, cat, storage, ingredient)
        : Promise.resolve(null),
    [user, ingredient],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  // 표준 재료 선택 시: 이름·보관팁 프리필 + 권장(>0) 보관방식 중 첫 번째를 기본 선택.
  const ingredientDays = ingredient
    ? {
        fridge: ingredient.fridge_days,
        freezer: ingredient.freezer_days,
        room: ingredient.room_days,
      }
    : null;
  const recommendedStorage = ingredient
    ? STORAGE_ORDER.find((s) => masterDaysFor(ingredient, s) > 0)
    : undefined;

  const initialValues: Partial<ItemFormValues> = {
    category: category ?? '',
    ...(ingredient
      ? {
          name: ingredient.name,
          storage_tip: ingredient.storage_tip ?? '',
          ...(recommendedStorage ? { storage: recommendedStorage } : {}),
        }
      : {}),
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>식품 등록</Text>
      <ItemForm
        mode="create"
        initialValues={initialValues}
        onSubmit={handleSubmit}
        resolveExpiry={resolveExpiry}
        ingredientDays={ingredientDays}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
});
