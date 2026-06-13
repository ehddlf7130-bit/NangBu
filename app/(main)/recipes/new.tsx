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
      await createRecipe(user.id, { title: result.title, body: result.body }, 'ai');
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
    return (
      <View style={styles.previewWrap}>
        <View style={styles.previewCard}>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI 추천</Text>
          </View>
          <Text style={styles.previewTitle}>{result.title}</Text>
          <Text style={styles.previewBody}>{result.body}</Text>

          {result.used_ingredients.length > 0 && (
            <View style={styles.usedWrap}>
              <Text style={styles.usedLabel}>사용한 재료</Text>
              <View style={styles.chipRow}>
                {result.used_ingredients.map((name, i) => (
                  <View key={`${name}-${i}`} style={styles.usedChip}>
                    <Text style={styles.usedChipText}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>저장</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, saving && styles.buttonDisabled]}
          onPress={() => setResult(null)}
          disabled={saving}
        >
          <Text style={styles.secondaryButtonText}>다시 추천</Text>
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

  // ── 아래는 AI 추천 모드 전용 (이번 디자인 교체 범위 밖, 그대로 유지) ──
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: colors.primaryTint,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  secondaryButtonText: { color: colors.primary, fontSize: 16, fontWeight: '700' },

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

  // 결과 미리보기
  previewWrap: { gap: 12 },
  previewCard: {
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  aiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryTintBorder,
  },
  aiBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  previewTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  previewBody: { fontSize: 15, lineHeight: 23, color: colors.textPrimary },
  usedWrap: { gap: 8 },
  usedLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  usedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  usedChipText: { fontSize: 13, color: colors.textSecondary },
});
