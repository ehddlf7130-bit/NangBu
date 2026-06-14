// 등록할 재료를 고르는 화면. 냉장고 메인의 '＋ 추가' 버튼을 누르면 들어온다.
// 화면은 위에서부터 헤더(뒤로가기+직접입력) / 검색바 / 개수 / 본문 2단 순서로 그린다.
// 본문 2단 = 왼쪽 카테고리 목록(사이드바) + 오른쪽 재료 3열 그리드.
// 재료를 하나 고르면 화면 맨 아래에 확정 버튼이 나타나고, 누르면 다음 등록 폼으로 넘어간다.
import { CATEGORIES } from '@/constants/categories';
import { button, colors, radius, spacing, typography } from '@/constants/theme';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLS = 3;
const GAP = spacing.sm;
const GRID_PAD = spacing.md;
const MAX_THUMB = 72;
const CHECK_SIZE = 28;

// 카테고리 선택 + 표준 재료 선택을 한 화면으로 통합(좌 사이드바 + 우 그리드).
export default function IngredientScreen() {
  const insets = useSafeAreaInsets(); // 기기 화면의 안전 여백(노치·홈바). 하단 버튼이 가려지지 않게 쓴다

  // state = "화면이 기억하는 값". 바뀌면 화면이 다시 그려진다.
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]); // 왼쪽에서 지금 고른 카테고리. 바뀌면 오른쪽 재료 목록이 그 카테고리로 바뀐다
  const [keyword, setKeyword] = useState(''); // 검색창에 입력한 글자. 비어있지 않으면 카테고리 대신 전체 검색 결과를 보여준다
  const [items, setItems] = useState<IngredientMaster[]>([]); // 오른쪽 그리드에 보여줄 재료 목록
  const [loading, setLoading] = useState(true); // 재료 불러오는 중인지. true면 로딩 동그라미를 보여준다
  const [error, setError] = useState<string | null>(null); // 실패 메시지. 있으면 그리드 자리에 에러 문구를 보여준다
  const [selected, setSelected] = useState<IngredientMaster | null>(null); // 선택된 재료 — 있으면 하단 고정 확정 버튼 노출
  const [rightWidth, setRightWidth] = useState(0); // 오른쪽 그리드 영역의 실제 가로 픽셀. 칸 너비를 3등분 계산할 때 쓴다

  const searching = keyword.trim().length > 0; // 지금 검색 중인지(검색어가 있으면 true)

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
        {/* 검색어가 있을 때만 오른쪽에 X(지우기) 버튼을 보여준다 */}
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
          {/* 카테고리들을 세로로 나열. 지금 고른 것(active)만 강조 (검색 중엔 아무 것도 강조 안 함) */}
          {CATEGORIES.map((cat) => {
            const active = !searching && cat === selectedCategory; // 이 카테고리가 지금 선택된 것인지
            return (
              <TouchableOpacity
                key={cat}
                // active일 때만 catItemActive(배경+왼쪽 강조선)를 덧입힌다
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
          {/* 칸 너비를 계산하려면 영역의 실제 폭이 필요해, 폭이 측정된 뒤(rightWidth>0)에만 그린다 */}
          {rightWidth > 0 && (
            // 불러오는 중 → 로딩 동그라미 / 실패 → 에러 문구 / 그 외 → 재료 그리드
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
                // 보여줄 재료가 없을 때: 검색 중이면 '검색 결과 없음', 아니면 '카테고리에 재료 없음'
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {searching
                      ? `‘${keyword.trim()}’ 검색 결과가 없어요.`
                      : '이 카테고리에 표준 재료가 없어요.'}
                  </Text>
                }
                // 재료 한 칸 그리기(원형 썸네일 + 이름). 누르면 그 재료를 선택한다.
                renderItem={({ item }) => {
                  const isSel = selected?.id === item.id; // 이 칸이 지금 선택된 재료인지
                  const uri = ingredientImageUrl(item.image_path); // 대표 이미지 URL. 없으면 null(단색 원 유지)
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
                            isSel && styles.thumbSelected, // 선택된 칸만 테두리 강조
                          ]}
                        >
                          {uri && (
                            <Image
                              source={{ uri }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          )}
                        </View>
                        {/* 선택된 칸에만 가운데 체크 아이콘을 겹쳐 보여준다 */}
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

// 아래는 각 부분의 모양·배치를 정하는 스타일 모음. 위 JSX의 style={styles.이름}과 연결된다.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, // 화면 전체를 감싸는 바깥 틀(배경색)

  header: { // 맨 위 헤더 줄 — 왼쪽 뒤로가기와 오른쪽 '직접 입력'을 양끝으로 배치
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  manualButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, // 헤더 오른쪽 '직접 입력'(+아이콘+글자) 묶음
  manualText: { ...typography.body, color: colors.primary, fontWeight: typography.heading2.fontWeight }, // '직접 입력' 글자

  searchBar: { // 검색바 한 줄(돋보기 + 입력칸 + 지우기 버튼)을 담는 둥근 회색 박스
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: 0 }, // 검색어를 입력하는 칸

  count: { // '총 N개' 안내 글자(검색바 아래)
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },

  body: { flex: 1, flexDirection: 'row' }, // 본문 2단(왼쪽 사이드바 + 오른쪽 그리드)을 가로로 나란히

  // 사이드바 — 폭은 퍼센트로 고정(ScrollView는 flex 비율이 콘텐츠 영향으로 정확히 안 잡힘).
  // 이 값만 바꾸면 좌:우 비율 조절. (예: '30%' → 3:7, '40%' → 4:6)
  sidebar: { width: '1%', backgroundColor: colors.surface }, // 왼쪽 카테고리 목록 영역(세로 스크롤)
  sidebarContent: { paddingBottom: spacing.xl }, // 사이드바 맨 아래 여백
  catItem: { // 카테고리 한 칸의 여백과 왼쪽 강조선 자리(평소엔 투명)
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  catItemActive: { backgroundColor: colors.background, borderLeftColor: colors.primary }, // 지금 고른 카테고리만 배경+왼쪽 색선으로 강조
  catText: { ...typography.caption, color: colors.textSecondary }, // 카테고리 글자(평소: 흐린 색)
  catTextActive: { color: colors.primary, fontWeight: typography.heading2.fontWeight }, // 선택된 카테고리 글자(강조 색+굵게)

  // 그리드 — 사이드바 폭을 뺀 나머지 전부.
  rightArea: { flex: 2 }, // 오른쪽 재료 그리드 영역(남은 폭 전부 차지)
  loading: { marginTop: spacing.xl }, // 그리드 자리 로딩 동그라미 위 여백
  error: { ...typography.body, color: colors.danger, padding: spacing.lg }, // 그리드 자리 에러 문구(빨간색)
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.xl }, // 보여줄 재료가 없을 때 안내 문구
  gridContent: { padding: GRID_PAD }, // 그리드 전체 안쪽 여백
  gridRow: { gap: GAP, marginBottom: GAP }, // 그리드 한 줄(3칸) 사이 간격·줄 간격
  cell: { alignItems: 'center', gap: spacing.xs }, // 재료 한 칸(썸네일 + 이름)을 세로로 가운데 정렬
  thumbWrap: { alignItems: 'center', justifyContent: 'center' }, // 썸네일과 체크 아이콘을 겹쳐 놓기 위한 칸
  thumb: { backgroundColor: colors.thumbnail, overflow: 'hidden' }, // 재료 원형 썸네일(이미지 없으면 단색, 있으면 이미지가 덮음). 크기는 코드에서 계산
  thumbSelected: { borderWidth: 2, borderColor: colors.primary }, // 선택된 재료 썸네일에 두른 강조 테두리
  checkOverlay: { // 선택 표시 체크 아이콘을 썸네일 정중앙에 겹치는 자리
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellName: { ...typography.caption, color: colors.textPrimary, textAlign: 'center' }, // 썸네일 아래 재료 이름 글자
  cellNameSelected: { color: colors.primary, fontWeight: typography.heading2.fontWeight }, // 선택된 재료 이름(강조 색+굵게)

  // 하단 고정 버튼
  bottomBar: { // 재료를 골랐을 때만 화면 맨 아래에 붙는 확정 버튼 영역(위쪽 구분선 포함)
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
  selectButton: { // 하단 확정 버튼 모양(파란 박스)
    height: button.height,
    borderRadius: button.radius,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: { ...typography.body, color: colors.background, fontWeight: typography.heading1.fontWeight }, // 확정 버튼 안 글자(흰색·굵게)
});
