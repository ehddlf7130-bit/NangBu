import { CATEGORIES } from '@/constants/categories';
import { button, colors, radius, spacing, typography } from '@/constants/theme';
import { fetchIngredientsByCategory, searchIngredients } from '@/lib/ingredients';
import { extractErrorMessage } from '@/lib/items';
import type { IngredientMaster } from '@/types/ingredient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLS = 3;
const GAP = spacing.sm;
const GRID_PAD = spacing.md;
const MAX_THUMB = 72;
const CHECK_SIZE = 28;

// 카테고리 선택 + 표준 재료 선택을 한 화면으로 통합(좌 사이드바 + 우 그리드).
export default function IngredientScreen() {
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<IngredientMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IngredientMaster | null>(null);
  const [rightWidth, setRightWidth] = useState(0);

  const searching = keyword.trim().length > 0;

  // 검색어가 있으면 전체에서 이름 검색, 없으면 선택된 카테고리 목록.
  useEffect(() => {
    const kw = keyword.trim();
    let active = true;
    setLoading(true);
    setError(null);

    if (!kw) {
      fetchIngredientsByCategory(selectedCategory)
        .then((d) => { if (active) setItems(d); })
        .catch((e) => { if (active) setError(extractErrorMessage(e)); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }

    // 검색은 입력이 멈춘 뒤 조회(디바운스).
    const t = setTimeout(() => {
      searchIngredients(kw)
        .then((d) => { if (active) setItems(d); })
        .catch((e) => { if (active) setError(extractErrorMessage(e)); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [keyword, selectedCategory]);

  // 카테고리 탭 → 검색 종료 + 해당 카테고리로.
  function selectCategory(cat: string) {
    setKeyword('');
    setSelectedCategory(cat);
  }

  // 선택 확정 → 등록 폼으로 ingredientId 전달(기존 파라미터 흐름 유지).
  function confirmSelect() {
    if (!selected) return;
    router.push({
      pathname: '/(main)/register/new' as never,
      params: { category: selected.category, ingredientId: selected.id },
    });
  }

  // 직접 입력(바이패스) → ingredientId 없이 등록 폼으로. 현재 카테고리를 프리필.
  function manualEntry() {
    router.push({ pathname: '/(main)/register/new' as never, params: { category: selectedCategory } });
  }

  const cellWidth = rightWidth > 0
    ? Math.floor((rightWidth - GRID_PAD * 2 - GAP * (COLS - 1)) / COLS)
    : 0;
  const thumbSize = Math.min(cellWidth, MAX_THUMB);

  return (
    <View style={styles.container}>
      {/* 1. 헤더: 뒤로가기 + 직접 입력 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.manualButton} onPress={manualEntry} hitSlop={8}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.manualText}>직접 입력</Text>
        </TouchableOpacity>
      </View>

      {/* 2. 검색바 */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={keyword}
          onChangeText={setKeyword}
          placeholder="검색어를 입력해 주세요"
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching && (
          <TouchableOpacity onPress={() => setKeyword('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
      </View>

      {/* 3. 개수 */}
      <Text style={styles.count}>총 {items.length}개</Text>

      {/* 4. 본문 2단 */}
      <View style={styles.body}>
        {/* 좌: 카테고리 사이드바 */}
        <ScrollView
          style={styles.sidebar}
          contentContainerStyle={styles.sidebarContent}
          showsVerticalScrollIndicator={false}
        >
          {CATEGORIES.map((cat) => {
            const active = !searching && cat === selectedCategory;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catItem, active && styles.catItemActive]}
                onPress={() => selectCategory(cat)}
              >
                <Text
                  style={[styles.catText, active && styles.catTextActive]}
                  numberOfLines={2}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 우: 재료 3열 그리드 */}
        <View
          style={styles.rightArea}
          onLayout={(e) => setRightWidth(e.nativeEvent.layout.width)}
        >
          {rightWidth > 0 && (
            loading ? (
              <ActivityIndicator style={styles.loading} color={colors.primary} />
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(it) => it.id}
                numColumns={COLS}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={[
                  styles.gridContent,
                  { paddingBottom: selected ? button.height + insets.bottom + spacing.xl : spacing.lg },
                ]}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {searching
                      ? `‘${keyword.trim()}’ 검색 결과가 없어요.`
                      : '이 카테고리에 표준 재료가 없어요.'}
                  </Text>
                }
                renderItem={({ item }) => {
                  const isSel = selected?.id === item.id;
                  return (
                    <TouchableOpacity
                      style={[styles.cell, { width: cellWidth }]}
                      onPress={() => setSelected(item)}
                    >
                      <View style={[styles.thumbWrap, { width: thumbSize, height: thumbSize }]}>
                        <View
                          style={[
                            styles.thumb,
                            { width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2 },
                            isSel && styles.thumbSelected,
                          ]}
                        />
                        {isSel && (
                          <View style={styles.checkOverlay}>
                            <Ionicons name="checkmark-circle" size={CHECK_SIZE} color={colors.primary} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={[styles.cellName, isSel && styles.cellNameSelected]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )
          )}
        </View>
      </View>

      {/* 선택 시에만 노출되는 하단 고정 확정 버튼 */}
      {selected && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity style={styles.selectButton} onPress={confirmSelect}>
            <Text style={styles.selectButtonText}>‘{selected.name}’ 재료를 선택했어요</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  manualButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  manualText: { ...typography.body, color: colors.primary, fontWeight: typography.heading2.fontWeight },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 },

  count: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },

  body: { flex: 1, flexDirection: 'row' },

  // 사이드바 — 폭은 퍼센트로 고정(ScrollView는 flex 비율이 콘텐츠 영향으로 정확히 안 잡힘).
  // 이 값만 바꾸면 좌:우 비율 조절. (예: '30%' → 3:7, '40%' → 4:6)
  sidebar: { width: '1%', backgroundColor: colors.surface },
  sidebarContent: { paddingBottom: spacing.xl },
  catItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  catItemActive: { backgroundColor: colors.background, borderLeftColor: colors.primary },
  catText: { ...typography.caption, color: colors.textSecondary },
  catTextActive: { color: colors.primary, fontWeight: typography.heading2.fontWeight },

  // 그리드 — 사이드바 폭을 뺀 나머지 전부.
  rightArea: { flex: 2 },
  loading: { marginTop: spacing.xl },
  error: { ...typography.body, color: colors.danger, padding: spacing.lg },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.xl },
  gridContent: { padding: GRID_PAD },
  gridRow: { gap: GAP, marginBottom: GAP },
  cell: { alignItems: 'center', gap: spacing.xs },
  thumbWrap: { alignItems: 'center', justifyContent: 'center' },
  thumb: { backgroundColor: colors.thumbnail },
  thumbSelected: { borderWidth: 2, borderColor: colors.primary },
  checkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellName: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' },
  cellNameSelected: { color: colors.primary, fontWeight: typography.heading2.fontWeight },

  // 하단 고정 버튼
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  selectButton: {
    height: button.height,
    borderRadius: button.radius,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: { ...typography.body, color: colors.background, fontWeight: typography.heading1.fontWeight },
});
