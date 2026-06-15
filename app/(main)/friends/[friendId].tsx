// 친구 냉장고 화면. 친구가 냉장고를 공개했을 때만 그 친구의 재료를 보여준다.
// 헤더(‹뒤로 + {이름}님의 냉장고 + @{username}) · 필터 탭(전체/냉장/냉동/실온) ·
// 개수+정렬 행 · 재료 목록(FridgeItemRow)을 그린다. 내 냉장고와 달리 추가·편집·삭제는 없다.
import { colors, spacing, typography } from '@/constants/theme';
import FridgeItemRow from '@/components/FridgeItemRow';
import SortSheet, { SORT_LABELS, type SortKey } from '@/components/SortSheet';
import { fetchFriendItems, fetchFriendProfile } from '@/lib/friends';
import { extractErrorMessage } from '@/lib/items';
import type { Profile } from '@/types/friend';
import type { Item, StorageType } from '@/types/item';
import { STORAGE_LABELS } from '@/types/item';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type FilterKey = 'all' | StorageType;

// 필터 탭 정의. 'all'=전체, 나머지는 storage 값으로 필터. (메인 냉장고 화면과 동일)
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'fridge', label: STORAGE_LABELS.fridge },
  { key: 'freezer', label: STORAGE_LABELS.freezer },
  { key: 'room', label: STORAGE_LABELS.room },
];

// 정렬 적용. 메인 냉장고 화면(sortItems)과 동일한 규칙.
// 유통기한순은 날짜 없는 항목을 뒤로 보낸다('YYYY-MM-DD'는 사전식=시간순).
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

export default function FriendFridgeScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>('all'); // 지금 선택된 필터 탭(전체/냉장/냉동/실온)
  const [sort, setSort] = useState<SortKey>('default'); // 지금 선택된 정렬 방식
  const [sortVisible, setSortVisible] = useState(false); // 정렬 선택 시트가 떠 있는지

  useFocusEffect(
    useCallback(() => {
      if (!friendId) return;
      let active = true;
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const p = await fetchFriendProfile(friendId);
          if (!active) return;
          setProfile(p);
          // 비공개 냉장고는 RLS가 어차피 막지만, "공개하지 않음"과
          // "품목 없음"을 구분하려고 공개일 때만 품목을 불러온다.
          setItems(p.fridge_public ? await fetchFriendItems(friendId) : []);
        } catch (e: unknown) {
          if (active) setError(extractErrorMessage(e));
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [friendId]),
  );

  // 필터 → 정렬 순으로 적용된 표시용 목록. (메인 냉장고 화면과 동일)
  const visibleItems = useMemo(() => {
    const filtered = filter === 'all' ? items : items.filter((i) => i.storage === filter);
    return sortItems(filtered, sort);
  }, [items, filter, sort]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? '친구를 찾을 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더: ‹뒤로 + {이름}님의 냉장고 + @{username} (정보 보존, 비주얼만 Figma) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{profile.display_name}님의 냉장고</Text>
        <Text style={styles.subtitle}>@{profile.username}</Text>
      </View>

      {!profile.fridge_public ? (
        <PrivateState />
      ) : (
        <>
          {/* 필터 탭 (메인 냉장고 화면과 동일) */}
          <View style={styles.filterRow}>
            {FILTERS.map((f) => {
              const active = filter === f.key; // 이 탭이 지금 선택된 탭인지
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

          {/* 개수(필터 적용 후) + 정렬 */}
          <View style={styles.countRow}>
            <Text style={styles.countText}>{visibleItems.length}가지 재료</Text>
            <TouchableOpacity style={styles.sortButton} onPress={() => setSortVisible(true)}>
              <Text style={styles.sortText}>{SORT_LABELS[sort]}</Text>
            </TouchableOpacity>
          </View>

          {/* 목록: 걸러지고 정렬된 친구 재료. 카드는 공유 부품(FridgeItemRow) 재사용 */}
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={visibleItems.length === 0 ? styles.emptyContainer : styles.list}
            ListEmptyComponent={<EmptyState filtered={filter !== 'all'} />}
            renderItem={({ item }) => (
              <FridgeItemRow item={item} onPress={() => router.push(`/(main)/item/${item.id}` as never)} />
            )}
          />

          {/* 정렬 선택 시트: sortVisible이 true가 되면 화면 아래에서 올라온다 */}
          <SortSheet
            visible={sortVisible}
            selected={sort}
            onSelect={setSort}
            onClose={() => setSortVisible(false)}
          />
        </>
      )}
    </View>
  );
}

function PrivateState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔒</Text>
      <Text style={styles.emptyTitle}>공개하지 않음</Text>
      <Text style={styles.emptyDesc}>이 친구는 냉장고를 공개하지 않았어요.</Text>
    </View>
  );
}

// 보여줄 재료가 없을 때의 안내. filtered=true면 "해당 보관방식만 비었다",
// false면 "냉장고 전체가 비었다". 친구 화면이라 '추가' 안내 문구는 쓰지 않는다.
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🧊</Text>
      <Text style={styles.emptyTitle}>
        {filtered ? '이 보관방식에는 재료가 없어요' : '냉장고가 비어있어요'}
      </Text>
      <Text style={styles.emptyDesc}>
        {filtered ? '다른 탭을 확인해보세요.' : '아직 등록된 품목이 없어요.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },

  // 헤더
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md, gap: spacing.xs },
  backText: { ...typography.body, color: colors.primary, marginBottom: spacing.xs },
  title: { ...typography.heading1, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary },

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
  sortText: { ...typography.caption, color: colors.textSecondary },

  // 목록
  list: { paddingBottom: spacing.xl },
  emptyContainer: { flex: 1 },

  // 빈/비공개 상태
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { ...typography.heading2, color: colors.textPrimary },
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  errorText: { ...typography.body, color: colors.danger },
});
