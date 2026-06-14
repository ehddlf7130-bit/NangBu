import { button, colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { extractErrorMessage, fetchMyItems } from '@/lib/items';
import { createRecipe, requestAiRecipe } from '@/lib/recipes';
import type { Item } from '@/types/item';
import type { AiRecipeResult } from '@/types/recipe';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// 시안 고정 치수(테마 토큰이 아닌 레이아웃 스펙).
const INPUT_HEIGHT = 48;     // 한 줄 입력 높이
const TEXTAREA_HEIGHT = 150; // 조리법 멀티라인 높이

type Mode = 'choose' | 'manual' | 'ai';

export default function RecipeNewScreen() {
  const [mode, setMode] = useState<Mode>('choose');

  // 직접 작성은 고정 헤더 + 스크롤 입력 + 고정 CTA 레이아웃을 자체 관리한다.
  if (mode === 'manual') {
    return <ManualForm onBack={() => setMode('choose')} />;
  }

  return (
    <View style={styles.container}>
      <Header
        title={mode === 'ai' ? 'AI 추천' : '레시피를 추가해보세요'}
        onBack={() => (mode === 'choose' ? router.back() : setMode('choose'))}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {mode === 'choose' && <ModeChooser onSelect={setMode} />}
        {mode === 'ai' && <AiRecommend />}
      </ScrollView>
    </View>
  );
}

/* ── 공통 헤더 (뒤로가기 + 가운데 제목) ───────────────────── */
function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="뒤로"
      >
        <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

/* ── 모드 선택 ──────────────────────────────────────────── */
function ModeChooser({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <View style={styles.chooser}>
      <TouchableOpacity style={styles.choiceCard} onPress={() => onSelect('manual')}>
        <View style={styles.choiceHeader}>
          <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
          <Text style={styles.choiceTitle}>직접 작성</Text>
        </View>
        <Text style={styles.choiceDesc}>제목과 내용을 직접 입력하세요.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.choiceCard} onPress={() => onSelect('ai')}>
        <View style={styles.choiceHeader}>
          <MaterialCommunityIcons name="robot-outline" size={22} color={colors.textPrimary} />
          <Text style={styles.choiceTitle}>AI 추천</Text>
        </View>
        <Text style={styles.choiceDesc}>냉장고 재료로 레시피를 추천해줘요.</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ── 직접 작성 (기존 수동 흐름) ──────────────────────────── */
function ManualForm({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!user) return;
    const t = title.trim();
    if (!t) {
      Alert.alert('알림', '레시피 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await createRecipe(user.id, { title: t, body: body.trim() });
      router.replace('/(main)/recipes' as never);
    } catch (e: unknown) {
      Alert.alert('저장 실패', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Header title="직접 추가" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>레시피 이름</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="레시피를 입력하세요."
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>조리법</Text>
          <TextInput
            style={styles.textarea}
            value={body}
            onChangeText={setBody}
            placeholder="재료, 조리 순서 등을 자유롭게 적어보세요."
            placeholderTextColor={colors.textTertiary}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* 고정 CTA */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={[styles.cta, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.ctaText}>추가하기</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── AI 추천 ────────────────────────────────────────────── */

// expire_date 임박 순 정렬 (null은 맨 뒤로)
function sortByExpiry(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    if (a.expire_date === b.expire_date) return 0;
    if (!a.expire_date) return 1;
    if (!b.expire_date) return -1;
    return a.expire_date < b.expire_date ? -1 : 1;
  });
}

function AiRecommend() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recommending, setRecommending] = useState(false);
  const [result, setResult] = useState<AiRecipeResult | null>(null);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(() => {
    if (!user) return;
    let active = true;
    setLoadingItems(true);
    setLoadError(null);
    fetchMyItems(user.id)
      .then((data) => {
        if (!active) return;
        const sorted = sortByExpiry(data);
        setItems(sorted);
        setSelectedIds(new Set(sorted.map((it) => it.id))); // 전체 기본 선택
      })
      .catch((e: unknown) => {
        if (active) setLoadError(extractErrorMessage(e));
      })
      .finally(() => {
        if (active) setLoadingItems(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const cleanup = loadItems();
    return cleanup;
  }, [loadItems]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleRecommend() {
    const selected = items.filter((it) => selectedIds.has(it.id));
    if (selected.length === 0) {
      Alert.alert('알림', '재료를 한 개 이상 선택해주세요.');
      return;
    }
    setRecommending(true);
    try {
      const recipe = await requestAiRecipe(selected);
      setResult(recipe);
    } catch (e: unknown) {
      Alert.alert('추천 실패', extractErrorMessage(e));
    } finally {
      setRecommending(false);
    }
  }

  async function handleSave() {
    if (!user || !result) return;
    setSaving(true);
    try {
      await createRecipe(
        user.id,
        { title: result.title, body: result.body },
        'ai',
        {
          cook_time_minutes: result.cook_time_minutes,
          difficulty: result.difficulty,
          needed_ingredients: result.needed_ingredients ?? [],
        },
      );
      router.replace('/(main)/recipes' as never);
    } catch (e: unknown) {
      Alert.alert('저장 실패', extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (loadingItems) {
    return (
      <View style={styles.centerBlock}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centerBlock}>
        <Text style={styles.errorText}>{loadError}</Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centerBlock}>
        <Text style={styles.emptyIcon}>🧊</Text>
        <Text style={styles.emptyTitle}>냉장고에 재료가 없어요</Text>
        <Text style={styles.emptyDesc}>재료를 먼저 등록한 뒤 추천을 받아보세요.</Text>
      </View>
    );
  }

  // 결과 미리보기
  if (result) {
    // 서버 응답 필드 누락 방어 (디자인/동작은 그대로)
    // difficulty: 숫자가 아니면 3으로 폴백 후 1~5 클램프 → 점 5개 중 채움으로 표현
    const safeDifficulty =
      typeof result.difficulty === 'number' && Number.isFinite(result.difficulty)
        ? result.difficulty
        : 3;
    const filledDots = Math.min(Math.max(Math.round(safeDifficulty), 1), 5);
    // cook_time_minutes: 숫자가 아니면 "-"로 표시
    const cookTimeLabel =
      typeof result.cook_time_minutes === 'number' && Number.isFinite(result.cook_time_minutes)
        ? `${result.cook_time_minutes}분`
        : '-';
    const neededIngredients = result.needed_ingredients ?? [];
    return (
      <View style={styles.preview}>
        <Text style={styles.recipeTitle}>{result.title}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.metaTime}>{cookTimeLabel}</Text>
          <Text style={styles.metaSep}>l</Text>
          <Text style={styles.metaLabel}>난이도</Text>
          <View style={styles.dots}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < filledDots ? styles.dotFilled : styles.dotEmpty]}
              />
            ))}
          </View>
        </View>

        {!!result.body && <Text style={styles.recipeBody}>{result.body}</Text>}

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>부족한 재료</Text>
        <View style={styles.chipWrap}>
          {neededIngredients.map((ing, i) => (
            <View key={`${ing.name}-${i}`} style={styles.chip}>
              <Ionicons name="checkmark" size={12} color={colors.thumbnail} />
              <Text style={styles.chipText}>
                {ing.amount ? `${ing.name} ${ing.amount}` : ing.name}
              </Text>
            </View>
          ))}
        </View>

        {/* 시안 단일 CTA는 '추가하기'. '다시 추천'은 보조 버튼으로 유지 */}
        <TouchableOpacity
          style={[styles.secondaryCta, saving && styles.buttonDisabled]}
          onPress={() => setResult(null)}
          disabled={saving}
        >
          <Text style={styles.secondaryCtaText}>다시 추천</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cta, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.ctaText}>추가하기</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  // 재료 선택
  return (
    <>
      <Text style={styles.hint}>추천에 사용할 재료를 선택하세요. (임박 순)</Text>

      <View style={styles.itemList}>
        {items.map((item) => {
          const checked = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemRow, checked && styles.itemRowChecked]}
              onPress={() => toggle(item.id)}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.category}
                  {item.expire_date ? ` · ~${item.expire_date}` : ' · 기한 없음'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.button, recommending && styles.buttonDisabled]}
        onPress={handleRecommend}
        disabled={recommending}
      >
        {recommending ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.buttonText}>추천받기</Text>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { padding: spacing.lg, gap: spacing.lg },

  // 헤더(뒤로 + 가운데 제목)
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    justifyContent: 'center',
  },
  backBtn: { position: 'absolute', left: spacing.sm, top: spacing.xl },
  headerTitle: { ...typography.heading2, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },

  // 모드 선택 카드
  chooser: { gap: spacing.md },
  choiceCard: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
    shadowColor: colors.thumbnail, // 시안 그림자색 rgba(33,58,36,…) = thumbnail(#213A24)
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  choiceHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  choiceTitle: { ...typography.heading2, color: colors.textPrimary },
  choiceDesc: { ...typography.caption, color: colors.textTertiary },

  // 직접 작성 폼
  field: { gap: spacing.md },
  label: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  input: {
    height: INPUT_HEIGHT,
    borderWidth: 2,
    borderColor: colors.primary, // 시안: 초록 2px 테두리
    borderRadius: radius.card, // 시안 12 — 토큰 없어 최근접 card(16) 사용
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  textarea: {
    minHeight: TEXTAREA_HEIGHT,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.card,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    textAlignVertical: 'top',
  },

  // 고정 CTA (직접 작성)
  ctaBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  cta: {
    height: button.height,
    borderRadius: button.radius, // 시안 rounded-100 = pill
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { ...typography.heading2, color: colors.background, fontWeight: '700' },

  // ── AI 추천 모드: 재료 선택 버튼 ──
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },

  // 안내/로딩
  centerBlock: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  errorText: { color: colors.danger, fontSize: 15 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  hint: { fontSize: 14, color: colors.textSecondary },

  // 재료 선택 목록
  itemList: { gap: 10 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemRowChecked: { backgroundColor: colors.primaryTint, borderColor: colors.primaryTintBorder },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.background, fontSize: 14, fontWeight: '700' },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  itemMeta: { fontSize: 13, color: colors.textSecondary },

  // ── 결과 미리보기 (Figma node 1-469) ──
  preview: { gap: spacing.md },
  // 제목: Figma 24px Bold #1a1c1a≈textPrimary (heading1 토큰은 22px라 미일치 → 리터럴, 리콘사일 후보)
  recipeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  // 메타: 시계 + "60분 l 난이도" + 점, Figma var(grays/gray) = textSecondary
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaTime: { fontSize: 16, color: colors.textSecondary, letterSpacing: -0.4 },
  metaSep: { fontSize: 20, fontWeight: '300', color: colors.textSecondary, marginHorizontal: 2 },
  metaLabel: { fontSize: 16, color: colors.textSecondary, letterSpacing: -0.4 },
  // 난이도 점 5개 (시안에 값 표현이 없어 신규 정의 — 채움=primary / 빈=borderStrong)
  dots: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: spacing.xs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotFilled: { backgroundColor: colors.primary },
  dotEmpty: { backgroundColor: colors.borderStrong },
  // 본문(조리 과정): 시안 위치/스타일(14px, grays/gray=textSecondary) 따름, 전체 표시
  recipeBody: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, letterSpacing: -0.4 },
  // 구분선: Figma 1px var(grays/gray-4) = borderStrong
  divider: { height: 1, backgroundColor: colors.borderStrong },
  // 섹션 라벨 "부족한 재료": Figma 12px grays/gray = textSecondary
  sectionLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: -spacing.sm },
  // 칩: bg var(grays/gray-6)=surface, 알약형, 체크 + "이름 수량"(thumbnail #213A24)
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.thumbnail, letterSpacing: 0.35 },
  // CTA '추가하기'는 기존 cta/ctaText(알약형 primary) 재사용 / '다시 추천'은 보조(외곽선) 버튼
  secondaryCta: {
    height: button.height,
    borderRadius: button.radius,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: { ...typography.heading2, color: colors.primary, fontWeight: '700' },
});
