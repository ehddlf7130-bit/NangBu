import ItemForm from '@/components/ItemForm';
import { useAuth } from '@/contexts/AuthContext';
import { fetchExpiryDays } from '@/lib/expiry';
import { createItem } from '@/lib/items';
import type { ItemFormValues, StorageType } from '@/types/item';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function RegisterNewScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { user } = useAuth();

  async function handleSubmit(values: ItemFormValues) {
    if (!user) throw new Error('로그인이 필요합니다.');
    await createItem(user.id, values);
    router.replace('/(main)' as never);
  }

  // 등록 시 (카테고리+보관방식)별 기본 소비기한을 조회 (없으면 null).
  const resolveExpiry = useCallback(
    (cat: string, storage: StorageType) =>
      user ? fetchExpiryDays(user.id, cat, storage) : Promise.resolve(null),
    [user],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>식품 등록</Text>
      <ItemForm
        mode="create"
        initialValues={{ category: category ?? '' }}
        onSubmit={handleSubmit}
        resolveExpiry={resolveExpiry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
});
