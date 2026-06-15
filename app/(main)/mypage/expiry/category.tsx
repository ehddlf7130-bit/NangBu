// 기본 소비기한 설정 - 진입 화면. 재료를 골라 그 재료의 소비기한 설정 화면으로 들어간다.
// 디자인: register/ingredient(좌 카테고리 사이드바 + 우 재료 그리드 + 검색)에서 이식.
// register와 달리 '직접 입력' 바이패스·선택 확정바는 없고, 재료를 탭하면 바로 상세로 push한다.
import { CATEGORIES } from '@/constants/categories';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { fetchIngredientsByCategory, ingredientImageUrl, searchIngredients } from '@/lib/ingredients';
import { extractErrorMessage } from '@/lib/items';
import type { IngredientMaster } from '@/types/ingredient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const COLS = 3;
const GAP = spacing.sm;
const GRID_PAD = spacing.md;
const MAX_THUMB = 72;

export default function ExpiryCategoryScreen() {
  // state = "화면이 기억하는 값". 바뀌면 화면이 다시 그려진다.
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]); // 왼쪽에서 고른 카테고리
  const [keyword, setKeyword] = useState(''); // 검색어. 있으면 카테고리 대신 전체 검색
  const [items, setItems] = useState<IngredientMaster[]>([]); // 오른쪽 그리드 재료 목록
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rightWidth, setRightWidth] = useState(0); // 그리드 영역 실제 폭(3등분 계산용)

  const searching = keyword.trim().length > 0;

  // 검색어가 있으면 전체 이름 검색(디바운스), 없으면 선택 카테고리 목록.
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

    const t = setTimeout(() => {
      searchIngredients(kw)
        .then((d) => { if (active) setItems(d); })
        .catch((e) => { if (active) setError(extractErrorMessage(e)); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [keyword, selectedCategory]);

  function selectCategory(cat: string) {
    setKeyword('');
    setSelectedCategory(cat);
  }

  // 재료 탭 → 그 재료의 소비기한 설정 상세로. 동적 라우트는 앱 컨벤션대로 문자열 형 push
  // (객체 형 + 구체 경로 보간은 ingredientId 파싱이 깨짐). 재료명은 상세에서 master로 조회.
  function openIngredient(item: IngredientMaster) {
    router.push(`/(main)/mypage/expiry/${item.id}` as never);
  }

  const cellWidth = rightWidth > 0
    ? Math.floor((rightWidth - GRID_PAD * 2 - GAP * (COLS - 1)) / COLS)
    : 0;
  const thumbSize = Math.min(cellWidth, MAX_THUMB);

  return (
    <View style={styles.container}>
      {/* 헤더: 뒤로 + 제목 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>기본 소비기한 설정</Text>
      </View>
      <Text style={styles.subtitle}>재료를 선택해 보관 방식별 소비기한을 정해보세요.</Text>

      {/* 검색바 */}
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

      {/* 개수 */}
      <Text style={styles.count}>총 {items.length}개</Text>

      {/* 본문 2단: 좌 카테고리 사이드바 + 우 재료 그리드 */}
      <View style={styles.body}>
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
                <Text style={[styles.catText, active && styles.catTextActive]} numberOfLines={2}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
                contentContainerStyle={styles.gridContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {searching
                      ? `‘${keyword.trim()}’ 검색 결과가 없어요.`
                      : '이 카테고리에 표준 재료가 없어요.'}
                  </Text>
                }
                renderItem={({ item }) => {
                  const uri = ingredientImageUrl(item.image_path);
                  return (
                    <TouchableOpacity
                      style={[styles.cell, { width: cellWidth }]}
                      onPress={() => openIngredient(item)}
                    >
                      <View style={[styles.thumb, { width: thumbSize, height: thumbSize, borderRadius: thumbSize / 2 }]}>
                        {uri && (
                          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        )}
                      </View>
                      <Text style={styles.cellName} numberOfLines={2}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  title: { ...typography.heading2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },

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
  count: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },

  body: { flex: 1, flexDirection: 'row' },
  // 사이드바 폭은 퍼센트로 고정(ScrollView는 flex 비율이 콘텐츠 영향으로 정확히 안 잡힘). 이 값으로 좌:우 비율 조절.
  sidebar: { width: '1%', backgroundColor: colors.surface },
  sidebarContent: { paddingBottom: spacing.xl },
  catItem: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  catItemActive: { backgroundColor: colors.background, borderLeftColor: colors.primary },
  catText: { ...typography.caption, color: colors.textSecondary },
  catTextActive: { color: colors.primary, fontWeight: typography.heading2.fontWeight },

  rightArea: { flex: 2 },
  loading: { marginTop: spacing.xl },
  error: { ...typography.body, color: colors.danger, padding: spacing.lg },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.xl },
  gridContent: { padding: GRID_PAD },
  gridRow: { gap: GAP, marginBottom: GAP },
  cell: { alignItems: 'center', gap: spacing.xs },
  thumb: { backgroundColor: colors.thumbnail, overflow: 'hidden' },
  cellName: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' },
});
