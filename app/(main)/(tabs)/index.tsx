// 냉장고 메인 화면 (로그인 후 첫 화면 · 하단 탭의 '냉장고' 탭).
// 헤더(로고+알림종+추가) · 필터 탭(전체/냉장/냉동/실온) · 개수+정렬 행 · 재료 목록(FridgeItemRow)을 그린다.
// 행을 길게 누르면 삭제, 우상단 정렬 버튼으로 SortSheet 바텀시트를 띄운다.
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
  const { user } = useAuth(); // 지금 로그인한 사용자 정보. 이 사람의 재료만 불러온다
  // state = "화면이 기억하는 값". 이 값이 바뀌면 화면이 자동으로 다시 그려진다.
  const [items, setItems] = useState<Item[]>([]); // 서버에서 불러온 내 재료 전체 목록
  const [loading, setLoading] = useState(true); // 재료를 불러오는 중인지. true면 로딩 동그라미를 보여준다
  const [error, setError] = useState<string | null>(null); // 불러오기 실패 메시지. 값이 있으면 목록 대신 에러 문구를 보여준다

  const [filter, setFilter] = useState<FilterKey>('all'); // 지금 선택된 필터 탭(전체/냉장/냉동/실온). 바뀌면 목록을 다시 걸러낸다
  const [sort, setSort] = useState<SortKey>('default'); // 지금 선택된 정렬 방식. 바뀌면 목록 순서가 다시 정렬된다
  const [sortVisible, setSortVisible] = useState(false); // 정렬 선택 시트가 떠 있는지. true면 화면 아래에서 시트가 올라온다

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

  // 로딩 중 / 에러 시 목록 대신 화면 전체를 대체 표시.
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
            onPress={() => router.push('/(main)/register/ingredient' as never)}
          >
            <Text style={styles.addButtonText}>＋ 추가</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. 필터 탭 */}
      <View style={styles.filterRow}>
        {/* 탭 4개를 하나씩 그린다. 지금 고른 탭(active)만 글자색·밑줄로 강조한다 */}
        {FILTERS.map((f) => {
          const active = filter === f.key; // 이 탭이 지금 선택된 탭인지
          return (
            <TouchableOpacity
              key={f.key}
              // active일 때만 filterTabActive(밑줄 강조)를 덧입힌다
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

      {/* 4. 목록: 걸러지고 정렬된 재료를 한 줄씩 보여준다 (한 줄 = FridgeItemRow 부품) */}
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        // 목록이 비었으면 가운데 정렬용 틀, 아니면 일반 목록 여백
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyContainer : styles.list}
        // 보여줄 재료가 하나도 없을 때 대신 보여줄 안내 화면
        ListEmptyComponent={<EmptyState filtered={filter !== 'all'} />}
        renderItem={({ item }) => (
          <FridgeItemRow
            item={item}
            onPress={() => router.push(`/(main)/item/${item.id}` as never)}
            onLongPress={() => handleDelete(item)}
          />
        )}
      />

      {/* 정렬 선택 시트: 평소엔 숨어 있다가 sortVisible이 true가 되면 화면 아래에서 올라온다 */}
      <SortSheet
        visible={sortVisible}
        selected={sort}
        onSelect={setSort}
        onClose={() => setSortVisible(false)}
      />
    </View>
  );
}

// 재료가 하나도 없을 때 목록 자리에 보여주는 안내(아이콘+제목+설명).
// filtered=true면 "특정 탭만 비었다", false면 "냉장고 전체가 비었다"는 문구를 보여준다.
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

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, // 화면 전체를 감싸는 바깥 틀(배경색)
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, // 로딩 동그라미·에러 문구를 화면 한가운데 놓는 틀

  // 헤더
  header: { // 맨 위 헤더 줄 — 왼쪽 로고와 오른쪽 버튼들을 양끝으로 벌려 배치
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  logo: { ...typography.heading1, color: colors.textPrimary }, // 헤더 왼쪽 '냉부' 로고 글자
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, // 헤더 오른쪽 묶음(알림 종 + 추가 버튼)을 가로로 나란히
  addButton: { // '＋ 추가' 버튼의 배경·테두리 모양
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  addButtonText: { ...typography.caption, color: colors.primary, fontWeight: typography.heading2.fontWeight }, // '＋ 추가' 버튼 안 글자

  // 필터 탭
  filterRow: { // 필터 탭 4개를 가로로 늘어놓는 줄(아래쪽 얇은 구분선 포함)
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterTab: { // 필터 탭 한 칸의 여백과 밑줄 자리(평소엔 밑줄 투명)
    paddingVertical: spacing.sm,
    marginRight: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: { borderBottomColor: colors.primary }, // 지금 선택된 탭에만 색 밑줄을 켠다
  filterText: { ...typography.body, color: colors.textSecondary }, // 필터 탭 글자(평소: 흐린 색)
  filterTextActive: { color: colors.primary, fontWeight: typography.heading2.fontWeight }, // 선택된 탭 글자(강조 색+굵게)

  // 개수 + 정렬
  countRow: { // 'N개의 재료'와 정렬 버튼을 한 줄에 양끝으로 둔 줄
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  countText: { ...typography.caption, color: colors.textSecondary }, // 'N개의 재료' 글자
  sortButton: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs }, // 정렬 버튼의 터치 영역
  sortText: { ...typography.caption, color: colors.textPrimary }, // 정렬 버튼 글자(예: '기본순 ▾')

  // 목록
  list: { paddingBottom: spacing.xl }, // 재료 목록이 있을 때 아래쪽 여백
  emptyContainer: { flex: 1 }, // 목록이 비었을 때 빈 화면을 가운데로 채우기 위한 틀

  // 빈 상태
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: 80 }, // 빈 상태 안내(아이콘+제목+설명)를 화면 가운데 모음
  emptyIcon: { fontSize: 48 }, // 빈 상태 큰 이모지(🧊)
  emptyTitle: { ...typography.heading2, color: colors.textPrimary }, // 빈 상태 제목 글자
  emptyDesc: { ...typography.body, color: colors.textSecondary, textAlign: 'center' }, // 빈 상태 설명 글자
  errorText: { ...typography.body, color: colors.danger }, // 에러 메시지 글자(빨간색)
});
