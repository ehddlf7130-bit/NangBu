import ItemForm from '@/components/ItemForm';
import { useAuth } from '@/contexts/AuthContext';
import { createItem } from '@/lib/items';
import type { ItemFormValues } from '@/types/item';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function RegisterNewScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const { user } = useAuth();

  async function handleSubmit(values: ItemFormValues) {
    if (!user) throw new Error('로그인이 필요합니다.');
    await createItem(user.id, values);
    router.replace('/(main)' as never);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>식품 등록</Text>
      <ItemForm
        mode="create"
        initialValues={{ category: category ?? '' }}
        onSubmit={handleSubmit}
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
