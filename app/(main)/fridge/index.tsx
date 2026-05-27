import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage, fetchMyItems } from '@/lib/items';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/types/item';
import { STORAGE_LABELS } from '@/types/item';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function FridgeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      let active = true;
      setLoading(true);
      setError(null);

      // 임시 디버그: 세션 상태 확인
      supabase.auth.getSession().then(({ data }) => {
        console.log('[Fridge] session exists:', !!data.session);
        console.log('[Fridge] access_token prefix:', data.session?.access_token?.slice(0, 20) ?? 'none');
        console.log('[Fridge] user.id:', user.id);
      });

      fetchMyItems(user.id)
        .then((data) => { if (active) setItems(data); })
        .catch((e: unknown) => {
          if (active) setError(extractErrorMessage(e));
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [user]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>나의 냉장고</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <ItemRow item={item} onPress={() => router.push(`/(main)/fridge/${item.id}` as never)} />
        )}
      />
    </View>
  );
}

function ItemRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const isExpired = item.expire_date ? new Date(item.expire_date) < new Date() : false;
  const isSoon = !isExpired && item.expire_date
    ? (new Date(item.expire_date).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.category}  ·  {STORAGE_LABELS[item.storage]}  ·  {item.quantity}개
        </Text>
      </View>
      {item.expire_date && (
        <Text style={[styles.expireText, isExpired && styles.expired, isSoon && styles.soon]}>
          {isExpired ? '만료' : isSoon ? '임박' : item.expire_date}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧊</Text>
      <Text style={styles.emptyTitle}>냉장고가 비어있어요</Text>
      <Text style={styles.emptyDesc}>식품 등록 메뉴에서 식재료를 추가해보세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowMain: { gap: 4, flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 13, color: '#888' },
  expireText: { fontSize: 13, color: '#888', marginLeft: 8 },
  expired: { color: '#ef4444', fontWeight: '600' },
  soon: { color: '#f59e0b', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center' },
  errorText: { color: '#ef4444', fontSize: 15 },
});
