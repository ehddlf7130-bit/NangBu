import ItemForm from '@/components/ItemForm';
import { deleteItem, fetchItem, itemToFormValues, updateItem } from '@/lib/items';
import type { Item, ItemFormValues } from '@/types/item';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    fetchItem(itemId)
      .then(setItem)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  }, [itemId]);

  async function handleUpdate(values: ItemFormValues) {
    if (!itemId) return;
    await updateItem(itemId, values);
    router.back();
  }

  function handleDelete() {
    Alert.alert('품목 삭제', `"${item?.name}"을(를) 삭제하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          if (!itemId) return;
          try {
            await deleteItem(itemId);
            router.replace('/(main)/fridge' as never);
          } catch (e: unknown) {
            Alert.alert('오류', e instanceof Error ? e.message : '삭제에 실패했습니다.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '품목을 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  const initialValues: ItemFormValues = itemToFormValues(item);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.name}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>삭제</Text>
        </TouchableOpacity>
      </View>
      <ItemForm mode="edit" initialValues={initialValues} onSubmit={handleUpdate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  deleteButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  errorText: { color: '#ef4444', fontSize: 15 },
});
