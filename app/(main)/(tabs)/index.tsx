import { colors, radius, spacing, typography } from '@/constants/theme';
import FridgeItemRow from '@/components/FridgeItemRow';
import NotificationBell from '@/components/NotificationBell';
import SortSheet, { SORT_LABELS, type SortKey } from '@/components/SortSheet';
import { useAuth } from '@/contexts/AuthContext';
import { deleteItem, extractErrorMessage, fetchMyItems } from '@/lib/items';
import type { Item, StorageType } from '@/types/item';
import { STORAGE_LABELS } from '@/types/item';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

type FilterKey = 'all' | StorageType;

// 필터 탭 정의. 'all'=전체, 나머지는 storage 값으로 필터.
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'fridge', label: STORAGE_LABELS.fridge },
  { key: 'freezer', label: STORAGE_LABELS.freezer },
  { key: 'room', label: STORAGE_LABELS.room },
];

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

// 정렬 적용. 유통기한순은 날짜 없는 항목을 뒤로 보낸다('YYYY-MM-DD'는 사전식=시간순).
function sortItems(items: Item[], sort: SortKey): Item[] {
  if (sort === 'name') {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }
  if (sort === 'expiry') {
    return [...items].sort((a, b) => {
      if (!a.expire_date) return 1;
      if (!b.expire_date) return -1;
      return a.expire_date.localeCompare(b.expire_date);
    });
  }
  return items; // default = 불러온 순서 유지
}

// 로그인 후 첫 화면이자 '냉장고' 탭 = 나의 냉장고 목록.
export default function FridgeScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('default');
  const [sortVisible, setSortVisible] = useState(false);

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

  // 필터 → 정렬 순으로 적용된 표시용 목록.
  const visibleItems = useMemo(() => {
    const filtered = filter === 'all' ? items : items.filter((i) => i.storage === filter);
    return sortItems(filtered, sort);
  }, [items, filter, sort]);

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
      {/* 1. 헤더: 로고 + 종 + 추가 */}
      <View style={styles.header}>
        <Text style={styles.logo}>냉부</Text>
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

      {/* 2. 필터 탭 */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. 개수 + 정렬 */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>{visibleItems.length}개의 재료</Text>
        <TouchableOpacity style={styles.sortButton} onPress={() => setSortVisible(true)}>
          <Text style={styles.sortText}>{SORT_LABELS[sort]} ▾</Text>
        </TouchableOpacity>
      </View>

      {/* 4. 목록 */}
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState filtered={filter !== 'all'} />}
        renderItem={({ item }) => (
          <FridgeItemRow
            item={item}
            onPress={() => router.push(`/(main)/item/${item.id}` as never)}
            onLongPress={() => handleDelete(item)}
          />
        )}
      />

      <SortSheet
        visible={sortVisible}
        selected={sort}
        onSelect={setSort}
        onClose={() => setSortVisible(false)}
      />
    </View>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧊</Text>
      <Text style={styles.emptyTitle}>
        {filtered ? '이 보관방식에는 재료가 없어요' : '냉장고가 비어있어요'}
      </Text>
      <Text style={styles.emptyDesc}>
        {filtered ? '다른 탭을 확인하거나 ＋ 추가 버튼으로 등록해보세요.' : '오른쪽 위 ＋ 추가 버튼으로 식재료를 등록해보세요.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  // 헤더
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  logo: { ...typography.heading1, color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  addButtonText: { ...typography.caption, color: colors.primary, fontWeight: typography.heading2.fontWeight },

  // 필터 탭
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    marginRight: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: { borderBottomColor: colors.primary },
  filterText: { ...typography.body, color: colors.textSecondary },
  filterTextActive: { color: colors.primary, fontWeight: typography.heading2.fontWeight },

  // 개수 + 정렬
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  countText: { ...typography.caption, color: colors.textSecondary },
  sortButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  sortText: { ...typography.caption, color: colors.textPrimary },

  // 목록
  list: { paddingBottom: spacing.xl },
  emptyContainer: { flex: 1 },

  // 빈 상태
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.heading2, color: colors.textPrimary },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  errorText: { ...typography.body, color: colors.danger },
});
