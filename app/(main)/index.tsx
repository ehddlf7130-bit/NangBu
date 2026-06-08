import { colors, radius } from '@/constants/theme';
import NotificationBell from '@/components/NotificationBell';
import { useAuth } from '@/contexts/AuthContext';
import { deleteItem, extractErrorMessage, fetchMyItems } from '@/lib/items';
import type { Item } from '@/types/item';
import { STORAGE_LABELS } from '@/types/item';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// 삭제 확인. 웹에서는 Alert가 동작하지 않아 window.confirm을 사용한다.
function confirmDelete(name: string, onConfirm: () => void) {
  const message = `"${name}"을(를) 삭제하시겠습니까?`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert('품목 삭제', message, [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: onConfirm },
  ]);
}

// 로그인 후 첫 화면이자 '냉장고' 탭 = 나의 냉장고 목록.
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

      fetchMyItems(user.id)
        .then((data) => { if (active) setItems(data); })
        .catch((e: unknown) => {
          if (active) setError(extractErrorMessage(e));
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [user]),
  );

  function handleDelete(item: Item) {
    confirmDelete(item.name, async () => {
      try {
        await deleteItem(item.id);
        setItems((prev) => prev.filter((x) => x.id !== item.id));
      } catch (e: unknown) {
        const msg = extractErrorMessage(e);
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(msg);
        else Alert.alert('삭제 실패', msg);
      }
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      <View style={styles.header}>
        <Text style={styles.title}>나의 냉장고</Text>
        <View style={styles.headerActions}>
          <NotificationBell />
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(main)/register/category' as never)}
          >
            <Text style={styles.addButtonText}>＋ 추가</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <ItemRow
            item={item}
            onPress={() => router.push(`/(main)/item/${item.id}` as never)}
            onDelete={() => handleDelete(item)}
          />
        )}
      />
    </View>
  );
}

function ItemRow({ item, onPress, onDelete }: { item: Item; onPress: () => void; onDelete: () => void }) {
  const isExpired = item.expire_date ? new Date(item.expire_date) < new Date() : false;
  const isSoon = !isExpired && item.expire_date
    ? (new Date(item.expire_date).getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000
    : false;

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowMain} onPress={onPress}>
        <Text style={styles.rowName}>{item.name}</Text>
        <Text style={styles.rowMeta}>
          {item.category}  ·  {STORAGE_LABELS[item.storage]}  ·  {item.quantity}개
        </Text>
      </TouchableOpacity>
      {item.expire_date && (
        <Text style={[styles.expireText, isExpired && styles.expired, isSoon && styles.soon]}>
          {isExpired ? '만료' : isSoon ? '임박' : item.expire_date}
        </Text>
      )}
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteText}>삭제</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧊</Text>
      <Text style={styles.emptyTitle}>냉장고가 비어있어요</Text>
      <Text style={styles.emptyDesc}>오른쪽 위 ＋ 추가 버튼으로 식재료를 등록해보세요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  addButtonText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  emptyContainer: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowMain: { gap: 4, flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  rowMeta: { fontSize: 13, color: colors.textSecondary },
  expireText: { fontSize: 13, color: colors.textSecondary, marginLeft: 8 },
  expired: { color: colors.danger, fontWeight: '600' },
  soon: { color: colors.warning, fontWeight: '600' },
  deleteButton: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.dangerTintBorder,
  },
  deleteText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 15 },
});
